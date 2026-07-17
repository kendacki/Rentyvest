package canton

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

// Canton JSON API v2 ACS filter uses identifierFilter.TemplateFilter (not legacy templateFilters).
// A wrong filter falls back to WildcardFilter and can exceed the 200-node response limit.

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
	IdentifierFilter identifierFilter `json:"identifierFilter"`
}

type identifierFilter struct {
	TemplateFilter *templateFilterWrapper `json:"TemplateFilter,omitempty"`
}

type templateFilterWrapper struct {
	Value templateFilterValue `json:"value"`
}

type templateFilterValue struct {
	TemplateID              string `json:"templateId"`
	IncludeCreatedEventBlob bool   `json:"includeCreatedEventBlob"`
}

func (c *Client) resolveUSDCIssuerContractID(ctx context.Context, preferred string) (string, error) {
	if id := strings.TrimSpace(preferred); id != "" {
		return id, nil
	}
	if id := strings.TrimSpace(c.usdcIssuerContractID); id != "" {
		return id, nil
	}
	return c.refreshUSDCIssuerFromLedger(ctx)
}

func (c *Client) refreshUSDCIssuerFromLedger(ctx context.Context) (string, error) {
	return c.refreshUSDCIssuerFromLedgerOnce(ctx, true)
}

func (c *Client) refreshUSDCIssuerFromLedgerOnce(ctx context.Context, allowAuthRetry bool) (string, error) {
	party := strings.TrimSpace(c.adminParty)
	if party == "" {
		party = strings.TrimSpace(c.actAsParty)
	}
	if party == "" {
		return "", fmt.Errorf("canton admin party is not configured")
	}

	templateID := QualifyTemplateIDForFilter(c.templateUSDCIssuerID)
	if templateID == "" {
		return "", fmt.Errorf("USDC issuer template id is not configured")
	}

	offset, err := c.ledgerEndOffset(ctx)
	if err != nil {
		return "", err
	}

	body := activeContractsRequest{
		Filter: activeContractsFilter{
			FiltersByParty: map[string]partyFilter{
				party: {
					Cumulative: []cumulativeFilter{{
						IdentifierFilter: identifierFilter{
							TemplateFilter: &templateFilterWrapper{
								Value: templateFilterValue{
									TemplateID:              templateID,
									IncludeCreatedEventBlob: false,
								},
							},
						},
					}},
				},
			},
		},
		Verbose:        false,
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
		submitErr := NewSubmitError(resp.StatusCode, string(responseBody))
		if allowAuthRetry && IsAuthSubmitError(submitErr) {
			log.Printf("[canton] auth error on active-contracts; forcing m2m token refresh: %v", submitErr)
			if refreshErr := c.refreshAuthToken(ctx); refreshErr == nil {
				return c.refreshUSDCIssuerFromLedgerOnce(ctx, false)
			}
		}
		return "", submitErr
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

	offset, err := parseLedgerOffset(responseBody)
	if err != nil {
		return "", err
	}

	return offset, nil
}

func parseLedgerOffset(body []byte) (string, error) {
	var decoded map[string]interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return "", fmt.Errorf("decode ledger-end response: %w", err)
	}

	switch value := decoded["offset"].(type) {
	case string:
		if value != "" {
			return value, nil
		}
	case float64:
		return fmt.Sprintf("%.0f", value), nil
	case json.Number:
		return value.String(), nil
	}

	return "", fmt.Errorf("ledger-end response missing offset")
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

	templateID = templateIDString(value["templateId"])
	if templateID == "" || !strings.Contains(templateID, "RentyVest.TestUSDC:USDCIssuer") {
		return "", "", 0, false
	}

	if args, argsOK := value["createArgument"].(map[string]interface{}); argsOK {
		supply = parseDecimalField(args, "totalSupply")
	}

	return contractID, templateID, supply, true
}

func templateIDString(raw interface{}) string {
	switch template := raw.(type) {
	case string:
		return template
	case map[string]interface{}:
		packageID, _ := template["packageId"].(string)
		moduleName, _ := template["moduleName"].(string)
		entityName, _ := template["entityName"].(string)
		if packageID != "" && moduleName != "" && entityName != "" {
			return packageID + ":" + moduleName + ":" + entityName
		}
	}
	return ""
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
