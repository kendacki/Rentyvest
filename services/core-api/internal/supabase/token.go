package supabase

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenLifetime = time.Hour

func MintToken(jwtSecret, subject string) (string, error) {
	if jwtSecret == "" {
		return "", fmt.Errorf("supabase jwt secret is not configured")
	}
	if subject == "" {
		return "", fmt.Errorf("subject is required")
	}

	now := time.Now()

	claims := jwt.MapClaims{
		"role": "authenticated",
		"sub":  subject,
		"aud":  "authenticated",
		"iss":  "supabase",
		"iat":  now.Unix(),
		"exp":  now.Add(tokenLifetime).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signed, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", fmt.Errorf("sign supabase jwt: %w", err)
	}

	return signed, nil
}
