package canton

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
)

var ErrNotConfigured = errors.New("canton client is not configured")

type SubmitError struct {
	StatusCode int
	Body       string
}

func (e *SubmitError) Error() string {
	return fmt.Sprintf("canton submit failed with status %d: %s", e.StatusCode, e.Body)
}

func NewSubmitError(statusCode int, body string) *SubmitError {
	return &SubmitError{
		StatusCode: statusCode,
		Body:       strings.TrimSpace(body),
	}
}

func ProblemForSubmitError(err error) (status int, code string, detail string) {
	var submitErr *SubmitError
	if !errors.As(err, &SubmitError) {
		if errors.Is(err, ErrNotConfigured) {
			return http.StatusServiceUnavailable, "RV-9003", "Canton ledger integration is not configured"
		}
		return http.StatusBadGateway, "RV-9003", "Canton ledger request failed"
	}

	detail = submitErr.Body
	if detail == "" {
		detail = "Canton ledger rejected the pledge transaction"
	}

	switch {
	case submitErr.StatusCode == http.StatusUnauthorized || submitErr.StatusCode == http.StatusForbidden:
		return http.StatusBadGateway, "RV-3001", detail
	case submitErr.StatusCode >= 400 && submitErr.StatusCode < 500:
		return http.StatusConflict, "RV-3001", detail
	default:
		return http.StatusBadGateway, "RV-9003", detail
	}
}
