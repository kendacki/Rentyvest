package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/rentyvest/core-api/internal/privy"
	"github.com/rentyvest/core-api/internal/problems"
	supabaseauth "github.com/rentyvest/core-api/internal/supabase"
)

type cantonTokenSource interface {
	AccessToken(ctx context.Context) (string, error)
}

type AuthHandler struct {
	privyVerifier     *privy.Verifier
	supabaseJWTSecret string
	cantonTokenSource cantonTokenSource
}

func NewAuthHandler(privyVerifier *privy.Verifier, supabaseJWTSecret string, cantonTokenSource cantonTokenSource) *AuthHandler {
	return &AuthHandler{
		privyVerifier:     privyVerifier,
		supabaseJWTSecret: supabaseJWTSecret,
		cantonTokenSource: cantonTokenSource,
	}
}

type exchangeTokenRequest struct {
	PrivyToken string `json:"privy_token"`
}

type exchangeTokenResponse struct {
	SupabaseToken     string `json:"supabase_token"`
	CantonLedgerToken string `json:"canton_ledger_token,omitempty"`
}

func (h *AuthHandler) Exchange(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST for token exchange")
		return
	}

	privyToken, err := extractPrivyToken(r)
	if err != nil {
		problems.Write(w, http.StatusBadRequest, "Bad Request", err.Error())
		return
	}

	subject, err := h.privyVerifier.Verify(r.Context(), privyToken)
	if err != nil {
		switch {
		case errors.Is(err, privy.ErrTokenMissing):
			problems.Write(w, http.StatusBadRequest, "Bad Request", "A Privy access token is required in the Authorization header or request body")
		case errors.Is(err, privy.ErrTokenExpired):
			problems.Write(w, http.StatusUnauthorized, "Unauthorized", "Privy access token has expired")
		case errors.Is(err, privy.ErrTokenInvalid), errors.Is(err, privy.ErrSubjectMissing):
			problems.Write(w, http.StatusUnauthorized, "Unauthorized", "Privy access token is invalid")
		default:
			problems.Write(w, http.StatusBadGateway, "Bad Gateway", "Unable to verify Privy access token")
		}
		return
	}

	supabaseToken, err := supabaseauth.MintToken(h.supabaseJWTSecret, subject)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to mint Supabase access token")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(exchangeTokenResponse{
		SupabaseToken:     supabaseToken,
		CantonLedgerToken: h.resolveCantonLedgerToken(r.Context()),
	})
}

func (h *AuthHandler) resolveCantonLedgerToken(ctx context.Context) string {
	if h.cantonTokenSource != nil {
		token, err := h.cantonTokenSource.AccessToken(ctx)
		if err == nil {
			if trimmed := strings.TrimSpace(token); trimmed != "" {
				return trimmed
			}
		}
	}

	return resolveCantonLedgerTokenFromEnv()
}

func resolveCantonLedgerTokenFromEnv() string {
	for _, key := range []string{
		"CANTON_LEDGER_TOKEN",
		"CANTON_ADMIN_TOKEN",
		"CANTON_JWT",
	} {
		if token := strings.TrimSpace(os.Getenv(key)); token != "" {
			return token
		}
	}

	return ""
}

func extractPrivyToken(r *http.Request) (string, error) {
	if authHeader := strings.TrimSpace(r.Header.Get("Authorization")); authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return "", errors.New("Authorization header must use the Bearer scheme")
		}

		token := strings.TrimSpace(parts[1])
		if token != "" {
			return token, nil
		}
	}

	var body exchangeTokenRequest
	if r.Body != nil {
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&body); err != nil && !errors.Is(err, io.EOF) {
			return "", errors.New("request body must be valid JSON with an optional privy_token field")
		}
	}

	token := strings.TrimSpace(body.PrivyToken)
	if token == "" {
		return "", errors.New("a Privy access token is required in the Authorization header or privy_token field")
	}

	return token, nil
}
