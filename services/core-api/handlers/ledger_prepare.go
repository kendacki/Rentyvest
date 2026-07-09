package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/internal/problems"
)

type LedgerPrepareHandler struct {
	client *canton.Client
}

func NewLedgerPrepareHandler(client *canton.Client) *LedgerPrepareHandler {
	return &LedgerPrepareHandler{client: client}
}

type preparePledgeRequest struct {
	PoolContractID         string `json:"pool_contract_id"`
	BuyerPartyID           string `json:"buyer_party_id"`
	SlotCount              int    `json:"slot_count"`
	MetaURI                string `json:"meta_uri"`
	PaymentAssetContractID string `json:"payment_asset_contract_id"`
}

type prepareNFTTransferRequest struct {
	NFTContractID  string `json:"nft_contract_id"`
	CurrentHolder  string `json:"current_holder"`
	NewHolder      string `json:"new_holder"`
	TransferID     string `json:"transfer_id,omitempty"`
}

type prepareClaimYieldRequest struct {
	NFTContractID  string `json:"nft_contract_id"`
	CurrentHolder  string `json:"current_holder"`
	ClaimingPoolID string `json:"claiming_pool_id"`
	ClaimAmount    string `json:"claim_amount"`
}

type prepareLedgerResponse struct {
	Prepared canton.PreparedLedgerCommand `json:"prepared"`
}

func (h *LedgerPrepareHandler) PreparePledge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to prepare a PropertyPool.Pledge payload")
		return
	}
	if h.client == nil || !h.client.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	var req preparePledgeRequest
	if err := decodePrepareBody(r, &req); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	prepared, err := canton.BuildPledgePayload(
		h.client.TemplatePropertyPoolID(),
		req.PoolContractID,
		h.client.AdminPartyID(),
		req.BuyerPartyID,
		req.SlotCount,
		req.MetaURI,
		req.PaymentAssetContractID,
	)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	writeLedgerJSON(w, http.StatusOK, prepareLedgerResponse{Prepared: prepared})
}

type prepareTransferNFTWCRequest struct {
	OwnerPartyID    string `json:"ownerPartyId"`
	ContractID      string `json:"contractId"`
	NewOwnerPartyID string `json:"newOwnerPartyId"`
	TransferID      string `json:"transferId,omitempty"`
}

type prepareTransferNFTWCResponse struct {
	Prepared       canton.PreparedLedgerCommand `json:"prepared"`
	PrepareExecute canton.PrepareExecuteParams  `json:"prepare_execute"`
}

func (h *LedgerPrepareHandler) PrepareTransferNFT(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to prepare a PropertyNFT.TransferNFT payload")
		return
	}
	if h.client == nil || !h.client.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	var req prepareTransferNFTWCRequest
	if err := decodePrepareBody(r, &req); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	prepared, err := canton.BuildTransferNFTPayload(
		canton.PropertyNFTTemplateIDFromEnv(),
		req.ContractID,
		req.OwnerPartyID,
		req.NewOwnerPartyID,
		req.TransferID,
	)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}
	prepared.ControllerNote = "PropertyNFT.TransferNFT is controlled by current_holder only — safe for WalletConnect signing."

	writeLedgerJSON(w, http.StatusOK, prepareTransferNFTWCResponse{
		Prepared:       prepared,
		PrepareExecute: canton.ToPrepareExecuteParams(prepared),
	})
}

func (h *LedgerPrepareHandler) PrepareNFTTransfer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to prepare a PropertyNFT.TransferNFT payload")
		return
	}
	if h.client == nil || !h.client.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	var req prepareNFTTransferRequest
	if err := decodePrepareBody(r, &req); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	prepared, err := canton.BuildTransferNFTPayload(
		canton.PropertyNFTTemplateIDFromEnv(),
		req.NFTContractID,
		req.CurrentHolder,
		req.NewHolder,
		req.TransferID,
	)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	writeLedgerJSON(w, http.StatusOK, prepareLedgerResponse{Prepared: prepared})
}

func (h *LedgerPrepareHandler) PrepareClaimYield(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to prepare a PropertyNFT.ClaimYield payload")
		return
	}
	if h.client == nil || !h.client.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	var req prepareClaimYieldRequest
	if err := decodePrepareBody(r, &req); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	prepared, err := canton.BuildClaimYieldPayload(
		canton.PropertyNFTTemplateIDFromEnv(),
		req.NFTContractID,
		req.CurrentHolder,
		req.ClaimingPoolID,
		req.ClaimAmount,
	)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	writeLedgerJSON(w, http.StatusOK, prepareLedgerResponse{Prepared: prepared})
}

func decodePrepareBody(r *http.Request, target interface{}) error {
	defer r.Body.Close()
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		return err
	}
	if len(strings.TrimSpace(string(body))) == 0 {
		return errEmptyPrepareBody
	}
	return json.Unmarshal(body, target)
}

var errEmptyPrepareBody = &prepareBodyError{msg: "request body is required"}

type prepareBodyError struct {
	msg string
}

func (e *prepareBodyError) Error() string {
	return e.msg
}
