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
)

// LedgerReader queries Canton JSON Ledger API v2 active contracts using M2M OAuth
// (or M2M_TOKEN / CANTON_JWT fallbacks). It never submits commands.
type LedgerReader struct {
	client *Client
}

func NewLedgerReader(client *Client) *LedgerReader {
	return &LedgerReader{client: client}
}

func (r *LedgerReader) Configured() bool {
	return r != nil && r.client != nil && r.client.baseURL != ""
}

func (r *LedgerReader) propertyPoolTemplateID() string {
	templateID := strings.TrimSpace(os.Getenv("CANTON_TEMPLATE_PROPERTY_POOL"))
	if templateID == "" {
		templateID = "RentyVest.PropertyPool:PropertyPool"
	}
	return QualifyTemplateID(PackageIDFromEnv(), templateID)
}

func (r *LedgerReader) propertyNFTTemplateID() string {
	templateID := strings.TrimSpace(os.Getenv("CANTON_TEMPLATE_PROPERTY_NFT"))
	if templateID == "" {
		templateID = "RentyVest.PropertyNFT:PropertyNFT"
	}
	return QualifyTemplateID(PackageIDFromEnv(), templateID)
}

func (r *LedgerReader) readParty() string {
	if r.client.readAsParty != "" {
		return r.client.readAsParty
	}
	return r.client.actAsParty
}

func (r *LedgerReader) resolveQueryToken(ctx context.Context) (string, error) {
	if token := strings.TrimSpace(os.Getenv("M2M_TOKEN")); token != "" {
		return token, nil
	}
	return r.client.resolveToken(ctx)
}

// ListPropertyPools returns active PropertyPool contracts visible to the read party.
func (r *LedgerReader) ListPropertyPools(ctx context.Context) ([]PropertyPoolContract, error) {
	party := r.readParty()
	templateID := r.propertyPoolTemplateID()

	body, err := r.queryActiveContracts(ctx, party, templateID)
	if err != nil {
		ledgerLogErr("read", "list_property_pools", "party="+party, err)
		return nil, err
	}

	pools, err := parsePropertyPoolContracts(body)
	if err != nil {
		ledgerLogErr("read", "list_property_pools", "parse", err)
		return nil, err
	}

	ledgerLog("read", "list_property_pools", fmt.Sprintf("party=%s count=%d", party, len(pools)))
	return pools, nil
}

// ListPropertyNFTs returns active PropertyNFT contracts for a holder party.
func (r *LedgerReader) ListPropertyNFTs(ctx context.Context, partyID string) ([]PropertyNFTContract, error) {
	partyID = strings.TrimSpace(partyID)
	if partyID == "" {
		return nil, fmt.Errorf("party id is required")
	}

	templateID := r.propertyNFTTemplateID()
	body, err := r.queryActiveContracts(ctx, partyID, templateID)
	if err != nil {
		ledgerLogErr("read", "list_property_nfts", "party="+partyID, err)
		return nil, err
	}

	nfts, err := parsePropertyNFTContracts(body)
	if err != nil {
		ledgerLogErr("read", "list_property_nfts", "parse", err)
		return nil, err
	}

	ledgerLog("read", "list_property_nfts", fmt.Sprintf("party=%s count=%d", partyID, len(nfts)))
	return nfts, nil
}

// VerifyPledgeNFTs cross-checks client-submitted NFT contract ids against the
// ledger: every claimed id must exist as an active PropertyNFT currently held
// by the buyer party. Returns the subset of claimed ids that are verified.
// This prevents a client-submitted pledge from indexing fabricated NFT ids.
func (r *LedgerReader) VerifyPledgeNFTs(
	ctx context.Context,
	buyerPartyID string,
	claimedContractIDs []string,
) ([]string, error) {
	buyerPartyID = strings.TrimSpace(buyerPartyID)
	if buyerPartyID == "" {
		return nil, fmt.Errorf("buyer party id is required")
	}
	if len(claimedContractIDs) == 0 {
		return nil, nil
	}

	held, err := r.ListPropertyNFTs(ctx, buyerPartyID)
	if err != nil {
		return nil, err
	}

	onLedger := make(map[string]struct{}, len(held))
	for _, nft := range held {
		if nft.Payload.CurrentHolder == buyerPartyID {
			onLedger[nft.ContractID] = struct{}{}
		}
	}

	verified := make([]string, 0, len(claimedContractIDs))
	for _, claimed := range claimedContractIDs {
		claimed = strings.TrimSpace(claimed)
		if claimed == "" {
			continue
		}
		if _, ok := onLedger[claimed]; !ok {
			return nil, fmt.Errorf(
				"claimed NFT %s is not an active PropertyNFT held by %s",
				truncateForLog(claimed, 24),
				truncateForLog(buyerPartyID, 24),
			)
		}
		verified = append(verified, claimed)
	}

	ledgerLog("read", "verify_pledge_nfts", fmt.Sprintf(
		"party=%s claimed=%d verified=%d",
		buyerPartyID, len(claimedContractIDs), len(verified),
	))
	return verified, nil
}

// ListUserEquityTokens returns PropertyNFT contracts where partyID is current_holder.
func (r *LedgerReader) ListUserEquityTokens(ctx context.Context, partyID string) ([]PropertyNFTContract, error) {
	nfts, err := r.ListPropertyNFTs(ctx, partyID)
	if err != nil {
		return nil, err
	}

	held := make([]PropertyNFTContract, 0, len(nfts))
	for _, nft := range nfts {
		if nft.Payload.CurrentHolder != partyID {
			continue
		}
		held = append(held, nft)
	}

	ledgerLog("read", "list_user_equity", fmt.Sprintf("party=%s count=%d", partyID, len(held)))
	return held, nil
}

// ListEscrowsForParty returns escrowed pledge legs where the party is the buyer.
func (r *LedgerReader) ListEscrowsForParty(ctx context.Context, partyID string) ([]EscrowView, error) {
	partyID = strings.TrimSpace(partyID)
	if partyID == "" {
		return nil, fmt.Errorf("party id is required")
	}

	pools, err := r.ListPropertyPools(ctx)
	if err != nil {
		return nil, err
	}

	views := make([]EscrowView, 0)
	for _, pool := range pools {
		for _, escrow := range pool.Payload.EscrowedPledges {
			if escrow.Buyer != partyID {
				continue
			}
			views = append(views, EscrowView{
				PoolContractID: pool.ContractID,
				PoolID:         pool.Payload.PoolID,
				PropertyID:     pool.Payload.PropertyID,
				PropertyTitle:  pool.Payload.PropertyTitle,
				PoolStatus:     pool.Payload.Status,
				Escrow:         escrow,
			})
		}
	}

	if len(views) == 0 {
		ledgerLog("read", "list_escrows", fmt.Sprintf("party=%s count=0", partyID))
		return views, nil
	}

	ledgerLog("read", "list_escrows", fmt.Sprintf("party=%s count=%d", partyID, len(views)))
	return views, nil
}

func (r *LedgerReader) queryActiveContracts(ctx context.Context, party, qualifiedTemplateID string) ([]byte, error) {
	offset, err := r.client.ledgerEndOffset(ctx)
	if err != nil {
		return nil, fmt.Errorf("ledger end: %w", err)
	}

	templateID := QualifyTemplateIDForFilter(qualifiedTemplateID)
	if templateID == "" {
		return nil, fmt.Errorf("template id is required for active contracts query")
	}

	reqBody := activeContractsRequest{
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

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal active contracts request: %w", err)
	}

	token, err := r.resolveQueryToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("resolve ledger token: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		r.client.baseURL+"/v2/state/active-contracts",
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, fmt.Errorf("build active contracts request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := r.client.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("query active contracts: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, fmt.Errorf("read active contracts response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, NewSubmitError(resp.StatusCode, string(responseBody))
	}

	return responseBody, nil
}

func parsePropertyPoolContracts(body []byte) ([]PropertyPoolContract, error) {
	var decoded interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return nil, fmt.Errorf("decode active contracts: %w", err)
	}

	raw := collectCreatedEvents(decoded, "PropertyPool")
	out := make([]PropertyPoolContract, 0, len(raw))
	for _, event := range raw {
		var payload PropertyPoolPayload
		if err := remarshalCreateArgument(event.CreateArgument, &payload); err != nil {
			continue
		}
		out = append(out, PropertyPoolContract{
			ContractID: event.ContractID,
			TemplateID: event.TemplateID,
			Payload:    payload,
		})
	}
	return out, nil
}

func parsePropertyNFTContracts(body []byte) ([]PropertyNFTContract, error) {
	var decoded interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return nil, fmt.Errorf("decode active contracts: %w", err)
	}

	raw := collectCreatedEvents(decoded, "PropertyNFT")
	out := make([]PropertyNFTContract, 0, len(raw))
	for _, event := range raw {
		var payload PropertyNFTPayload
		if err := remarshalCreateArgument(event.CreateArgument, &payload); err != nil {
			continue
		}
		out = append(out, PropertyNFTContract{
			ContractID: event.ContractID,
			TemplateID: event.TemplateID,
			Payload:    payload,
		})
	}
	return out, nil
}

type createdEventRecord struct {
	ContractID     string
	TemplateID     string
	CreateArgument map[string]interface{}
}

func collectCreatedEvents(node interface{}, entityName string) []createdEventRecord {
	out := make([]createdEventRecord, 0)
	collectCreatedEventsWalk(node, entityName, &out)
	return out
}

func collectCreatedEventsWalk(node interface{}, entityName string, out *[]createdEventRecord) {
	switch value := node.(type) {
	case map[string]interface{}:
		if record, ok := createdEventFromMap(value, entityName); ok {
			*out = append(*out, record)
		}
		for _, child := range value {
			collectCreatedEventsWalk(child, entityName, out)
		}
	case []interface{}:
		for _, child := range value {
			collectCreatedEventsWalk(child, entityName, out)
		}
	}
}

func createdEventFromMap(value map[string]interface{}, entityName string) (createdEventRecord, bool) {
	contractID, _ := value["contractId"].(string)
	if contractID == "" {
		return createdEventRecord{}, false
	}

	templateID := templateIDString(value["templateId"])
	if templateID == "" || !strings.Contains(templateID, entityName) {
		return createdEventRecord{}, false
	}

	args, _ := value["createArgument"].(map[string]interface{})
	if args == nil {
		return createdEventRecord{}, false
	}

	return createdEventRecord{
		ContractID:     contractID,
		TemplateID:     templateID,
		CreateArgument: args,
	}, true
}

func remarshalCreateArgument(args map[string]interface{}, target interface{}) error {
	raw, err := json.Marshal(args)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, target)
}
