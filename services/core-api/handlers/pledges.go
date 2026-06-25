package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/internal/auth"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/privy"
	"github.com/rentyvest/core-api/internal/problems"
)

const (
	idempotencyHeader          = "Idempotency-Key"
	flutterwaveSignatureHeader = "X-Flutterwave-Signature"
	defaultPledgeMetaURIBase   = "https://api.rentyvest.com/metadata/pledges"
	defaultPledgeCurrency      = "tUSDC"
)

type PledgesHandler struct {
	store           *db.Store
	privyVerifier   *privy.Verifier
	cantonClient    *canton.Client
	webhookSecret   string
	metaURIBase     string
	pledgeCurrency  string
}

func NewPledgesHandler(store *db.Store, verifier *privy.Verifier, cantonClient *canton.Client) *PledgesHandler {
	metaURIBase := strings.TrimRight(strings.TrimSpace(os.Getenv("PLEDGE_META_URI_BASE")), "/")
	if metaURIBase == "" {
		metaURIBase = defaultPledgeMetaURIBase
	}

	pledgeCurrency := strings.TrimSpace(os.Getenv("PLEDGE_CURRENCY"))
	if pledgeCurrency == "" {
		pledgeCurrency = defaultPledgeCurrency
	}

	return &PledgesHandler{
		store:          store,
		privyVerifier:  verifier,
		cantonClient:   cantonClient,
		webhookSecret:  os.Getenv("FLUTTERWAVE_WEBHOOK_SECRET"),
		metaURIBase:    metaURIBase,
		pledgeCurrency: pledgeCurrency,
	}
}

type createPledgeRequest struct {
	PropertyID             string   `json:"property_id"`
	SlotCount              int32    `json:"slot_count"`
	PaymentAssetContractID string   `json:"payment_asset_contract_id"`
	ClientSubmitted        bool     `json:"client_submitted"`
	CantonCommandID        string   `json:"canton_command_id,omitempty"`
	CantonUpdateID         string   `json:"canton_update_id,omitempty"`
	PoolContractID         string   `json:"pool_contract_id,omitempty"`
	MintedNFTContractIDs   []string `json:"minted_nft_contract_ids,omitempty"`
}

type createPledgeResponse struct {
	Pledge               db.Pledge `json:"pledge"`
	CantonCommandID      string    `json:"canton_command_id"`
	CantonUpdateID       string    `json:"canton_update_id,omitempty"`
	PoolContractID       string    `json:"pool_contract_id,omitempty"`
	PaymentAssetContract string    `json:"payment_asset_contract_id,omitempty"`
	MintedNFTContractIDs []string  `json:"minted_nft_contract_ids,omitempty"`
}

type flutterwaveWebhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		TxRef  string `json:"tx_ref"`
		Status string `json:"status"`
	} `json:"data"`
}

type webhookResponse struct {
	Pledge    db.Pledge `json:"pledge"`
	Duplicate bool      `json:"duplicate"`
}

func (h *PledgesHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to initiate a pledge")
		return
	}

	userID, err := h.authenticate(r)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	idempotencyKey := strings.TrimSpace(r.Header.Get(idempotencyHeader))
	if idempotencyKey == "" {
		problems.WriteCode(w, http.StatusBadRequest, "RV-2001", "Bad Request", "Idempotency-Key header is required")
		return
	}

	var request createPledgeRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-2002", "Bad Request", "Request body must be valid JSON")
		return
	}

	if request.SlotCount <= 0 {
		problems.WriteCode(w, http.StatusBadRequest, "RV-2003", "Bad Request", "slot_count must be greater than zero")
		return
	}

	paymentAssetContractID := strings.TrimSpace(request.PaymentAssetContractID)
	if paymentAssetContractID == "" {
		problems.WriteCode(w, http.StatusBadRequest, "RV-2004", "Bad Request", "payment_asset_contract_id is required")
		return
	}

	propertyID, err := uuid.Parse(strings.TrimSpace(request.PropertyID))
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-2005", "Bad Request", "property_id must be a valid UUID")
		return
	}

	kycTier, err := h.store.GetUserKYCTier(r.Context(), userID)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to verify user KYC status")
		return
	}
	if kycTier < 1 {
		problems.WriteCode(w, http.StatusForbidden, "RV-2006", "Forbidden", "KYC tier 1 or higher is required to initiate a pledge")
		return
	}

	existing, err := h.store.GetPledgeByIdempotencyKey(r.Context(), idempotencyKey)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to verify pledge idempotency")
		return
	}
	if existing != nil {
		problems.WriteCode(w, http.StatusConflict, "RV-3007", "Conflict", "Duplicate idempotency key")
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
	if err := property.ValidateForNativePledge(request.SlotCount); err != nil {
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

	if !request.ClientSubmitted {
		if h.cantonClient == nil || !h.cantonClient.Configured() {
			problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
			return
		}
	}

	buyerPartyID, err := h.store.GetUserCantonPartyID(r.Context(), userID)
	if errors.Is(err, db.ErrUserCantonPartyMissing) {
		problems.WriteCode(w, http.StatusBadRequest, "RV-2010", "Bad Request", "User does not have a Canton party ID configured")
		return
	}
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to resolve Canton party ID")
		return
	}

	unitPrice, err := strconv.ParseFloat(property.UnitPrice, 64)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Invalid property unit price")
		return
	}
	amount := unitPrice * float64(request.SlotCount)
	metaURI := fmt.Sprintf("%s/%s", h.metaURIBase, idempotencyKey)
	commandID := fmt.Sprintf("pledge-%s", idempotencyKey)

	var pledgeResult *canton.PledgeResult
	if request.ClientSubmitted {
		clientCommandID := strings.TrimSpace(request.CantonCommandID)
		if clientCommandID == "" {
			problems.WriteCode(w, http.StatusBadRequest, "RV-2011", "Bad Request", "canton_command_id is required when client_submitted is true")
			return
		}

		assets, listErr := h.store.ListUserTokenAssets(r.Context(), userID)
		if listErr != nil {
			problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to verify payment asset ownership")
			return
		}

		var paymentAsset *db.UserTokenAsset
		for index := range assets {
			if assets[index].CantonContractID == paymentAssetContractID {
				paymentAsset = &assets[index]
				break
			}
		}
		if paymentAsset == nil {
			problems.WriteCode(w, http.StatusBadRequest, "RV-2012", "Bad Request", "Payment asset was not found for this user")
			return
		}
		if paymentAsset.OwnerPartyID != buyerPartyID {
			problems.WriteCode(w, http.StatusBadRequest, "RV-2013", "Bad Request", "Payment asset owner does not match the user's Canton party")
			return
		}

		pledgeResult = &canton.PledgeResult{
			CommandID:       clientCommandID,
			UpdateID:        strings.TrimSpace(request.CantonUpdateID),
			PoolContractID:  coalesceNonEmpty(strings.TrimSpace(request.PoolContractID), property.CantonPoolContractID),
			PaymentAssetCID: paymentAssetContractID,
			NFTContractIDs:  request.MintedNFTContractIDs,
		}
	} else {
		cantonCtx, cancel := pledgeCantonContext(r)
		defer cancel()

		var submitErr error
		pledgeResult, submitErr = h.cantonClient.SubmitPledge(cantonCtx, canton.PledgeCommand{
			PoolContractID:         property.CantonPoolContractID,
			BuyerPartyID:           buyerPartyID,
			SlotCount:              request.SlotCount,
			MetaURI:                metaURI,
			PaymentAssetContractID: paymentAssetContractID,
			CommandID:              commandID,
		})
		if submitErr != nil {
			status, code, detail := canton.ProblemForSubmitError(submitErr)
			problems.WriteCode(w, status, code, http.StatusText(status), detail)
			return
		}
	}

	paymentMethod := db.PledgePaymentMethodTUSDC
	pledge, err := h.store.InsertConfirmedNativePledge(r.Context(), db.NativePledgeRecord{
		UserID:                 userID,
		PropertyID:             propertyID,
		Units:                  request.SlotCount,
		Amount:                 formatAmount(amount),
		Currency:               h.pledgeCurrency,
		PaymentMethod:          paymentMethod,
		PaymentAssetContractID: paymentAssetContractID,
		IdempotencyKey:         idempotencyKey,
		CantonCommandID:        pledgeResult.CommandID,
		CantonUpdateID:         pledgeResult.UpdateID,
	})
	if errors.Is(err, db.ErrDuplicateIdempotencyKey) {
		problems.WriteCode(w, http.StatusConflict, "RV-3007", "Conflict", "Duplicate idempotency key")
		return
	}
	if errors.Is(err, db.ErrPropertyPoolUnavailable) || errors.Is(err, db.ErrInsufficientPoolCapacity) {
		problems.WriteCode(w, http.StatusConflict, "RV-3001", "Conflict", "Property pool changed before pledge could be recorded")
		return
	}
	if err != nil {
		problems.WriteCode(
			w,
			http.StatusInternalServerError,
			"RV-9003",
			"Internal Server Error",
			"Pledge settled on Canton but database sync failed",
		)
		return
	}

	if archiveErr := h.store.ArchiveUserTokenAssets(r.Context(), []string{paymentAssetContractID}); archiveErr != nil {
		problems.WriteCode(
			w,
			http.StatusInternalServerError,
			"RV-9003",
			"Internal Server Error",
			"Pledge confirmed but payment asset index sync failed",
		)
		return
	}

	for _, nftContractID := range pledgeResult.NFTContractIDs {
		if insertErr := h.store.InsertMintedNFT(r.Context(), db.MintedNFT{
			PropertyID:       propertyID,
			OwnerID:          userID,
			PledgeID:         &pledge.ID,
			CantonContractID: nftContractID,
			TokenID:          nftContractID,
			ShareUnits:       1,
		}); insertErr != nil {
			problems.WriteCode(
				w,
				http.StatusInternalServerError,
				"RV-9003",
				"Internal Server Error",
				"Pledge confirmed but NFT indexing failed",
			)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createPledgeResponse{
		Pledge:               *pledge,
		CantonCommandID:      pledgeResult.CommandID,
		CantonUpdateID:       pledgeResult.UpdateID,
		PoolContractID:       coalesceNonEmpty(pledgeResult.PoolContractID, property.CantonPoolContractID),
		PaymentAssetContract: coalesceNonEmpty(pledgeResult.PaymentAssetCID, paymentAssetContractID),
		MintedNFTContractIDs: pledgeResult.NFTContractIDs,
	})
}

func (h *PledgesHandler) FlutterwaveWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST for Flutterwave webhooks")
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		problems.Write(w, http.StatusBadRequest, "Bad Request", "Unable to read webhook body")
		return
	}

	if h.webhookSecret == "" {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Webhook secret is not configured")
		return
	}

	signature := strings.TrimSpace(r.Header.Get(flutterwaveSignatureHeader))
	if !verifyFlutterwaveSignature(body, signature, h.webhookSecret) {
		problems.WriteCode(w, http.StatusUnauthorized, "RV-3001", "Unauthorized", "Invalid Flutterwave webhook signature")
		return
	}

	var payload flutterwaveWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-3002", "Bad Request", "Webhook body must be valid JSON")
		return
	}

	if payload.Event != "charge.completed" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ignored"})
		return
	}

	if !strings.EqualFold(payload.Data.Status, "successful") {
		problems.WriteCode(w, http.StatusBadRequest, "RV-3003", "Bad Request", "Payment was not successful")
		return
	}

	idempotencyKey := strings.TrimSpace(payload.Data.TxRef)
	if idempotencyKey == "" {
		problems.WriteCode(w, http.StatusBadRequest, "RV-3004", "Bad Request", "tx_ref is required")
		return
	}

	existing, err := h.store.GetPledgeByIdempotencyKey(r.Context(), idempotencyKey)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load pledge")
		return
	}
	if existing != nil && existing.Status == "confirmed" {
		writeWebhookSuccess(w, existing, true)
		return
	}

	confirmed, duplicate, err := h.store.ConfirmPledgeByIdempotencyKey(r.Context(), idempotencyKey)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to confirm pledge")
		return
	}
	if confirmed == nil {
		problems.WriteCode(w, http.StatusNotFound, "RV-3005", "Not Found", "Pledge not found for tx_ref")
		return
	}

	writeWebhookSuccess(w, confirmed, duplicate)
}

func (h *PledgesHandler) authenticate(r *http.Request) (string, error) {
	token, err := auth.ExtractBearerToken(r)
	if err != nil {
		return "", fmt.Errorf("authorization: %w", err)
	}

	return h.privyVerifier.Verify(r.Context(), token)
}

func writeAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, privy.ErrTokenExpired):
		problems.WriteCode(w, http.StatusUnauthorized, "RV-1002", "Unauthorized", "Privy access token has expired")
	case errors.Is(err, privy.ErrTokenInvalid), errors.Is(err, privy.ErrSubjectMissing):
		problems.WriteCode(w, http.StatusUnauthorized, "RV-1003", "Unauthorized", "Privy access token is invalid")
	default:
		if strings.Contains(err.Error(), "authorization") {
			problems.WriteCode(w, http.StatusUnauthorized, "RV-1001", "Unauthorized", err.Error())
			return
		}
		problems.WriteCode(w, http.StatusUnauthorized, "RV-1003", "Unauthorized", "Unable to authenticate request")
	}
}

func verifyFlutterwaveSignature(body []byte, signature string, secret string) bool {
	if signature == "" {
		return false
	}

	mac := hmac.New(sha512.New, []byte(secret))
	_, _ = mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	return subtle.ConstantTimeCompare([]byte(strings.ToLower(signature)), []byte(strings.ToLower(expected))) == 1
}

func writeWebhookSuccess(w http.ResponseWriter, pledge *db.Pledge, duplicate bool) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(webhookResponse{
		Pledge:    *pledge,
		Duplicate: duplicate,
	})
}

func formatAmount(value float64) string {
	return strconv.FormatFloat(math.Round(value*100)/100, 'f', 2, 64)
}

func pledgeCantonContext(r *http.Request) (context.Context, context.CancelFunc) {
	timeout := 60 * time.Second
	if deadline, ok := r.Context().Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining > 0 && remaining < timeout {
			timeout = remaining
		}
	}
	return context.WithTimeout(r.Context(), timeout)
}

func coalesceNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
