package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/internal/problems"
)

type LedgerReadHandler struct {
	reader *canton.LedgerReader
}

func NewLedgerReadHandler(client *canton.Client) *LedgerReadHandler {
	if client == nil {
		return &LedgerReadHandler{}
	}
	return &LedgerReadHandler{reader: canton.NewLedgerReader(client)}
}

type ledgerPropertiesResponse struct {
	Properties []canton.PropertyPoolContract `json:"properties"`
	Count      int                           `json:"count"`
}

type ledgerEscrowsResponse struct {
	PartyID string              `json:"party_id"`
	Escrows []canton.EscrowView `json:"escrows"`
	Count   int                 `json:"count"`
}

type ledgerUserNFTsResponse struct {
	PartyID      string                      `json:"party_id"`
	Tokens       []canton.UserEquityTokenView `json:"tokens"`
	NFTs         []canton.PropertyNFTContract `json:"nfts"`
	Count        int                         `json:"count"`
	PendingYield string                      `json:"total_pending_yield"`
	Currency     string                      `json:"currency,omitempty"`
}

func (h *LedgerReadHandler) ListLedgerProperties(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use GET to list on-ledger property pools")
		return
	}
	if h.reader == nil || !h.reader.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	pools, err := h.reader.ListPropertyPools(r.Context())
	if err != nil {
		status, code, detail := canton.ProblemForLedgerQuery(err)
		problems.WriteCode(w, status, code, http.StatusText(status), detail)
		return
	}

	writeLedgerJSON(w, http.StatusOK, ledgerPropertiesResponse{
		Properties: pools,
		Count:      len(pools),
	})
}

func (h *LedgerReadHandler) ListEscrowsByParty(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use GET to list escrowed pledges for a party")
		return
	}
	if h.reader == nil || !h.reader.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	partyID, err := partyIDFromEscrowsPath(r.URL.Path)
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	escrows, err := h.reader.ListEscrowsForParty(r.Context(), partyID)
	if err != nil {
		status, code, detail := canton.ProblemForLedgerQuery(err)
		problems.WriteCode(w, status, code, http.StatusText(status), detail)
		return
	}

	writeLedgerJSON(w, http.StatusOK, ledgerEscrowsResponse{
		PartyID: partyID,
		Escrows: escrows,
		Count:   len(escrows),
	})
}

// ListUserNFTs returns on-ledger PropertyNFT equity tokens held by the given party.
func (h *LedgerReadHandler) ListUserNFTs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use GET to list on-ledger equity tokens for a party")
		return
	}
	if h.reader == nil || !h.reader.Configured() {
		problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9003", "Service Unavailable", "Canton ledger integration is not configured")
		return
	}

	partyID, err := partyIDFromPrefixedPath(r.URL.Path, "/api/nfts/")
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", err.Error())
		return
	}

	nfts, err := h.reader.ListUserEquityTokens(r.Context(), partyID)
	if err != nil {
		status, code, detail := canton.ProblemForLedgerQuery(err)
		problems.WriteCode(w, status, code, http.StatusText(status), detail)
		return
	}

	poolSlots := h.poolTotalSlotsByID(r, nfts)
	tokens := make([]canton.UserEquityTokenView, 0, len(nfts))
	var totalPending float64
	currency := ""

	for _, nft := range nfts {
		totalSlots := poolSlots[nft.Payload.PoolID]
		tokens = append(tokens, canton.ToUserEquityTokenView(nft, totalSlots))
		if nft.Payload.Currency != "" && currency == "" {
			currency = nft.Payload.Currency
		}
		if parsed, parseErr := strconv.ParseFloat(strings.TrimSpace(nft.Payload.PendingYield), 64); parseErr == nil {
			totalPending += parsed
		}
	}

	writeLedgerJSON(w, http.StatusOK, ledgerUserNFTsResponse{
		PartyID:      partyID,
		Tokens:       tokens,
		NFTs:         nfts,
		Count:        len(nfts),
		PendingYield: formatDecimalString(totalPending),
		Currency:     currency,
	})
}

func (h *LedgerReadHandler) poolTotalSlotsByID(r *http.Request, nfts []canton.PropertyNFTContract) map[string]int {
	slots := make(map[string]int)
	if len(nfts) == 0 {
		return slots
	}

	pools, err := h.reader.ListPropertyPools(r.Context())
	if err != nil {
		return slots
	}

	for _, pool := range pools {
		slots[pool.Payload.PoolID] = pool.Payload.TotalSlots
	}
	return slots
}

func formatDecimalString(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func partyIDFromEscrowsPath(path string) (string, error) {
	return partyIDFromPrefixedPath(path, "/api/escrows/")
}

func partyIDFromPrefixedPath(path, prefix string) (string, error) {
	if !strings.HasPrefix(path, prefix) {
		return "", &pathError{msg: "path must be " + prefix + "{partyId}"}
	}
	raw := strings.TrimSpace(path[len(prefix):])
	if raw == "" {
		return "", &pathError{msg: "path must be " + prefix + "{partyId}"}
	}
	decoded, err := url.PathUnescape(raw)
	if err != nil {
		return "", &pathError{msg: "path must be " + prefix + "{partyId}"}
	}
	decoded = strings.TrimSpace(decoded)
	if decoded == "" {
		return "", &pathError{msg: "path must be " + prefix + "{partyId}"}
	}
	return decoded, nil
}

type pathError struct {
	msg string
}

func (e *pathError) Error() string {
	return e.msg
}

func writeLedgerJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
