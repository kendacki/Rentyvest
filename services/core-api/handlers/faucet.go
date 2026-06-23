package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/internal/auth"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/privy"
	"github.com/rentyvest/core-api/internal/problems"
)

const (
	defaultFaucetUSDCAmount = "100000.0"
	defaultFaucetRateWindow = 24 * time.Hour
)

type FaucetHandler struct {
	store         *db.Store
	privyVerifier *privy.Verifier
	cantonClient  *canton.Client
	mintAmount    string
	rateWindow    time.Duration
	issuerCID     string
}

func NewFaucetHandler(store *db.Store, verifier *privy.Verifier, cantonClient *canton.Client) *FaucetHandler {
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
		store:         store,
		privyVerifier: verifier,
		cantonClient:  cantonClient,
		mintAmount:    mintAmount,
		rateWindow:    rateWindow,
		issuerCID:     strings.TrimSpace(os.Getenv("CANTON_USDC_ISSUER_CONTRACT_ID")),
	}
}

type claimUSDCResponse struct {
	Amount                  string    `json:"amount"`
	Symbol                  string    `json:"symbol"`
	CantonPartyID           string    `json:"canton_party_id"`
	CantonHoldingContractID string    `json:"canton_holding_contract_id,omitempty"`
	CantonCommandID         string    `json:"canton_command_id"`
	ClaimedAt               time.Time `json:"claimed_at"`
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

	userID, err := h.authenticate(r)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	releaseLock, err := h.store.TryFaucetUserLock(r.Context(), userID)
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

	claimedRecently, lastClaim, err := h.store.HasRecentFaucetClaim(r.Context(), userID, h.rateWindow)
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
		problems.WriteCode(
			w,
			http.StatusTooManyRequests,
			"RV-4291",
			"Too Many Requests",
			fmt.Sprintf("Faucet rate limit exceeded; next claim available in %s", retryAfter.Round(time.Minute)),
		)
		return
	}

	cantonPartyID, err := h.store.GetUserCantonPartyID(r.Context(), userID)
	if errors.Is(err, db.ErrUserCantonPartyMissing) {
		problems.WriteCode(
			w,
			http.StatusBadRequest,
			"RV-4001",
			"Bad Request",
			"User does not have a Canton party ID configured",
		)
		return
	}
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to resolve Canton party ID")
		return
	}

	cantonCtx, cancel := contextWithTimeout(r, 45*time.Second)
	defer cancel()

	mintResult, err := h.cantonClient.SubmitMint(cantonCtx, canton.MintCommand{
		IssuerContractID: h.issuerCID,
		OwnerPartyID:     cantonPartyID,
		Amount:           h.mintAmount,
		Observers:        []string{},
		CommandID:        fmt.Sprintf("faucet-%s-%d", userID, time.Now().UnixNano()),
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

	audit, err := h.store.InsertFaucetClaimAudit(r.Context(), userID, db.FaucetClaimEventData{
		Amount:              h.mintAmount,
		CantonPartyID:       cantonPartyID,
		CantonCommandID:     mintResult.CommandID,
		CantonUpdateID:      mintResult.UpdateID,
		CantonHoldingCID:    mintResult.HoldingContractID,
		CantonIssuerCID:     h.issuerCID,
	})
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Mint succeeded but audit logging failed")
		return
	}

	if mintResult.HoldingContractID != "" {
		if upsertErr := h.store.UpsertUserTokenAsset(
			r.Context(),
			userID,
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

func (h *FaucetHandler) authenticate(r *http.Request) (string, error) {
	token, err := auth.ExtractBearerToken(r)
	if err != nil {
		return "", fmt.Errorf("authorization: %w", err)
	}

	return h.privyVerifier.Verify(r.Context(), token)
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
