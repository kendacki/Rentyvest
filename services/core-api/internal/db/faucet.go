package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const FaucetUSDCEventType = "faucet.usdc"

var ErrFaucetRateLimited = errors.New("faucet rate limit exceeded")
var ErrUserCantonPartyMissing = errors.New("user canton party id is not configured")

type FaucetClaimAudit struct {
	ID        uuid.UUID
	UserID    string
	EventType string
	EventData json.RawMessage
	CreatedAt time.Time
}

type FaucetClaimEventData struct {
	Amount              string `json:"amount"`
	CantonPartyID       string `json:"canton_party_id"`
	CantonCommandID     string `json:"canton_command_id,omitempty"`
	CantonUpdateID      string `json:"canton_update_id,omitempty"`
	CantonHoldingCID    string `json:"canton_holding_contract_id,omitempty"`
	CantonIssuerCID     string `json:"canton_issuer_contract_id,omitempty"`
}

func (s *Store) GetUserCantonPartyID(ctx context.Context, userID string) (string, error) {
	var partyID *string
	err := s.pool.QueryRow(ctx, `
		SELECT canton_party_id
		FROM public.users
		WHERE id = $1
	`, userID).Scan(&partyID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrUserCantonPartyMissing
	}
	if err != nil {
		return "", fmt.Errorf("query user canton party id: %w", err)
	}
	if partyID == nil || *partyID == "" {
		return "", ErrUserCantonPartyMissing
	}
	return *partyID, nil
}

func (s *Store) HasRecentFaucetClaim(
	ctx context.Context,
	userID string,
	window time.Duration,
) (bool, time.Time, error) {
	since := time.Now().Add(-window)

	var lastClaim time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT created_at
		FROM public.audit_log
		WHERE user_id = $1
		  AND event_type = $2
		  AND created_at > $3
		ORDER BY created_at DESC
		LIMIT 1
	`, userID, FaucetUSDCEventType, since).Scan(&lastClaim)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, time.Time{}, nil
	}
	if err != nil {
		return false, time.Time{}, fmt.Errorf("query recent faucet claim: %w", err)
	}
	return true, lastClaim, nil
}

func (s *Store) HasRecentFaucetClaimByParty(
	ctx context.Context,
	cantonPartyID string,
	window time.Duration,
) (bool, time.Time, error) {
	since := time.Now().Add(-window)

	var lastClaim time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT created_at
		FROM public.faucet_claims
		WHERE canton_party_id = $1
		  AND created_at > $2
		ORDER BY created_at DESC
		LIMIT 1
	`, cantonPartyID, since).Scan(&lastClaim)
	if errors.Is(err, pgx.ErrNoRows) {
		userID, lookupErr := s.lookupUserIDByCantonParty(ctx, cantonPartyID)
		if lookupErr != nil {
			if errors.Is(lookupErr, ErrUserCantonPartyMissing) {
				return false, time.Time{}, nil
			}
			return false, time.Time{}, lookupErr
		}
		return s.HasRecentFaucetClaim(ctx, userID, window)
	}
	if err != nil {
		return false, time.Time{}, fmt.Errorf("query recent faucet claim by party: %w", err)
	}
	return true, lastClaim, nil
}

func (s *Store) LookupUserIDByCantonParty(ctx context.Context, cantonPartyID string) (string, error) {
	return s.lookupUserIDByCantonParty(ctx, cantonPartyID)
}

func (s *Store) lookupUserIDByCantonParty(ctx context.Context, cantonPartyID string) (string, error) {
	var userID string
	err := s.pool.QueryRow(ctx, `
		SELECT id
		FROM public.users
		WHERE canton_party_id = $1
		LIMIT 1
	`, cantonPartyID).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrUserCantonPartyMissing
	}
	if err != nil {
		return "", fmt.Errorf("lookup user by canton party id: %w", err)
	}
	return userID, nil
}

func (s *Store) InsertFaucetClaimAudit(
	ctx context.Context,
	userID string,
	eventData FaucetClaimEventData,
) (*FaucetClaimAudit, error) {
	payload, err := json.Marshal(eventData)
	if err != nil {
		return nil, fmt.Errorf("marshal faucet audit event data: %w", err)
	}

	var audit FaucetClaimAudit
	err = s.pool.QueryRow(ctx, `
		INSERT INTO public.audit_log (user_id, event_type, event_data)
		VALUES ($1, $2, $3::jsonb)
		RETURNING id, user_id, event_type, event_data, created_at
	`, userID, FaucetUSDCEventType, payload).Scan(
		&audit.ID,
		&audit.UserID,
		&audit.EventType,
		&audit.EventData,
		&audit.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert faucet audit log: %w", err)
	}
	return &audit, nil
}

type FaucetPartyClaim struct {
	ID                    uuid.UUID
	CantonPartyID         string
	Amount                string
	CantonCommandID       string
	CantonUpdateID        string
	CantonHoldingCID      string
	CantonIssuerCID       string
	CreatedAt             time.Time
}

func (s *Store) InsertFaucetPartyClaim(
	ctx context.Context,
	cantonPartyID string,
	eventData FaucetClaimEventData,
) (*FaucetPartyClaim, error) {
	var claim FaucetPartyClaim
	err := s.pool.QueryRow(ctx, `
		INSERT INTO public.faucet_claims (
			canton_party_id,
			amount,
			canton_command_id,
			canton_update_id,
			canton_holding_contract_id,
			canton_issuer_contract_id
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING
			id,
			canton_party_id,
			amount,
			COALESCE(canton_command_id, ''),
			COALESCE(canton_update_id, ''),
			COALESCE(canton_holding_contract_id, ''),
			COALESCE(canton_issuer_contract_id, ''),
			created_at
	`, cantonPartyID, eventData.Amount, nullIfEmpty(eventData.CantonCommandID), nullIfEmpty(eventData.CantonUpdateID), nullIfEmpty(eventData.CantonHoldingCID), nullIfEmpty(eventData.CantonIssuerCID)).Scan(
		&claim.ID,
		&claim.CantonPartyID,
		&claim.Amount,
		&claim.CantonCommandID,
		&claim.CantonUpdateID,
		&claim.CantonHoldingCID,
		&claim.CantonIssuerCID,
		&claim.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert faucet party claim: %w", err)
	}
	return &claim, nil
}

func nullIfEmpty(value string) interface{} {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func (s *Store) TryFaucetUserLock(ctx context.Context, userID string) (func(context.Context) error, error) {
	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		return nil, fmt.Errorf("acquire connection for faucet lock: %w", err)
	}

	var acquired bool
	err = conn.QueryRow(ctx, `SELECT pg_try_advisory_lock(hashtext($1))`, "faucet:"+userID).Scan(&acquired)
	if err != nil {
		conn.Release()
		return nil, fmt.Errorf("acquire faucet advisory lock: %w", err)
	}
	if !acquired {
		conn.Release()
		return nil, ErrFaucetRateLimited
	}

	release := func(releaseCtx context.Context) error {
		defer conn.Release()

		var unlocked bool
		err := conn.QueryRow(releaseCtx, `SELECT pg_advisory_unlock(hashtext($1))`, "faucet:"+userID).Scan(&unlocked)
		if err != nil {
			return fmt.Errorf("release faucet advisory lock: %w", err)
		}
		return nil
	}

	return release, nil
}
