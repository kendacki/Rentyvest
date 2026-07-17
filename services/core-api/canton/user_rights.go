package canton

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// UserRightsSummary is a safe summary of ledger user rights for startup diagnostics.
type UserRightsSummary struct {
	UserID      string
	CanActAs    []string
	CanReadAs   []string
	ParticipantAdmin bool
	RawStatus   int
}

// ProbeUserRights lists rights for the configured ledger user via the JSON Ledger API.
func (c *Client) ProbeUserRights(ctx context.Context) (*UserRightsSummary, error) {
	userID := strings.TrimSpace(c.userID)
	if userID == "" {
		return nil, fmt.Errorf("CANTON_LEDGER_USER_ID is empty")
	}

	token, err := c.resolveToken(ctx)
	if err != nil {
		return nil, err
	}

	endpoint := fmt.Sprintf("%s/v2/users/%s/rights", strings.TrimRight(c.baseURL, "/"), url.PathEscape(userID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build user rights request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request user rights: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read user rights response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, NewSubmitError(resp.StatusCode, string(body))
	}

	summary := parseUserRights(userID, body)
	summary.RawStatus = resp.StatusCode
	return summary, nil
}

func parseUserRights(userID string, body []byte) *UserRightsSummary {
	summary := &UserRightsSummary{UserID: userID}

	var decoded map[string]interface{}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return summary
	}

	rightsRaw, ok := decoded["rights"].([]interface{})
	if !ok {
		// Some APIs return a top-level array.
		var asArray []interface{}
		if err := json.Unmarshal(body, &asArray); err == nil {
			rightsRaw = asArray
		}
	}

	for _, item := range rightsRaw {
		record, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		if actAs, ok := nestedParty(record, "CanActAs", "canActAs", "can_act_as"); ok {
			summary.CanActAs = append(summary.CanActAs, actAs)
			continue
		}
		if readAs, ok := nestedParty(record, "CanReadAs", "canReadAs", "can_read_as"); ok {
			summary.CanReadAs = append(summary.CanReadAs, readAs)
			continue
		}
		if _, ok := record["ParticipantAdmin"]; ok {
			summary.ParticipantAdmin = true
			continue
		}
		if _, ok := record["participantAdmin"]; ok {
			summary.ParticipantAdmin = true
			continue
		}
		if _, ok := record["participant_admin"]; ok {
			summary.ParticipantAdmin = true
		}
	}

	return summary
}

func nestedParty(record map[string]interface{}, keys ...string) (string, bool) {
	for _, key := range keys {
		raw, ok := record[key]
		if !ok {
			continue
		}
		switch typed := raw.(type) {
		case string:
			if typed != "" {
				return typed, true
			}
		case map[string]interface{}:
			if party, ok := typed["party"].(string); ok && party != "" {
				return party, true
			}
			if party, ok := typed["value"].(string); ok && party != "" {
				return party, true
			}
		}
	}
	return "", false
}

// LogUserRightsProbe prints whether the M2M user can act as the configured admin party.
func (c *Client) LogUserRightsProbe(ctx context.Context) {
	probeCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	summary, err := c.ProbeUserRights(probeCtx)
	if err != nil {
		log.Printf("WARNING: canton user rights probe failed for userId=%s: %v", c.userID, err)
		return
	}

	admin := c.AdminPartyID()
	canActAsAdmin := false
	for _, party := range summary.CanActAs {
		if party == admin {
			canActAsAdmin = true
			break
		}
	}

	log.Printf(
		"canton user rights: userId=%s participantAdmin=%v canActAsCount=%d canReadAsCount=%d canActAsAdmin=%v",
		summary.UserID,
		summary.ParticipantAdmin,
		len(summary.CanActAs),
		len(summary.CanReadAs),
		canActAsAdmin,
	)

	if len(summary.CanActAs) > 0 {
		preview := summary.CanActAs
		if len(preview) > 5 {
			preview = preview[:5]
		}
		log.Printf("canton user rights canActAs sample=%v", preview)
	}

	if !canActAsAdmin && !summary.ParticipantAdmin {
		log.Printf(
			"WARNING: M2M user %q cannot actAs admin party %q — faucet mint will return 403 PERMISSION_DENIED until FiveNorth grants canActAs or CANTON_ADMIN_PARTY_ID is updated",
			summary.UserID,
			admin,
		)
	}
}
