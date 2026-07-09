package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/problems"
)

type BackendExecuteHandler struct {
	store        *db.Store
	cantonClient *canton.Client
	metaURIBase  string
}

func NewBackendExecuteHandler(store *db.Store, cantonClient *canton.Client) *BackendExecuteHandler {
	metaURIBase := strings.TrimRight(strings.TrimSpace(defaultPledgeMetaURIBase), "/")
	return &BackendExecuteHandler{
		store:        store,
		cantonClient: cantonClient,
		metaURIBase:  metaURIBase,
	}
}

type backendExecutePledgeRequest struct {
	BuyerPartyID           string `json:"buyerPartyId"`
	PropertyID             string `json:"propertyId"`
	Amount                 string `json:"amount"`
	PaymentAssetContractID string `json:"paymentAssetContractId,omitempty"`
}

type backendExecutePledgeResponse struct {
	CommandID              string   `json:"commandId"`
	UpdateID               string   `json:"updateId,omitempty"`
	PoolContractID         string   `json:"poolContractId,omitempty"`
	PaymentAssetContractID string   `json:"paymentAssetContractId"`
	SlotCount              int      `json:"slotCount"`
	MintedNFTContractIDs   []string `json:"mintedNftContractIds,omitempty"`
}

func (h *BackendExecuteHandler) ExecutePledge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to execute PropertyPool.Pledge via backend M2M co-sign")
		return
	}
	if h.cantonClient == nil || !h.cantonClient.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}
	if h.store == nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Database is not configured")
		return
	}

	var req backendExecutePledgeRequest
	if err := decodeBackendExecuteBody(r, &req); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	buyerPartyID := strings.TrimSpace(req.BuyerPartyID)
	if buyerPartyID == "" {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", "buyerPartyId is required")
		return
	}

	propertyID, err := uuid.Parse(strings.TrimSpace(req.PropertyID))
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", "propertyId must be a valid UUID")
		return
	}

	amount, err := strconv.ParseFloat(strings.TrimSpace(req.Amount), 64)
	if err != nil || amount <= 0 {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", "amount must be a positive number")
		return
	}

	property, err := h.store.GetPropertyNativePledgeContext(r.Context(), propertyID)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load property pool")
		return
	}
	if property == nil {
		problems.WriteCode(w, http.StatusNotFound, "RV-2007", "Not Found", "Property not found")
		return
	}

	unitPrice, err := strconv.ParseFloat(property.UnitPrice, 64)
	if err != nil || unitPrice <= 0 {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Invalid property unit price")
		return
	}

	slotCount, err := slotCountFromAmount(amount, unitPrice)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}
	if err := property.ValidateForNativePledge(int32(slotCount)); err != nil {
		switch {
		case errors.Is(err, db.ErrPropertyPoolUnavailable):
			problems.WriteCode(w, http.StatusConflict, "RV-2008", "Conflict", "Property pool is not open for pledges")
		case errors.Is(err, db.ErrInsufficientPoolCapacity):
			problems.WriteCode(w, http.StatusConflict, "RV-2009", "Conflict", "Insufficient slots available for this property")
		default:
			problems.Write(w, http.StatusConflict, "Conflict", "Property pool cannot accept this pledge")
		}
		return
	}

	paymentAssetContractID := strings.TrimSpace(req.PaymentAssetContractID)
	if paymentAssetContractID == "" {
		paymentAssetContractID, err = h.resolvePaymentAssetContractID(r, buyerPartyID, amount)
		if err != nil {
			problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
			return
		}
	}

	metaURI := fmt.Sprintf("%s/backend-%s", h.metaURIBase, uuid.NewString())
	commandID := fmt.Sprintf("pledge-backend-%s", uuid.NewString())

	cantonCtx, cancel := pledgeCantonContext(r)
	defer cancel()

	result, submitErr := h.cantonClient.SubmitPledgeBackendExecute(cantonCtx, canton.PledgeCommand{
		PoolContractID:         property.CantonPoolContractID,
		BuyerPartyID:           buyerPartyID,
		SlotCount:              int32(slotCount),
		MetaURI:                metaURI,
		PaymentAssetContractID: paymentAssetContractID,
		CommandID:              commandID,
	})
	if submitErr != nil {
		status, code, detail := canton.ProblemForSubmitError(submitErr)
		problems.WriteCode(w, status, code, http.StatusText(status), detail)
		return
	}

	writeLedgerJSON(w, http.StatusOK, backendExecutePledgeResponse{
		CommandID:              result.CommandID,
		UpdateID:               result.UpdateID,
		PoolContractID:         coalesceNonEmpty(result.PoolContractID, property.CantonPoolContractID),
		PaymentAssetContractID: coalesceNonEmpty(result.PaymentAssetCID, paymentAssetContractID),
		SlotCount:              slotCount,
		MintedNFTContractIDs:   result.NFTContractIDs,
	})
}

func (h *BackendExecuteHandler) resolvePaymentAssetContractID(
	r *http.Request,
	buyerPartyID string,
	requiredAmount float64,
) (string, error) {
	assets, err := h.store.ListTokenAssetsByOwnerParty(r.Context(), buyerPartyID)
	if err != nil {
		return "", fmt.Errorf("unable to resolve payment asset: %w", err)
	}
	if len(assets) == 0 {
		return "", fmt.Errorf("no tUSDC payment asset found for buyer; claim faucet funds or pass paymentAssetContractId")
	}

	for _, asset := range assets {
		balance, parseErr := strconv.ParseFloat(asset.Balance, 64)
		if parseErr != nil {
			continue
		}
		if balance+1e-9 >= requiredAmount {
			return asset.CantonContractID, nil
		}
	}

	return "", fmt.Errorf("no payment asset with sufficient balance for amount %s", formatAmount(requiredAmount))
}

func slotCountFromAmount(amount, unitPrice float64) (int, error) {
	ratio := amount / unitPrice
	slotCount := int(math.Round(ratio))
	if slotCount <= 0 {
		return 0, fmt.Errorf("amount must cover at least one slot")
	}
	expected := float64(slotCount) * unitPrice
	if math.Abs(amount-expected) > 0.01 {
		return 0, fmt.Errorf("amount must be an exact multiple of the property unit price")
	}
	return slotCount, nil
}

func decodeBackendExecuteBody(r *http.Request, target interface{}) error {
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
