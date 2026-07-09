package canton

import (
	"errors"
	"net/http"
	"strings"
)

// ProblemForLedgerQuery maps Canton ledger read failures to HTTP problem responses.
func ProblemForLedgerQuery(err error) (status int, code string, detail string) {
	if err == nil {
		return http.StatusInternalServerError, "RV-9003", "Unknown ledger query error"
	}
	if errors.Is(err, ErrNotConfigured) {
		return http.StatusServiceUnavailable, "RV-9003", "Canton ledger integration is not configured"
	}

	var submitErr *SubmitError
	if errors.As(err, &submitErr) {
		detail = HumanizeSubmitError(err)
		switch {
		case submitErr.StatusCode == http.StatusNotFound:
			return http.StatusNotFound, "RV-4041", detail
		case submitErr.StatusCode == http.StatusUnauthorized || submitErr.StatusCode == http.StatusForbidden:
			return http.StatusBadGateway, "RV-3001", detail
		default:
			return http.StatusBadGateway, "RV-9003", detail
		}
	}

	lower := strings.ToLower(err.Error())
	switch {
	case strings.Contains(lower, "connection refused"),
		strings.Contains(lower, "connection reset"),
		strings.Contains(lower, "timeout"),
		strings.Contains(lower, "no such host"),
		strings.Contains(lower, "tls"):
		return http.StatusBadGateway, "RV-9003", "Canton JSON Ledger API is unreachable"
	default:
		return http.StatusInternalServerError, "RV-9003", err.Error()
	}
}
