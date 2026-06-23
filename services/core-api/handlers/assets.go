package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/internal/auth"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/privy"
	"github.com/rentyvest/core-api/internal/problems"
)

type AssetsHandler struct {
	store         *db.Store
	privyVerifier *privy.Verifier
	cantonClient  *canton.Client
}

func NewAssetsHandler(store *db.Store, verifier *privy.Verifier, cantonClient *canton.Client) *AssetsHandler {
	return &AssetsHandler{
		store:         store,
		privyVerifier: verifier,
		cantonClient:  cantonClient,
	}
}

type listAssetsResponse struct {
	Assets []db.UserTokenAsset `json:"assets"`
}

type mergeAssetsResponse struct {
	MergedContractID string   `json:"merged_contract_id"`
	ArchivedIDs      []string `json:"archived_contract_ids"`
	CantonCommandID  string   `json:"canton_command_id,omitempty"`
}

func (h *AssetsHandler) ListAssets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use GET to list token assets")
		return
	}

	userID, err := h.authenticate(r)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	assets, err := h.store.ListUserTokenAssets(r.Context(), userID)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load token assets")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(listAssetsResponse{Assets: assets})
}

func (h *AssetsHandler) MergeAssets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to merge token assets")
		return
	}

	userID, err := h.authenticate(r)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	if h.cantonClient == nil || !h.cantonClient.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	ownerPartyID, err := h.store.GetUserCantonPartyID(r.Context(), userID)
	if errors.Is(err, db.ErrUserCantonPartyMissing) {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", "User does not have a Canton party ID configured")
		return
	}
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to resolve Canton party ID")
		return
	}

	assets, err := h.store.ListUserTokenAssets(r.Context(), userID)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load token assets")
		return
	}
	if len(assets) < 2 {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4011", "Bad Request", "At least two unlocked assets are required to merge")
		return
	}

	contractIDs := make([]string, 0, len(assets))
	for _, asset := range assets {
		contractIDs = append(contractIDs, asset.CantonContractID)
	}

	cantonCtx, cancel := pledgeCantonContext(r)
	defer cancel()

	mergeResult, err := h.cantonClient.SubmitMergeAssets(cantonCtx, canton.MergeAssetsCommand{
		OwnerPartyID: ownerPartyID,
		ContractIDs:  contractIDs,
	})
	if err != nil {
		status, code, detail := canton.ProblemForSubmitError(err)
		problems.WriteCode(w, status, code, http.StatusText(status), detail)
		return
	}

	totalBalance := sumAssetBalances(assets)

	if err := h.store.ArchiveUserTokenAssets(r.Context(), contractIDs); err != nil {
		problems.WriteCode(w, http.StatusInternalServerError, "RV-9003", "Internal Server Error", "Assets merged on Canton but database sync failed")
		return
	}

	if err := h.store.UpsertUserTokenAsset(
		r.Context(),
		userID,
		mergeResult.MergedContractID,
		ownerPartyID,
		totalBalance,
		"tUSDC",
		"tUSDC",
	); err != nil {
		problems.WriteCode(w, http.StatusInternalServerError, "RV-9003", "Internal Server Error", "Assets merged on Canton but database sync failed")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(mergeAssetsResponse{
		MergedContractID: mergeResult.MergedContractID,
		ArchivedIDs:      contractIDs,
		CantonCommandID:  mergeResult.CommandID,
	})
}

func sumAssetBalances(assets []db.UserTokenAsset) string {
	total := 0.0
	for _, asset := range assets {
		value, err := strconv.ParseFloat(asset.Balance, 64)
		if err == nil {
			total += value
		}
	}
	return strconv.FormatFloat(total, 'f', -1, 64)
}

func (h *AssetsHandler) authenticate(r *http.Request) (string, error) {
	token, err := auth.ExtractBearerToken(r)
	if err != nil {
		return "", fmt.Errorf("authorization: %w", err)
	}
	return h.privyVerifier.Verify(r.Context(), token)
}
