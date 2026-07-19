package canton

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// BuildPledgePayload constructs a DevNet M2M exercise payload for PropertyPool.Pledge.
// Controller on-ledger: platform_admin only (issuer-settled Assets + admin-signed NFTs).
func BuildPledgePayload(
	poolTemplateID,
	poolContractID,
	platformAdmin,
	buyerPartyID string,
	slotCount int,
	metaURI,
	paymentAssetContractID string,
) (PreparedLedgerCommand, error) {
	poolTemplateID = strings.TrimSpace(poolTemplateID)
	poolContractID = strings.TrimSpace(poolContractID)
	platformAdmin = strings.TrimSpace(platformAdmin)
	buyerPartyID = strings.TrimSpace(buyerPartyID)
	metaURI = strings.TrimSpace(metaURI)
	paymentAssetContractID = strings.TrimSpace(paymentAssetContractID)

	if poolTemplateID == "" || poolContractID == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("pool template id and contract id are required")
	}
	if platformAdmin == "" || buyerPartyID == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("platform admin and buyer party id are required")
	}
	if slotCount <= 0 {
		return PreparedLedgerCommand{}, fmt.Errorf("slot_count must be greater than zero")
	}
	if metaURI == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("meta_uri is required")
	}
	if paymentAssetContractID == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("payment_asset_contract_id is required")
	}

	commandID := fmt.Sprintf("pledge-%s-%d", buyerPartyID, time.Now().UnixNano())
	choiceArgs := map[string]interface{}{
		"buyer":           buyerPartyID,
		"slot_count":      fmt.Sprintf("%d", slotCount),
		"meta_uri":        metaURI,
		"paymentAssetCid": paymentAssetContractID,
	}

	exercise := exerciseCommand{
		ExerciseCommand: exercisePayload{
			TemplateID:     poolTemplateID,
			ContractID:     poolContractID,
			Choice:         "Pledge",
			ChoiceArgument: choiceArgs,
		},
	}

	actAs := []string{platformAdmin, buyerPartyID}
	loopSubmit := LoopWalletSubmitPayload{
		ActAs:              actAs,
		ReadAs:             actAs,
		CommandID:          commandID,
		DisclosedContracts: []interface{}{},
		Commands:           []interface{}{exercise},
	}

	ledgerLog("prepare", "pledge", fmt.Sprintf(
		"pool=%s buyer=%s slots=%d",
		truncateForLog(poolContractID, 16),
		truncateForLog(buyerPartyID, 16),
		slotCount,
	))

	return PreparedLedgerCommand{
		CommandID:      commandID,
		TemplateID:     poolTemplateID,
		ContractID:     poolContractID,
		Choice:         "Pledge",
		ChoiceArgument: choiceArgs,
		ControllerNote: "PropertyPool.Pledge controllers are platform_admin and buyer; Loop signs buyer, platform_admin may require a separate M2M co-sign path.",
		LoopSubmit:     loopSubmit,
	}, nil
}

// BuildTransferNFTPayload constructs PropertyNFT.TransferNFT for Loop (controller: current_holder).
func BuildTransferNFTPayload(
	nftTemplateID,
	nftContractID,
	currentHolder,
	newHolder,
	transferID string,
) (PreparedLedgerCommand, error) {
	nftTemplateID = strings.TrimSpace(nftTemplateID)
	nftContractID = strings.TrimSpace(nftContractID)
	currentHolder = strings.TrimSpace(currentHolder)
	newHolder = strings.TrimSpace(newHolder)
	transferID = strings.TrimSpace(transferID)

	if nftTemplateID == "" || nftContractID == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("nft template id and contract id are required")
	}
	if currentHolder == "" || newHolder == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("current holder and new holder party ids are required")
	}
	if transferID == "" {
		transferID = uuid.NewString()
	}

	commandID := fmt.Sprintf("nft-transfer-%s-%d", currentHolder, time.Now().UnixNano())
	choiceArgs := map[string]interface{}{
		"new_holder":  newHolder,
		"transfer_id": transferID,
	}

	exercise := exerciseCommand{
		ExerciseCommand: exercisePayload{
			TemplateID:     nftTemplateID,
			ContractID:     nftContractID,
			Choice:         "TransferNFT",
			ChoiceArgument: choiceArgs,
		},
	}

	actAs := []string{currentHolder}
	loopSubmit := LoopWalletSubmitPayload{
		ActAs:              actAs,
		ReadAs:             actAs,
		CommandID:          commandID,
		DisclosedContracts: []interface{}{},
		Commands:           []interface{}{exercise},
	}

	ledgerLog("prepare", "nft_transfer", fmt.Sprintf(
		"nft=%s from=%s to=%s",
		truncateForLog(nftContractID, 16),
		truncateForLog(currentHolder, 16),
		truncateForLog(newHolder, 16),
	))

	return PreparedLedgerCommand{
		CommandID:      commandID,
		TemplateID:     nftTemplateID,
		ContractID:     nftContractID,
		Choice:         "TransferNFT",
		ChoiceArgument: choiceArgs,
		ControllerNote: "PropertyNFT.TransferNFT is controlled by current_holder only — safe for Loop wallet signing.",
		LoopSubmit:     loopSubmit,
	}, nil
}

// BuildClaimYieldPayload constructs PropertyNFT.ClaimYield for Loop (controller: current_holder).
func BuildClaimYieldPayload(
	nftTemplateID,
	nftContractID,
	currentHolder,
	claimingPoolID,
	claimAmount string,
) (PreparedLedgerCommand, error) {
	nftTemplateID = strings.TrimSpace(nftTemplateID)
	nftContractID = strings.TrimSpace(nftContractID)
	currentHolder = strings.TrimSpace(currentHolder)
	claimingPoolID = strings.TrimSpace(claimingPoolID)
	claimAmount = strings.TrimSpace(claimAmount)

	if nftTemplateID == "" || nftContractID == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("nft template id and contract id are required")
	}
	if currentHolder == "" || claimingPoolID == "" || claimAmount == "" {
		return PreparedLedgerCommand{}, fmt.Errorf("holder party, claiming_pool_id, and claim_amount are required")
	}

	commandID := fmt.Sprintf("nft-claim-yield-%s-%d", currentHolder, time.Now().UnixNano())
	choiceArgs := map[string]interface{}{
		"claiming_pool_id": claimingPoolID,
		"claim_amount":     claimAmount,
	}

	exercise := exerciseCommand{
		ExerciseCommand: exercisePayload{
			TemplateID:     nftTemplateID,
			ContractID:     nftContractID,
			Choice:         "ClaimYield",
			ChoiceArgument: choiceArgs,
		},
	}

	actAs := []string{currentHolder}
	loopSubmit := LoopWalletSubmitPayload{
		ActAs:              actAs,
		ReadAs:             actAs,
		CommandID:          commandID,
		DisclosedContracts: []interface{}{},
		Commands:           []interface{}{exercise},
	}

	ledgerLog("prepare", "nft_claim_yield", fmt.Sprintf(
		"nft=%s holder=%s amount=%s pool=%s",
		truncateForLog(nftContractID, 16),
		truncateForLog(currentHolder, 16),
		claimAmount,
		claimingPoolID,
	))

	return PreparedLedgerCommand{
		CommandID:      commandID,
		TemplateID:     nftTemplateID,
		ContractID:     nftContractID,
		Choice:         "ClaimYield",
		ChoiceArgument: choiceArgs,
		ControllerNote: "PropertyNFT.ClaimYield is controlled by current_holder only — safe for Loop wallet signing.",
		LoopSubmit:     loopSubmit,
	}, nil
}

func truncateForLog(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) <= max {
		return value
	}
	return value[:max] + "…"
}
