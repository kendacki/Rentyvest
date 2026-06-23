package canton

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
)

const defaultSubmitPath = "/v2/commands/submit-and-wait"

type Client struct {
	baseURL        string
	adminParty     string
	adminToken     string
	readAsParty    string
	userID         string
	templatePoolID string
	httpClient     *http.Client
}

type Config struct {
	BaseURL        string
	AdminParty     string
	AdminToken     string
	ReadAsParty    string
	UserID         string
	TemplatePoolID string
}

type ExpireBidCommand struct {
	PoolContractID  string
	BidReference    string
	RefundReference string
	CommandID       string
}

type ExpirePoolCommand struct {
	PoolContractID string
	Reason         string
	CommandID      string
}

type submitRequest struct {
	ActAs     []string      `json:"actAs"`
	ReadAs    []string      `json:"readAs,omitempty"`
	UserID    string        `json:"userId"`
	CommandID string        `json:"commandId"`
	Commands  []interface{} `json:"commands"`
}

type exerciseCommand struct {
	ExerciseCommand exercisePayload `json:"ExerciseCommand"`
}

type exercisePayload struct {
	TemplateID     string                 `json:"templateId"`
	ContractID     string                 `json:"contractId"`
	Choice         string                 `json:"choice"`
	ChoiceArgument map[string]interface{} `json:"choiceArgument"`
}

func NewClient(cfg Config) (*Client, error) {
	baseURL := strings.TrimRight(cfg.BaseURL, "/")
	if baseURL == "" {
		baseURL = strings.TrimRight(os.Getenv("CANTON_JSON_API_URL"), "/")
	}
	if baseURL == "" {
		return nil, fmt.Errorf("CANTON_JSON_API_URL is required")
	}

	adminParty := strings.TrimSpace(cfg.AdminParty)
	if adminParty == "" {
		adminParty = strings.TrimSpace(os.Getenv("CANTON_ADMIN_PARTY_ID"))
	}
	if adminParty == "" {
		adminParty = strings.TrimSpace(os.Getenv("CANTON_ACT_AS_PARTY"))
	}
	if adminParty == "" {
		return nil, fmt.Errorf("CANTON_ADMIN_PARTY_ID or CANTON_ACT_AS_PARTY is required")
	}

	adminToken := strings.TrimSpace(cfg.AdminToken)
	if adminToken == "" {
		adminToken = strings.TrimSpace(os.Getenv("CANTON_ADMIN_TOKEN"))
	}
	if adminToken == "" {
		adminToken = strings.TrimSpace(os.Getenv("CANTON_JWT"))
	}

	readAs := strings.TrimSpace(cfg.ReadAsParty)
	if readAs == "" {
		readAs = strings.TrimSpace(os.Getenv("CANTON_READ_AS_PARTY"))
	}
	if readAs == "" {
		readAs = adminParty
	}

	userID := strings.TrimSpace(cfg.UserID)
	if userID == "" {
		userID = strings.TrimSpace(os.Getenv("CANTON_LEDGER_USER_ID"))
	}
	if userID == "" {
		userID = "rentyvest-expiry-cron"
	}

	templatePoolID := strings.TrimSpace(cfg.TemplatePoolID)
	if templatePoolID == "" {
		templatePoolID = strings.TrimSpace(os.Getenv("CANTON_TEMPLATE_PROPERTY_POOL"))
	}
	if templatePoolID == "" {
		templatePoolID = "RentyVest.PropertyPool:PropertyPool"
	}

	return &Client{
		baseURL:        baseURL,
		adminParty:     adminParty,
		adminToken:     adminToken,
		readAsParty:    readAs,
		userID:         userID,
		templatePoolID: templatePoolID,
		httpClient: &http.Client{
			Timeout: 90 * time.Second,
		},
	}, nil
}

func (c *Client) SubmitExpireBid(ctx context.Context, cmd ExpireBidCommand) (string, error) {
	if strings.TrimSpace(cmd.PoolContractID) == "" {
		return "", fmt.Errorf("pool contract id is required")
	}
	if strings.TrimSpace(cmd.BidReference) == "" {
		return "", fmt.Errorf("bid reference is required")
	}
	if strings.TrimSpace(cmd.RefundReference) == "" {
		return "", fmt.Errorf("refund reference is required")
	}

	commandID := cmd.CommandID
	if commandID == "" {
		commandID = fmt.Sprintf("expire-bid-%s", uuid.NewString())
	}

	body := submitRequest{
		ActAs:     []string{c.adminParty},
		ReadAs:    []string{c.readAsParty},
		UserID:    c.userID,
		CommandID: commandID,
		Commands: []interface{}{
			exerciseCommand{
				ExerciseCommand: exercisePayload{
					TemplateID: c.templatePoolID,
					ContractID: cmd.PoolContractID,
					Choice:     "ExpireBid",
					ChoiceArgument: map[string]interface{}{
						"bid_reference":    cmd.BidReference,
						"refund_reference": cmd.RefundReference,
					},
				},
			},
		},
	}

	responseBody, err := c.submitAndWait(ctx, body)
	if err != nil {
		return "", err
	}

	poolCID := extractCreatedContractID(responseBody, ":PropertyPool")
	if poolCID == "" {
		return cmd.PoolContractID, nil
	}

	return poolCID, nil
}

func (c *Client) SubmitExpirePool(ctx context.Context, cmd ExpirePoolCommand) (string, error) {
	if strings.TrimSpace(cmd.PoolContractID) == "" {
		return "", fmt.Errorf("pool contract id is required")
	}
	if strings.TrimSpace(cmd.Reason) == "" {
		return "", fmt.Errorf("expiry reason is required")
	}

	commandID := cmd.CommandID
	if commandID == "" {
		commandID = fmt.Sprintf("expire-pool-%s", uuid.NewString())
	}

	body := submitRequest{
		ActAs:     []string{c.adminParty},
		ReadAs:    []string{c.readAsParty},
		UserID:    c.userID,
		CommandID: commandID,
		Commands: []interface{}{
			exerciseCommand{
				ExerciseCommand: exercisePayload{
					TemplateID: c.templatePoolID,
					ContractID: cmd.PoolContractID,
					Choice:     "ExpirePool",
					ChoiceArgument: map[string]interface{}{
						"reason": cmd.Reason,
					},
				},
			},
		},
	}

	responseBody, err := c.submitAndWait(ctx, body)
	if err != nil {
		return "", err
	}

	poolCID := extractCreatedContractID(responseBody, ":PropertyPool")
	if poolCID == "" {
		return cmd.PoolContractID, nil
	}

	return poolCID, nil
}

func (c *Client) submitAndWait(ctx context.Context, body submitRequest) ([]byte, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal canton submit request: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+defaultSubmitPath,
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, fmt.Errorf("build canton submit request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(c.adminToken) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(c.adminToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("submit canton command: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read canton submit response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("canton submit failed with status %d: %s", resp.StatusCode, string(responseBody))
	}

	return responseBody, nil
}

func extractCreatedContractID(body []byte, templateSuffix string) string {
	var decoded interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return ""
	}
	return findCreatedContractID(decoded, templateSuffix)
}

func findCreatedContractID(node interface{}, templateSuffix string) string {
	switch value := node.(type) {
	case map[string]interface{}:
		if contractID, ok := value["contractId"].(string); ok && contractID != "" {
			if templateMatches(value, templateSuffix) {
				return contractID
			}
		}
		for _, child := range value {
			if found := findCreatedContractID(child, templateSuffix); found != "" {
				return found
			}
		}
	case []interface{}:
		for _, child := range value {
			if found := findCreatedContractID(child, templateSuffix); found != "" {
				return found
			}
		}
	}

	return ""
}

func templateMatches(value map[string]interface{}, templateSuffix string) bool {
	if templateID, ok := value["templateId"].(string); ok && strings.HasSuffix(templateID, templateSuffix) {
		return true
	}
	if templateID, ok := value["templateId"].(map[string]interface{}); ok {
		if moduleName, _ := templateID["moduleName"].(string); moduleName != "" {
			if entityName, _ := templateID["entityName"].(string); entityName != "" {
				combined := moduleName + ":" + entityName
				return strings.HasSuffix(combined, templateSuffix) || strings.HasSuffix(templateSuffix, ":"+entityName)
			}
		}
	}
	return false
}
