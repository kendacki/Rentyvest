package canton

import "fmt"

// PoolStatus mirrors RentyVest.Types:PoolStatus on the ledger.
type PoolStatus string

const (
	PoolStatusPending  PoolStatus = "Pending"
	PoolStatusActive   PoolStatus = "Active"
	PoolStatusExpired  PoolStatus = "Expired"
	PoolStatusArchived PoolStatus = "Archived"
)

// YieldRecord mirrors RentyVest.Types:YieldRecord.
type YieldRecord struct {
	DistributionID string `json:"distribution_id"`
	PeriodStart    string `json:"period_start"`
	PeriodEnd      string `json:"period_end"`
	AmountPerSlot  string `json:"amount_per_slot"`
	Currency       string `json:"currency"`
	RecordedAt     string `json:"recorded_at"`
}

// TransferRecord mirrors RentyVest.Types:TransferRecord.
type TransferRecord struct {
	TransferID     string  `json:"transfer_id"`
	SlotIndex      int     `json:"slot_index"`
	FromOwner      string  `json:"from_owner"`
	ToOwner        string  `json:"to_owner"`
	TransferredAt  string  `json:"transferred_at"`
	Consideration  *string `json:"consideration,omitempty"`
}

// EscrowedPledge mirrors RentyVest.PropertyPool:EscrowedPledge.
type EscrowedPledge struct {
	BidReference    string   `json:"bid_reference"`
	Buyer           string   `json:"buyer"`
	SlotCount       int      `json:"slot_count"`
	PaymentAssetCid string   `json:"paymentAssetCid"`
	NftCids         []string `json:"nftCids"`
}

// PropertyPoolPayload mirrors RentyVest.PropertyPool:PropertyPool createArgument.
type PropertyPoolPayload struct {
	PlatformAdmin         string           `json:"platform_admin"`
	Seller                string           `json:"seller"`
	PropManager           string           `json:"prop_manager"`
	PoolID                string           `json:"pool_id"`
	PropertyID            string           `json:"property_id"`
	PropertyTitle         string           `json:"property_title"`
	TotalSlots            int              `json:"total_slots"`
	NextSlotIndex         int              `json:"next_slot_index"`
	SlotPrice             string           `json:"slot_price"`
	Currency              string           `json:"currency"`
	Status                PoolStatus       `json:"status"`
	FundraisingDeadline   string           `json:"fundraising_deadline"`
	YieldHistory          []YieldRecord    `json:"yield_history"`
	TransferLog           []TransferRecord `json:"transfer_log"`
	RefundedBidReferences []string         `json:"refunded_bid_references"`
	EscrowedPledges       []EscrowedPledge `json:"escrowed_pledges"`
	CreatedAt             string           `json:"created_at"`
}

// PropertyPoolContract is an active PropertyPool on Canton.
type PropertyPoolContract struct {
	ContractID string              `json:"contract_id"`
	TemplateID string              `json:"template_id"`
	Payload    PropertyPoolPayload `json:"payload"`
}

// PropertyNFTPayload mirrors RentyVest.PropertyNFT:PropertyNFT createArgument.
type PropertyNFTPayload struct {
	PlatformAdmin  string `json:"platform_admin"`
	OriginalHolder string `json:"original_holder"`
	CurrentHolder  string `json:"current_holder"`
	PoolID         string `json:"pool_id"`
	PropertyID     string `json:"property_id"`
	SlotIndex      int    `json:"slot_index"`
	PendingYield   string `json:"pending_yield"`
	Currency       string `json:"currency"`
	TransferLocked bool   `json:"transfer_locked"`
}

// PropertyNFTContract is an active PropertyNFT on Canton.
type PropertyNFTContract struct {
	ContractID string             `json:"contract_id"`
	TemplateID string             `json:"template_id"`
	Payload    PropertyNFTPayload `json:"payload"`
}

// EscrowView joins pool context with a single escrowed pledge leg.
type EscrowView struct {
	PoolContractID string         `json:"pool_contract_id"`
	PoolID         string         `json:"pool_id"`
	PropertyID     string         `json:"property_id"`
	PropertyTitle  string         `json:"property_title"`
	PoolStatus     PoolStatus     `json:"pool_status"`
	Escrow         EscrowedPledge `json:"escrow"`
}

// UserEquityTokenView is a frontend-friendly projection of an on-ledger PropertyNFT.
type UserEquityTokenView struct {
	ContractID     string `json:"contract_id"`
	TemplateID     string `json:"template_id"`
	Owner          string `json:"owner"`
	PropertyID     string `json:"property_id"`
	PoolID         string `json:"pool_id"`
	SlotIndex      int    `json:"slot_index"`
	SlotID         string `json:"slot_id"`
	PendingYield   string `json:"pending_yield"`
	Currency       string `json:"currency"`
	TransferLocked bool   `json:"transfer_locked"`
	EquityShare    string `json:"equity_share"`
}

// ToUserEquityTokenView maps a PropertyNFT contract to a wallet/portfolio view.
// equityShare is one slot's fraction of the pool when totalSlots > 0, otherwise "1".
func ToUserEquityTokenView(nft PropertyNFTContract, totalSlots int) UserEquityTokenView {
	equityShare := "1"
	if totalSlots > 0 {
		equityShare = fmt.Sprintf("1/%d", totalSlots)
	}

	return UserEquityTokenView{
		ContractID:     nft.ContractID,
		TemplateID:     nft.TemplateID,
		Owner:          nft.Payload.CurrentHolder,
		PropertyID:     nft.Payload.PropertyID,
		PoolID:         nft.Payload.PoolID,
		SlotIndex:      nft.Payload.SlotIndex,
		SlotID:         fmt.Sprintf("%s:%d", nft.Payload.PoolID, nft.Payload.SlotIndex),
		PendingYield:   nft.Payload.PendingYield,
		Currency:       nft.Payload.Currency,
		TransferLocked: nft.Payload.TransferLocked,
		EquityShare:    equityShare,
	}
}
