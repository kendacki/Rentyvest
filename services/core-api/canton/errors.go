package canton

import (
	"encoding/json"
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

func cantonCause(body string) string {
	body = strings.TrimSpace(body)
	if body == "" {
		return ""
	}

	var parsed struct {
		Cause string `json:"cause"`
		Code  string `json:"code"`
	}
	if err := json.Unmarshal([]byte(body), &parsed); err == nil {
		if parsed.Cause != "" {
			return parsed.Cause
		}
		if parsed.Code != "" {
			return parsed.Code
		}
	}

	return body
}

// HumanizeSubmitError turns Canton ledger failures into faucet-friendly copy.
func HumanizeSubmitError(err error) string {
	var submitErr *SubmitError
	if !errors.As(err, &submitErr) {
		if err == nil {
			return "Canton ledger request failed"
		}
		return err.Error()
	}

	cause := cantonCause(submitErr.Body)
	upper := strings.ToUpper(cause)

	switch {
	case strings.Contains(upper, "INVALID_PRESCRIBED_SYNCHRONIZER_ID"),
		strings.Contains(upper, "NOT KNOWN TO ALL INFORMEES"),
		strings.Contains(upper, "HAS NOT VETTED"):
		return "Your Loop wallet network has not vetted the RentyVest tUSDC package yet. " +
			"FiveNorth DevNet must vet package rentyvest-faucet on the Loop participant before faucet mints can reach Loop parties. " +
			"Share package ID 628f1d1ab9a89273948d94b0fed617d14e67d8134590ecaab35b36a4055a2767 with FiveNorth support."
	case strings.Contains(upper, "UNKNOWN_INFORMEES"):
		return "Your Loop wallet party is not known on this Canton synchronizer yet. Reconnect Loop and try again, or use a DevNet party that is already onboarded."
	case strings.Contains(upper, "CONTRACT_NOT_FOUND"):
		return "The faucet issuer contract was rotated on-ledger. Please retry your claim in a few seconds."
	case strings.Contains(upper, "DAML_AUTHORIZATION_ERROR"):
		return "Canton rejected the mint authorization for this party. The deployed tUSDC contract may require a package upgrade on DevNet."
	case cause != "":
		return cause
	default:
		return "Canton ledger rejected the faucet mint transaction"
	}
}

func ProblemForSubmitError(err error) (status int, code string, detail string) {
	var submitErr *SubmitError
	if !errors.As(err, &submitErr) {
		if errors.Is(err, ErrNotConfigured) {
			return http.StatusServiceUnavailable, "RV-9003", "Canton ledger integration is not configured"
		}
		return http.StatusBadGateway, "RV-9003", HumanizeSubmitError(err)
	}

	detail = HumanizeSubmitError(err)

	switch {
	case submitErr.StatusCode == http.StatusUnauthorized || submitErr.StatusCode == http.StatusForbidden:
		return http.StatusBadGateway, "RV-3001", detail
	case submitErr.StatusCode >= 400 && submitErr.StatusCode < 500:
		return http.StatusConflict, "RV-3001", detail
	default:
		return http.StatusBadGateway, "RV-9003", detail
	}
}
