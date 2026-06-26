package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/problems"
)

const (
	defaultFaucetUSDCAmount = "100000.0"
	defaultFaucetRateWindow = 24 * time.Hour
)

type FaucetHandler struct {
	store        *db.Store
	cantonClient *canton.Client
	mintAmount   string
	rateWindow   time.Duration
	issuerCID    string
}

func NewFaucetHandler(store *db.Store, cantonClient *canton.Client) *FaucetHandler {
	mintAmount := strings.TrimSpace(os.Getenv("FAUCET_USDC_AMOUNT"))
	if mintAmount == "" {
		mintAmount = defaultFaucetUSDCAmount
	}

	rateWindow := defaultFaucetRateWindow
	if raw := strings.TrimSpace(os.Getenv("FAUCET_RATE_LIMIT_WINDOW")); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
			rateWindow = parsed
		}
	}

	return &FaucetHandler{
		store:        store,
		cantonClient: cantonClient,
		mintAmount:   mintAmount,
		rateWindow:   rateWindow,
		issuerCID:    strings.TrimSpace(os.Getenv("CANTON_USDC_ISSUER_CONTRACT_ID")),
	}
}

type claimUSDCRequest struct {
	CantonPartyID string `json:"canton_party_id"`
}

type listFaucetAssetsResponse struct {
	Assets []db.UserTokenAsset `json:"assets"`
}

type claimUSDCResponse struct {
	Amount                  string    `json:"amount"`
	Symbol                  string    `json:"symbol"`
	CantonPartyID           string    `json:"canton_party_id"`
	CantonHoldingContractID string    `json:"canton_holding_contract_id,omitempty"`
	CantonCommandID         string    `json:"canton_command_id"`
	ClaimedAt               time.Time `json:"claimed_at"`
}

type prepareFaucetClaimResponse struct {
	Amount            string `json:"amount"`
	Symbol            string `json:"symbol"`
	CantonPartyID     string `json:"canton_party_id"`
	AdminPartyID      string `json:"admin_party_id"`
	IssuerContractID  string `json:"issuer_contract_id"`
	TemplateID        string `json:"template_id"`
	CommandID         string `json:"command_id"`
}

type completeFaucetClaimRequest struct {
	CantonPartyID           string `json:"canton_party_id"`
	CantonCommandID         string `json:"canton_command_id"`
	CantonUpdateID          string `json:"canton_update_id,omitempty"`
	CantonHoldingContractID string `json:"canton_holding_contract_id,omitempty"`
}

func (h *FaucetHandler) PrepareClaim(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to prepare a Loop-signed faucet claim")
		return
	}

	if h.cantonClient == nil || !h.cantonClient.USDCIssuerConfigured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-5001", "Service Unavailable", "Test USDC faucet is not configured on this deployment")
		return
	}

	cantonPartyID, err := h.resolveCantonPartyID(r)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	if err := h.ensureFaucetEligible(r.Context(), cantonPartyID); err != nil {
		h.writeFaucetEligibilityError(w, err)
		return
	}

	cantonCtx, cancel := contextWithTimeout(r, 30*time.Second)
	defer cancel()

	issuerContractID, err := h.cantonClient.RefreshUSDCIssuer(cantonCtx)
	if err != nil {
		if fallback := strings.TrimSpace(h.issuerCID); fallback != "" {
			issuerContractID = fallback
		} else {
			problems.WriteCode(w, http.StatusBadGateway, "RV-4002", "Bad Gateway", "Unable to resolve test USDC issuer on Canton")
			return
		}
	}

	commandID := fmt.Sprintf("faucet-%s-%d", cantonPartyID, time.Now().UnixNano())

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(prepareFaucetClaimResponse{
		Amount:           h.mintAmount,
		Symbol:           "tUSDC",
		CantonPartyID:    cantonPartyID,
		AdminPartyID:     h.cantonClient.AdminPartyID(),
		IssuerContractID: issuerContractID,
		TemplateID:       h.cantonClient.TemplateUSDCIssuerID(),
		CommandID:        commandID,
	})
}

func (h *FaucetHandler) CompleteClaim(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to finalize a Loop-signed faucet claim")
		return
	}

	cantonPartyID, err := h.resolveCantonPartyID(r)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	var body completeFaucetClaimRequest
	if r.Body != nil {
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if decodeErr := decoder.Decode(&body); decodeErr != nil && !errors.Is(decodeErr, io.EOF) {
			problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", "request body must include canton_command_id")
			return
		}
	}

	commandID := strings.TrimSpace(body.CantonCommandID)
	if commandID == "" {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", "canton_command_id is required")
		return
	}

	releaseLock, err := h.store.TryFaucetUserLock(r.Context(), cantonPartyID)
	if errors.Is(err, db.ErrFaucetRateLimited) {
		problems.WriteCode(w, http.StatusTooManyRequests, "RV-4291", "Too Many Requests", "Faucet rate limit exceeded")
		return
	}
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to process faucet claim")
		return
	}
	defer func() {
		_ = releaseLock(r.Context())
	}()

	claimedRecently, lastClaim, err := h.store.HasRecentFaucetClaim(r.Context(), cantonPartyID, h.rateWindow)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to verify faucet eligibility")
		return
	}
	if claimedRecently {
		retryAfter := h.rateWindow - time.Since(lastClaim)
		if retryAfter < 0 {
			retryAfter = 0
		}
		w.Header().Set("Retry-After", fmt.Sprintf("%d", int(retryAfter.Seconds())))
		problems.WriteCode(w, http.StatusTooManyRequests, "RV-4291", "Too Many Requests", fmt.Sprintf("Faucet rate limit exceeded; next claim available in %s", retryAfter.Round(time.Minute)))
		return
	}

	issuerContractID := ""
	if h.cantonClient != nil {
		issuerContractID = h.cantonClient.USDCIssuerContractID()
	}

	audit, err := h.store.InsertFaucetClaimAudit(r.Context(), cantonPartyID, db.FaucetClaimEventData{
		Amount:           h.mintAmount,
		CantonPartyID:    cantonPartyID,
		CantonCommandID:  commandID,
		CantonUpdateID:   strings.TrimSpace(body.CantonUpdateID),
		CantonHoldingCID: strings.TrimSpace(body.CantonHoldingContractID),
		CantonIssuerCID:  issuerContractID,
	})
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to record faucet claim")
		return
	}

	holdingCID := strings.TrimSpace(body.CantonHoldingContractID)
	if holdingCID != "" {
		if upsertErr := h.store.UpsertUserTokenAsset(
			r.Context(),
			cantonPartyID,
			holdingCID,
			cantonPartyID,
			h.mintAmount,
			"tUSDC",
			"tUSDC",
		); upsertErr != nil {
			problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Claim succeeded but asset indexing failed")
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(claimUSDCResponse{
		Amount:                  h.mintAmount,
		Symbol:                  "tUSDC",
		CantonPartyID:           cantonPartyID,
		CantonHoldingContractID: holdingCID,
		CantonCommandID:         commandID,
		ClaimedAt:               audit.CreatedAt,
	})
}

func (h *FaucetHandler) ensureFaucetEligible(ctx context.Context, cantonPartyID string) error {
	claimedRecently, lastClaim, err := h.store.HasRecentFaucetClaim(ctx, cantonPartyID, h.rateWindow)
	if err != nil {
		return fmt.Errorf("verify faucet eligibility: %w", err)
	}
	if claimedRecently {
		retryAfter := h.rateWindow - time.Since(lastClaim)
		if retryAfter < 0 {
			retryAfter = 0
		}
		return &faucetRateLimitError{retryAfter: retryAfter}
	}
	return nil
}

type faucetRateLimitError struct {
	retryAfter time.Duration
}

func (e *faucetRateLimitError) Error() string {
	return fmt.Sprintf("faucet rate limit exceeded; retry in %s", e.retryAfter.Round(time.Minute))
}

func (h *FaucetHandler) writeFaucetEligibilityError(w http.ResponseWriter, err error) {
	var rateErr *faucetRateLimitError
	if errors.As(err, &rateErr) {
		w.Header().Set("Retry-After", fmt.Sprintf("%d", int(rateErr.retryAfter.Seconds())))
		problems.WriteCode(w, http.StatusTooManyRequests, "RV-4291", "Too Many Requests", rateErr.Error())
		return
	}
	problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to verify faucet eligibility")
}

func (h *FaucetHandler) ListAssetsByParty(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use GET to list faucet assets for a Loop party")
		return
	}

	partyID, err := resolveCantonPartyIDFromQuery(r)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	assets, err := h.store.ListTokenAssetsByOwnerParty(r.Context(), partyID)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load token assets")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(listFaucetAssetsResponse{Assets: assets})
}

func (h *FaucetHandler) ClaimUSDC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to claim DevNet test USDC")
		return
	}

	if h.cantonClient == nil || !h.cantonClient.USDCIssuerConfigured() {
		problems.WriteCode(
			w,
			http.StatusServiceUnavailable,
			"RV-5001",
			"Service Unavailable",
			"Test USDC faucet is not configured on this deployment",
		)
		return
	}

	cantonPartyID, err := h.resolveCantonPartyID(r)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	if err := h.ensureFaucetEligible(r.Context(), cantonPartyID); err != nil {
		h.writeFaucetEligibilityError(w, err)
		return
	}

	releaseLock, err := h.store.TryFaucetUserLock(r.Context(), cantonPartyID)
	if errors.Is(err, db.ErrFaucetRateLimited) {
		problems.WriteCode(
			w,
			http.StatusTooManyRequests,
			"RV-4291",
			"Too Many Requests",
			"Faucet rate limit exceeded",
		)
		return
	}
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to process faucet claim")
		return
	}
	defer func() {
		_ = releaseLock(r.Context())
	}()

	cantonCtx, cancel := contextWithTimeout(r, 45*time.Second)
	defer cancel()

	mintResult, err := h.cantonClient.SubmitMint(cantonCtx, canton.MintCommand{
		OwnerPartyID: cantonPartyID,
		Amount:       h.mintAmount,
		Observers:    []string{},
		CommandID:    fmt.Sprintf("faucet-%s-%d", cantonPartyID, time.Now().UnixNano()),
	})
	if err != nil {
		problems.WriteCode(
			w,
			http.StatusBadGateway,
			"RV-4002",
			"Bad Gateway",
			"Failed to mint test USDC on Canton",
		)
		return
	}

	audit, err := h.store.InsertFaucetClaimAudit(r.Context(), cantonPartyID, db.FaucetClaimEventData{
		Amount:              h.mintAmount,
		CantonPartyID:       cantonPartyID,
		CantonCommandID:     mintResult.CommandID,
		CantonUpdateID:      mintResult.UpdateID,
		CantonHoldingCID:    mintResult.HoldingContractID,
		CantonIssuerCID:     h.cantonClient.USDCIssuerContractID(),
	})
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Mint succeeded but audit logging failed")
		return
	}

	if mintResult.HoldingContractID != "" {
		if upsertErr := h.store.UpsertUserTokenAsset(
			r.Context(),
			cantonPartyID,
			mintResult.HoldingContractID,
			cantonPartyID,
			h.mintAmount,
			"tUSDC",
			"tUSDC",
		); upsertErr != nil {
			problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Mint succeeded but asset indexing failed")
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(claimUSDCResponse{
		Amount:                  h.mintAmount,
		Symbol:                  "tUSDC",
		CantonPartyID:           cantonPartyID,
		CantonHoldingContractID: mintResult.HoldingContractID,
		CantonCommandID:         mintResult.CommandID,
		ClaimedAt:               audit.CreatedAt,
	})
}

func (h *FaucetHandler) resolveCantonPartyID(r *http.Request) (string, error) {
	if header := strings.TrimSpace(r.Header.Get("X-Canton-Party-Id")); header != "" {
		return validateCantonPartyID(header)
	}

	var body claimUSDCRequest
	if r.Body != nil {
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&body); err != nil && !errors.Is(err, io.EOF) {
			return "", fmt.Errorf("request body must include canton_party_id")
		}
	}

	if partyID := strings.TrimSpace(body.CantonPartyID); partyID != "" {
		return validateCantonPartyID(partyID)
	}

	return "", fmt.Errorf("canton_party_id is required (JSON body or X-Canton-Party-Id header)")
}

func resolveCantonPartyIDFromQuery(r *http.Request) (string, error) {
	partyID := strings.TrimSpace(r.URL.Query().Get("canton_party_id"))
	if partyID == "" {
		return "", fmt.Errorf("canton_party_id query parameter is required")
	}

	return validateCantonPartyID(partyID)
}

func validateCantonPartyID(partyID string) (string, error) {
	trimmed := strings.TrimSpace(partyID)
	if trimmed == "" {
		return "", fmt.Errorf("canton_party_id must not be empty")
	}
	if !strings.Contains(trimmed, "::") {
		return "", fmt.Errorf("canton_party_id must be a valid Canton party identifier")
	}

	return trimmed, nil
}

func contextWithTimeout(r *http.Request, timeout time.Duration) (context.Context, context.CancelFunc) {
	if deadline, ok := r.Context().Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining > 0 && remaining < timeout {
			timeout = remaining
		}
	}
	return context.WithTimeout(r.Context(), timeout)
}
