package canton

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	defaultM2MScope          = "daml_ledger_api"
	defaultM2MRefreshEvery   = 7 * time.Hour
	m2mRefreshLeadTime       = time.Minute
)

// TokenSource supplies Bearer tokens for Canton JSON Ledger API requests.
type TokenSource interface {
	AccessToken(ctx context.Context) (string, error)
}

// M2MTokenManager fetches and caches OAuth2 client-credentials tokens for the
// 5N Sandbox validator ledger API.
type M2MTokenManager struct {
	oauthURL     string
	clientID     string
	clientSecret string
	audience     string
	scope        string
	refreshEvery time.Duration
	httpClient   *http.Client

	mu        sync.RWMutex
	token     string
	expiresAt time.Time
}

type oauthTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// NewM2MTokenManagerFromEnv builds a manager when CANTON_OAUTH_URL is set.
func NewM2MTokenManagerFromEnv() (*M2MTokenManager, error) {
	oauthURL := strings.TrimSpace(os.Getenv("CANTON_OAUTH_URL"))
	if oauthURL == "" {
		return nil, nil
	}

	clientID := strings.TrimSpace(os.Getenv("CANTON_CLIENT_ID"))
	if clientID == "" {
		return nil, fmt.Errorf("CANTON_CLIENT_ID is required when CANTON_OAUTH_URL is set")
	}

	clientSecret := strings.TrimSpace(os.Getenv("CANTON_CLIENT_SECRET"))
	if clientSecret == "" {
		return nil, fmt.Errorf("CANTON_CLIENT_SECRET is required when CANTON_OAUTH_URL is set")
	}

	audience := strings.TrimSpace(os.Getenv("CANTON_AUDIENCE"))
	if audience == "" {
		return nil, fmt.Errorf("CANTON_AUDIENCE is required when CANTON_OAUTH_URL is set")
	}

	scope := strings.TrimSpace(os.Getenv("CANTON_OAUTH_SCOPE"))
	if scope == "" {
		scope = defaultM2MScope
	}

	refreshEvery := defaultM2MRefreshEvery
	if raw := strings.TrimSpace(os.Getenv("CANTON_M2M_REFRESH_INTERVAL")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil {
			return nil, fmt.Errorf("parse CANTON_M2M_REFRESH_INTERVAL: %w", err)
		}
		if parsed > 0 {
			refreshEvery = parsed
		}
	}

	return &M2MTokenManager{
		oauthURL:     oauthURL,
		clientID:     clientID,
		clientSecret: clientSecret,
		audience:     audience,
		scope:        scope,
		refreshEvery: refreshEvery,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// Start refreshes the token on a fixed interval until ctx is cancelled.
func (m *M2MTokenManager) Start(ctx context.Context) {
	if m == nil {
		return
	}

	ticker := time.NewTicker(m.refreshEvery)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_, _ = m.refresh(ctx)
		}
	}
}

// AccessToken returns a cached bearer token, refreshing when missing or expired.
func (m *M2MTokenManager) AccessToken(ctx context.Context) (string, error) {
	if m == nil {
		return "", fmt.Errorf("canton m2m token manager is not configured")
	}

	m.mu.RLock()
	token := m.token
	expiresAt := m.expiresAt
	m.mu.RUnlock()

	if token != "" && time.Now().Before(expiresAt.Add(-m2mRefreshLeadTime)) {
		return token, nil
	}

	return m.refresh(ctx)
}

func (m *M2MTokenManager) refresh(ctx context.Context) (string, error) {
	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("client_id", m.clientID)
	form.Set("client_secret", m.clientSecret)
	form.Set("audience", m.audience)
	form.Set("scope", m.scope)

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		m.oauthURL,
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return "", fmt.Errorf("build canton oauth request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request canton oauth token: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("read canton oauth response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("canton oauth token request failed (%d): %s", resp.StatusCode, string(body))
	}

	var parsed oauthTokenResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("decode canton oauth response: %w", err)
	}

	token := strings.TrimSpace(parsed.AccessToken)
	if token == "" {
		return "", fmt.Errorf("canton oauth response did not include access_token")
	}

	expiresIn := parsed.ExpiresIn
	if expiresIn <= 0 {
		expiresIn = int((8 * time.Hour).Seconds())
	}

	m.mu.Lock()
	m.token = token
	m.expiresAt = time.Now().Add(time.Duration(expiresIn) * time.Second)
	m.mu.Unlock()

	return token, nil
}

// RefreshInterval reports the background refresh cadence.
func (m *M2MTokenManager) RefreshInterval() time.Duration {
	if m == nil {
		return 0
	}
	return m.refreshEvery
}
