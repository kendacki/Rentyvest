package privy

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

const defaultJWKSEndpoint = "https://auth.privy.io/api/v1/jwks"

var (
	ErrTokenMissing   = errors.New("privy token is missing")
	ErrTokenInvalid   = errors.New("privy token is invalid")
	ErrTokenExpired   = errors.New("privy token is expired")
	ErrSubjectMissing = errors.New("privy token is missing sub claim")
)

type Verifier struct {
	appID      string
	jwksURL    string
	cacheTTL   time.Duration
	httpClient *http.Client

	mu        sync.RWMutex
	keySet    jwk.Set
	fetchedAt time.Time
}

type Config struct {
	AppID    string
	JWKSURL  string
	CacheTTL time.Duration
}

func NewVerifier(cfg Config) *Verifier {
	jwksURL := cfg.JWKSURL
	if jwksURL == "" {
		jwksURL = defaultJWKSEndpoint
	}

	cacheTTL := cfg.CacheTTL
	if cacheTTL == 0 {
		cacheTTL = time.Hour
	}

	return &Verifier{
		appID:      cfg.AppID,
		jwksURL:    jwksURL,
		cacheTTL:   cacheTTL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (v *Verifier) Verify(ctx context.Context, tokenString string) (string, error) {
	if tokenString == "" {
		return "", ErrTokenMissing
	}

	keySet, err := v.getKeySet(ctx)
	if err != nil {
		return "", fmt.Errorf("load privy jwks: %w", err)
	}

	parsed, err := jwt.Parse(
		[]byte(tokenString),
		jwt.WithKeySet(keySet),
		jwt.WithValidate(true),
		jwt.WithIssuer("privy.io"),
		jwt.WithAudience(v.appID),
	)
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired()) {
			return "", ErrTokenExpired
		}
		return "", fmt.Errorf("%w: %v", ErrTokenInvalid, err)
	}

	subject := parsed.Subject()
	if subject == "" {
		return "", ErrSubjectMissing
	}

	return subject, nil
}

func (v *Verifier) getKeySet(ctx context.Context) (jwk.Set, error) {
	v.mu.RLock()
	if v.keySet != nil && time.Since(v.fetchedAt) < v.cacheTTL {
		cached := v.keySet
		v.mu.RUnlock()
		return cached, nil
	}
	v.mu.RUnlock()

	return v.refresh(ctx)
}

func (v *Verifier) refresh(ctx context.Context) (jwk.Set, error) {
	v.mu.Lock()
	defer v.mu.Unlock()

	if v.keySet != nil && time.Since(v.fetchedAt) < v.cacheTTL {
		return v.keySet, nil
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	set, err := jwk.Fetch(fetchCtx, v.jwksURL, jwk.WithHTTPClient(v.httpClient))
	if err != nil {
		return nil, err
	}

	v.keySet = set
	v.fetchedAt = time.Now()

	return set, nil
}
