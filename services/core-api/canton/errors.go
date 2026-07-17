package canton

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
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

// IsAuthSubmitError reports Canton ledger auth failures that may be fixed by refreshing the bearer token.
// PERMISSION_DENIED (403 / grpc 7) is NOT included — that means the user lacks actAs rights.
func IsAuthSubmitError(err error) bool {
	var submitErr *SubmitError
	if !errors.As(err, &submitErr) {
		return false
	}

	if submitErr.StatusCode == http.StatusUnauthorized {
		return true
	}

	// grpcCodeValue 16 = UNAUTHENTICATED; 7 = PERMISSION_DENIED (do not refresh for 7).
	body := strings.ToLower(submitErr.Body)
	if strings.Contains(body, `"grpccodevalue":16`) {
		return true
	}

	cause := strings.ToLower(cantonCause(submitErr.Body))
	return strings.Contains(cause, "unauthenticated") ||
		strings.Contains(cause, "access_token_expired") ||
		(strings.Contains(cause, "security-sensitive error") && submitErr.StatusCode == http.StatusUnauthorized)
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
	case submitErr.StatusCode == http.StatusForbidden,
		strings.Contains(upper, "SECURITY-SENSITIVE ERROR") && submitErr.StatusCode == http.StatusForbidden,
		strings.Contains(strings.ToLower(submitErr.Body), `"grpcCodeValue":7`):
		adminParty := strings.TrimSpace(os.Getenv("CANTON_ADMIN_PARTY_ID"))
		if adminParty == "" {
			adminParty = strings.TrimSpace(os.Getenv("CANTON_ACT_AS_PARTY"))
		}
		userID := strings.TrimSpace(os.Getenv("CANTON_LEDGER_USER_ID"))
		if userID == "" {
			userID = "6"
		}
		return fmt.Sprintf(
			"Canton PERMISSION_DENIED: M2M user %q cannot actAs admin party %q. "+
				"Ask FiveNorth to grant canActAs for that party on user %q, or set CANTON_ADMIN_PARTY_ID to a party this M2M client already controls.",
			userID,
			adminParty,
			userID,
		)
	case strings.Contains(upper, "SECURITY-SENSITIVE ERROR"),
		strings.Contains(upper, "UNAUTHENTICATED"),
		submitErr.StatusCode == http.StatusUnauthorized:
		return "Canton ledger authentication failed. Refresh M2M OAuth credentials on Railway and retry."
	case strings.Contains(upper, "JSON_API_MAXIMUM_LIST_ELEMENTS_NUMBER_REACHED"),
		strings.Contains(upper, "GREATER THAN THE NODE LIMIT"):
		return "Canton ACS query returned too many contracts. Faucet will use CANTON_USDC_ISSUER_CONTRACT_ID directly; ensure that env var is the current active issuer CID."
	case strings.Contains(upper, "INVALID_PRESCRIBED_SYNCHRONIZER_ID"),
		strings.Contains(upper, "NOT KNOWN TO ALL INFORMEES"),
		strings.Contains(upper, "HAS NOT VETTED"):
		packageID := PackageIDFromEnv()
		if packageID == "" {
			packageID = "<your CANTON_DAML_PACKAGE_ID>"
		}
		return "Your Loop wallet network has not vetted the RentyVest tUSDC package yet. " +
			"FiveNorth DevNet must vet the RentyVest package on the Loop participant before faucet mints can reach Loop parties. " +
			"Share package ID " + packageID + " with FiveNorth support."
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
