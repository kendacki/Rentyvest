package canton

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type activeContractsRequest struct {
	Filter         activeContractsFilter `json:"filter"`
	Verbose        bool                  `json:"verbose"`
	ActiveAtOffset string                `json:"activeAtOffset"`
}

type activeContractsFilter struct {
	FiltersByParty map[string]partyFilter `json:"filtersByParty"`
}

type partyFilter struct {
	Cumulative []cumulativeFilter `json:"cumulative"`
}

type cumulativeFilter struct {
	TemplateFilters []templateFilter `json:"templateFilters"`
}

type templateFilter struct {
	TemplateID               string `json:"templateId"`
	IncludeCreatedEventBlob  bool   `json:"includeCreatedEventBlob"`
}

func (c *Client) resolveUSDCIssuerContractID(ctx context.Context, preferred string) (string, error) {
	if id := strings.TrimSpace(preferred); id != "" {
		return id, nil
	}
	return c.refreshUSDCIssuerFromLedger(ctx)
}

func (c *Client) refreshUSDCIssuerFromLedger(ctx context.Context) (string, error) {
	party := strings.TrimSpace(c.adminParty)
	if party == "" {
		party = strings.TrimSpace(c.actAsParty)
	}
	if party == "" {
		return "", fmt.Errorf("canton admin party is not configured")
	}

	offset, err := c.ledgerEndOffset(ctx)
	if err != nil {
		return "", err
	}

	body := activeContractsRequest{
		Filter: activeContractsFilter{
			FiltersByParty: map[string]partyFilter{
				party: {Cumulative: []cumulativeFilter{{TemplateFilters: []templateFilter{}}}},
			},
		},
		Verbose:        true,
		ActiveAtOffset: offset,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal active contracts request: %w", err)
	}

	token, err := c.resolveToken(ctx)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/v2/state/active-contracts",
		bytes.NewReader(payload),
	)
	if err != nil {
		return "", fmt.Errorf("build active contracts request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("query active contracts: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", fmt.Errorf("read active contracts response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", NewSubmitError(resp.StatusCode, string(responseBody))
	}

	issuerCID, err := pickUSDCIssuerContractID(responseBody, c.templateUSDCIssuerID)
	if err != nil {
		return "", err
	}

	c.usdcIssuerContractID = issuerCID
	return issuerCID, nil
}

func (c *Client) ledgerEndOffset(ctx context.Context) (string, error) {
	token, err := c.resolveToken(ctx)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v2/state/ledger-end", nil)
	if err != nil {
		return "", fmt.Errorf("build ledger-end request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch ledger end: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("read ledger-end response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", NewSubmitError(resp.StatusCode, string(responseBody))
	}

	offset, ok := extractStringField(responseBody, "offset")
	if !ok || offset == "" {
		return "", fmt.Errorf("ledger-end response missing offset")
	}

	return offset, nil
}

func pickUSDCIssuerContractID(body []byte, qualifiedTemplateID string) (string, error) {
	packagePrefix := ""
	if parts := strings.SplitN(qualifiedTemplateID, ":", 2); len(parts) == 2 {
		packagePrefix = parts[0] + ":"
	}

	var decoded interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return "", fmt.Errorf("decode active contracts response: %w", err)
	}

	bestCID := ""
	bestSupply := -1.0
	collectUSDCIssuers(decoded, packagePrefix, &bestCID, &bestSupply)

	if bestCID == "" {
		return "", fmt.Errorf("no active USDCIssuer contract found on ledger")
	}

	return bestCID, nil
}

func collectUSDCIssuers(node interface{}, packagePrefix string, bestCID *string, bestSupply *float64) {
	switch value := node.(type) {
	case map[string]interface{}:
		if contractID, templateID, supply, ok := issuerContractFromCreatedEvent(value); ok {
			if packagePrefix == "" || strings.HasPrefix(templateID, packagePrefix) {
				if supply >= *bestSupply {
					*bestCID = contractID
					*bestSupply = supply
				}
			}
		}
		for _, child := range value {
			collectUSDCIssuers(child, packagePrefix, bestCID, bestSupply)
		}
	case []interface{}:
		for _, child := range value {
			collectUSDCIssuers(child, packagePrefix, bestCID, bestSupply)
		}
	}
}

func issuerContractFromCreatedEvent(value map[string]interface{}) (contractID string, templateID string, supply float64, ok bool) {
	contractID, _ = value["contractId"].(string)
	if contractID == "" {
		return "", "", 0, false
	}

	switch template := value["templateId"].(type) {
	case string:
		templateID = template
	default:
		return "", "", 0, false
	}

	if !strings.Contains(templateID, "RentyVest.TestUSDC:USDCIssuer") {
		return "", "", 0, false
	}

	if args, argsOK := value["createArgument"].(map[string]interface{}); argsOK {
		supply = parseDecimalField(args, "totalSupply")
	}

	return contractID, templateID, supply, true
}

func parseDecimalField(args map[string]interface{}, field string) float64 {
	value, ok := args[field].(string)
	if !ok {
		return 0
	}
	var parsed float64
	_, _ = fmt.Sscanf(value, "%f", &parsed)
	return parsed
}
