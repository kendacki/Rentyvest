package canton

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
)

// ResolveBackendExecuteToken prefers M2M_TOKEN for sandbox co-signing, then OAuth M2M.
func ResolveBackendExecuteToken(ctx context.Context, client *Client) (string, error) {
	if token := strings.TrimSpace(os.Getenv("M2M_TOKEN")); token != "" {
		return token, nil
	}
	if client == nil {
		return "", fmt.Errorf("canton client is not configured")
	}
	return client.resolveToken(ctx)
}

// SubmitPledgeBackendExecute submits PropertyPool.Pledge with actAs [platform_admin, buyer]
// using the backend M2M token (sandbox co-sign). Uses JSON Ledger API v2 submit-and-wait.
func (c *Client) SubmitPledgeBackendExecute(ctx context.Context, cmd PledgeCommand) (*PledgeResult, error) {
	if strings.TrimSpace(cmd.PoolContractID) == "" {
		return nil, fmt.Errorf("canton pool contract id is required")
	}
	if strings.TrimSpace(cmd.BuyerPartyID) == "" {
		return nil, fmt.Errorf("buyer party id is required")
	}
	if cmd.SlotCount <= 0 {
		return nil, fmt.Errorf("slot count must be positive")
	}
	if strings.TrimSpace(cmd.MetaURI) == "" {
		return nil, fmt.Errorf("meta uri is required")
	}
	if strings.TrimSpace(cmd.PaymentAssetContractID) == "" {
		return nil, fmt.Errorf("payment asset contract id is required")
	}

	commandID := cmd.CommandID
	if commandID == "" {
		commandID = fmt.Sprintf("pledge-backend-%s", uuid.NewString())
	}

	body := submitRequest{
		ActAs:     []string{c.adminParty, cmd.BuyerPartyID},
		ReadAs:    c.ledgerReadAs(cmd.BuyerPartyID),
		UserID:    c.userID,
		CommandID: commandID,
		Commands: []interface{}{
			exerciseCommand{
				ExerciseCommand: exercisePayload{
					TemplateID: c.templatePoolID,
					ContractID: cmd.PoolContractID,
					Choice:     "Pledge",
					ChoiceArgument: map[string]interface{}{
						"buyer":           cmd.BuyerPartyID,
						"slot_count":      cmd.SlotCount,
						"meta_uri":        cmd.MetaURI,
						"paymentAssetCid": cmd.PaymentAssetContractID,
					},
				},
			},
		},
	}

	ledgerLog("backend_execute", "pledge_submit", fmt.Sprintf(
		"actAs=[%s,%s] pool=%s slots=%d payment=%s commandId=%s",
		truncateForLog(c.adminParty, 20),
		truncateForLog(cmd.BuyerPartyID, 20),
		truncateForLog(cmd.PoolContractID, 20),
		cmd.SlotCount,
		truncateForLog(cmd.PaymentAssetContractID, 20),
		truncateForLog(commandID, 32),
	))

	token, err := ResolveBackendExecuteToken(ctx, c)
	if err != nil {
		logBackendExecutePledgeFailure(cmd, body, nil, err)
		return nil, err
	}

	// submit-and-wait-for-transaction: the plain submit-and-wait response has
	// no events, so the new pool / NFT / change contract ids would be empty.
	responseBody, err := c.submitAndWaitForTransactionWithToken(ctx, body, token)
	if err != nil {
		logBackendExecutePledgeFailure(cmd, body, err, nil)
		return nil, err
	}

	result := &PledgeResult{
		CommandID:       commandID,
		PoolContractID:  extractCreatedContractID(responseBody, ":PropertyPool"),
		PaymentAssetCID: extractCreatedContractID(responseBody, ":Asset"),
	}
	if updateID, ok := extractStringField(responseBody, "updateId"); ok {
		result.UpdateID = updateID
	}
	result.NFTContractIDs = extractCreatedContractIDs(responseBody, ":PropertyNFT")
	result.BuyerChangeAssets = extractCreatedAssetsByOwner(responseBody, cmd.BuyerPartyID)

	ledgerLog("backend_execute", "pledge_success", fmt.Sprintf(
		"commandId=%s updateId=%s nfts=%d",
		truncateForLog(result.CommandID, 32),
		truncateForLog(result.UpdateID, 32),
		len(result.NFTContractIDs),
	))

	return result, nil
}

func (c *Client) submitAndWaitForTransactionWithToken(ctx context.Context, body submitRequest, token string) ([]byte, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmt.Errorf("canton ledger token is not configured")
	}

	payload, err := json.Marshal(submitForTransactionRequest{Commands: body})
	if err != nil {
		return nil, fmt.Errorf("marshal canton submit-for-transaction request: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+submitForTransactionPath,
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, fmt.Errorf("build canton submit request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("submit canton command: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, fmt.Errorf("read canton submit response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, NewSubmitError(resp.StatusCode, string(responseBody))
	}

	return responseBody, nil
}

func logBackendExecutePledgeFailure(cmd PledgeCommand, body submitRequest, submitErr error, resolveErr error) {
	if resolveErr != nil {
		ledgerLogErr("backend_execute", "pledge_token", fmt.Sprintf(
			"buyer=%s pool=%s",
			truncateForLog(cmd.BuyerPartyID, 24),
			truncateForLog(cmd.PoolContractID, 24),
		), resolveErr)
		return
	}

	var cantonErr *SubmitError
	if errors.As(submitErr, &cantonErr) {
		cause := cantonCause(cantonErr.Body)
		code := extractCantonErrorCode(cantonErr.Body)
		ledgerLogErr("backend_execute", "pledge_rejected", fmt.Sprintf(
			"http_status=%d canton_code=%q canton_cause=%q actAs=%v buyer=%s pool=%s slots=%d payment=%s body=%s",
			cantonErr.StatusCode,
			code,
			cause,
			body.ActAs,
			truncateForLog(cmd.BuyerPartyID, 24),
			truncateForLog(cmd.PoolContractID, 24),
			cmd.SlotCount,
			truncateForLog(cmd.PaymentAssetContractID, 24),
			truncateForLog(cantonErr.Body, 800),
		), submitErr)
		return
	}

	ledgerLogErr("backend_execute", "pledge_failed", fmt.Sprintf(
		"buyer=%s pool=%s slots=%d",
		truncateForLog(cmd.BuyerPartyID, 24),
		truncateForLog(cmd.PoolContractID, 24),
		cmd.SlotCount,
	), submitErr)
}

func extractCantonErrorCode(body string) string {
	body = strings.TrimSpace(body)
	if body == "" {
		return ""
	}

	var parsed struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal([]byte(body), &parsed); err == nil && parsed.Code != "" {
		return parsed.Code
	}
	return ""
}
