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
	baseURL              string
	actAsParty           string
	readAsParty          string
	adminParty           string
	adminToken           string
	userID               string
	templatePoolID       string
	templateUSDCIssuerID string
	templateAssetID      string
	usdcIssuerContractID string
	httpClient           *http.Client
}

type Config struct {
	BaseURL              string
	ActAsParty           string
	ReadAsParty          string
	AdminParty           string
	AdminToken           string
	UserID               string
	TemplatePoolID       string
	TemplateUSDCIssuerID string
	TemplateAssetID      string
	USDCIssuerContractID string
}

type PledgeCommand struct {
	PoolContractID         string
	BuyerPartyID           string
	SlotCount              int32
	MetaURI                string
	PaymentAssetContractID string
	CommandID              string
}

type PledgeResult struct {
	CommandID         string
	UpdateID          string
	PoolContractID    string
	NFTContractIDs    []string
	PaymentAssetCID   string
	BuyerChangeCID    string
}

type MergeAssetsCommand struct {
	OwnerPartyID string
	ContractIDs  []string
	CommandID    string
}

type MergeAssetsResult struct {
	CommandID        string
	UpdateID         string
	MergedContractID string
	MergedBalance    string
}

type MintCommand struct {
	IssuerContractID string
	OwnerPartyID     string
	Amount           string
	Observers        []string
	CommandID        string
}

type MintResult struct {
	CommandID         string
	UpdateID          string
	HoldingContractID string
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

	actAs := cfg.ActAsParty
	if actAs == "" {
		actAs = os.Getenv("CANTON_ACT_AS_PARTY")
	}
	if actAs == "" {
		return nil, fmt.Errorf("CANTON_ACT_AS_PARTY is required")
	}

	readAs := cfg.ReadAsParty
	if readAs == "" {
		readAs = os.Getenv("CANTON_READ_AS_PARTY")
	}
	if readAs == "" {
		readAs = actAs
	}

	userID := cfg.UserID
	if userID == "" {
		userID = os.Getenv("CANTON_LEDGER_USER_ID")
	}
	if userID == "" {
		userID = "rentyvest-core-api"
	}

	templatePoolID := cfg.TemplatePoolID
	if templatePoolID == "" {
		templatePoolID = os.Getenv("CANTON_TEMPLATE_PROPERTY_POOL")
	}
	if templatePoolID == "" {
		templatePoolID = "RentyVest.PropertyPool:PropertyPool"
	}

	adminParty := cfg.AdminParty
	if adminParty == "" {
		adminParty = strings.TrimSpace(os.Getenv("CANTON_ADMIN_PARTY_ID"))
	}
	if adminParty == "" {
		adminParty = actAs
	}

	adminToken := cfg.AdminToken
	if adminToken == "" {
		adminToken = strings.TrimSpace(os.Getenv("CANTON_ADMIN_TOKEN"))
	}
	if adminToken == "" {
		adminToken = strings.TrimSpace(os.Getenv("CANTON_JWT"))
	}

	templateUSDCIssuerID := cfg.TemplateUSDCIssuerID
	if templateUSDCIssuerID == "" {
		templateUSDCIssuerID = os.Getenv("CANTON_TEMPLATE_USDC_ISSUER")
	}
	if templateUSDCIssuerID == "" {
		templateUSDCIssuerID = "RentyVest.TestUSDC:USDCIssuer"
	}

	templateAssetID := cfg.TemplateAssetID
	if templateAssetID == "" {
		templateAssetID = os.Getenv("CANTON_TEMPLATE_USDC_ASSET")
	}
	if templateAssetID == "" {
		templateAssetID = "RentyVest.TestUSDC:Asset"
	}

	usdcIssuerContractID := cfg.USDCIssuerContractID
	if usdcIssuerContractID == "" {
		usdcIssuerContractID = strings.TrimSpace(os.Getenv("CANTON_USDC_ISSUER_CONTRACT_ID"))
	}

	return &Client{
		baseURL:              baseURL,
		actAsParty:           actAs,
		readAsParty:          readAs,
		adminParty:           adminParty,
		adminToken:           adminToken,
		userID:               userID,
		templatePoolID:       templatePoolID,
		templateUSDCIssuerID: templateUSDCIssuerID,
		templateAssetID:      templateAssetID,
		usdcIssuerContractID: usdcIssuerContractID,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}, nil
}

func (c *Client) Configured() bool {
	return strings.TrimSpace(c.baseURL) != "" && strings.TrimSpace(c.adminParty) != ""
}

func (c *Client) SubmitPledge(ctx context.Context, cmd PledgeCommand) (*PledgeResult, error) {
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
		commandID = fmt.Sprintf("pledge-%s", uuid.NewString())
	}

	body := submitRequest{
		ActAs:     []string{c.adminParty, cmd.BuyerPartyID},
		ReadAs:    []string{c.readAsParty},
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

	responseBody, err := c.submitAndWait(ctx, body, c.adminToken)
	if err != nil {
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

	return result, nil
}

func (c *Client) SubmitMergeAssets(ctx context.Context, cmd MergeAssetsCommand) (*MergeAssetsResult, error) {
	if strings.TrimSpace(cmd.OwnerPartyID) == "" {
		return nil, fmt.Errorf("owner party id is required")
	}
	if len(cmd.ContractIDs) < 2 {
		return nil, fmt.Errorf("at least two asset contract ids are required")
	}

	commandID := cmd.CommandID
	if commandID == "" {
		commandID = fmt.Sprintf("merge-assets-%s", uuid.NewString())
	}

	currentCID := strings.TrimSpace(cmd.ContractIDs[0])
	for index, otherCID := range cmd.ContractIDs[1:] {
		otherCID = strings.TrimSpace(otherCID)
		if otherCID == "" {
			return nil, fmt.Errorf("asset contract id at index %d is required", index+1)
		}

		stepCommandID := fmt.Sprintf("%s-%d", commandID, index)
		body := submitRequest{
			ActAs:     []string{cmd.OwnerPartyID},
			ReadAs:    []string{c.readAsParty},
			UserID:    c.userID,
			CommandID: stepCommandID,
			Commands: []interface{}{
				exerciseCommand{
					ExerciseCommand: exercisePayload{
						TemplateID: c.templateAssetID,
						ContractID: currentCID,
						Choice:     "MergeWith",
						ChoiceArgument: map[string]interface{}{
							"otherCid": otherCID,
						},
					},
				},
			},
		}

		responseBody, err := c.submitAndWait(ctx, body, c.adminToken)
		if err != nil {
			return nil, err
		}

		mergedCID := extractCreatedContractID(responseBody, ":Asset")
		if mergedCID == "" {
			return nil, fmt.Errorf("merge response did not include merged asset contract id")
		}
		currentCID = mergedCID
	}

	return &MergeAssetsResult{
		CommandID:        commandID,
		MergedContractID: currentCID,
	}, nil
}

func (c *Client) USDCIssuerConfigured() bool {
	return strings.TrimSpace(c.usdcIssuerContractID) != ""
}

func (c *Client) SubmitMint(ctx context.Context, cmd MintCommand) (*MintResult, error) {
	issuerContractID := strings.TrimSpace(cmd.IssuerContractID)
	if issuerContractID == "" {
		issuerContractID = c.usdcIssuerContractID
	}
	if issuerContractID == "" {
		return nil, fmt.Errorf("CANTON_USDC_ISSUER_CONTRACT_ID is required")
	}
	if strings.TrimSpace(cmd.OwnerPartyID) == "" {
		return nil, fmt.Errorf("owner party id is required")
	}
	if strings.TrimSpace(cmd.Amount) == "" {
		return nil, fmt.Errorf("mint amount is required")
	}

	commandID := cmd.CommandID
	if commandID == "" {
		commandID = fmt.Sprintf("faucet-mint-%s", uuid.NewString())
	}

	observers := cmd.Observers
	if observers == nil {
		observers = []string{}
	}

	body := submitRequest{
		ActAs:     []string{c.adminParty},
		ReadAs:    []string{c.readAsParty},
		UserID:    c.userID,
		CommandID: commandID,
		Commands: []interface{}{
			exerciseCommand{
				ExerciseCommand: exercisePayload{
					TemplateID:     c.templateUSDCIssuerID,
					ContractID:     issuerContractID,
					Choice:         "Mint",
					ChoiceArgument: map[string]interface{}{
						"owner":     cmd.OwnerPartyID,
						"amount":    cmd.Amount,
						"observers": observers,
					},
				},
			},
		},
	}

	responseBody, err := c.submitAndWait(ctx, body, c.adminToken)
	if err != nil {
		return nil, err
	}

	result := &MintResult{
		CommandID:         commandID,
		HoldingContractID: extractCreatedContractID(responseBody, ":Asset"),
	}
	if updateID, ok := extractStringField(responseBody, "updateId"); ok {
		result.UpdateID = updateID
	}

	return result, nil
}

func (c *Client) submitAndWait(ctx context.Context, body submitRequest, token string) ([]byte, error) {
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
	if strings.TrimSpace(token) != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(token))
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
		return nil, NewSubmitError(resp.StatusCode, string(responseBody))
	}

	return responseBody, nil
}

func extractStringField(body []byte, field string) (string, bool) {
	var decoded map[string]interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return "", false
	}

	value, ok := decoded[field].(string)
	return value, ok && value != ""
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
			if templateID, ok := value["templateId"].(string); ok && strings.HasSuffix(templateID, templateSuffix) {
				return contractID
			}
			if templateID, ok := value["templateId"].(map[string]interface{}); ok {
				if moduleName, _ := templateID["moduleName"].(string); moduleName != "" {
					if entityName, _ := templateID["entityName"].(string); entityName != "" {
						combined := moduleName + ":" + entityName
						if strings.HasSuffix(combined, templateSuffix) || strings.HasSuffix(templateSuffix, ":"+entityName) {
							return contractID
						}
					}
				}
			}
		}
		for _, child := range value {
			if contractID := findCreatedContractID(child, templateSuffix); contractID != "" {
				return contractID
			}
		}
	case []interface{}:
		for _, child := range value {
			if contractID := findCreatedContractID(child, templateSuffix); contractID != "" {
				return contractID
			}
		}
	}

	return ""
}

func extractCreatedContractIDs(body []byte, templateSuffix string) []string {
	var decoded interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return nil
	}

	ids := make([]string, 0)
	collectCreatedContractIDs(decoded, templateSuffix, &ids)
	return ids
}

func collectCreatedContractIDs(node interface{}, templateSuffix string, ids *[]string) {
	switch value := node.(type) {
	case map[string]interface{}:
		if contractID, ok := value["contractId"].(string); ok && contractID != "" {
			if templateMatches(value, templateSuffix) {
				*ids = append(*ids, contractID)
			}
		}
		for _, child := range value {
			collectCreatedContractIDs(child, templateSuffix, ids)
		}
	case []interface{}:
		for _, child := range value {
			collectCreatedContractIDs(child, templateSuffix, ids)
		}
	}
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
