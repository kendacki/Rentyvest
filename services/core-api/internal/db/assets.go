package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type UserTokenAsset struct {
	ID               uuid.UUID `json:"id"`
	UserID           string    `json:"user_id"`
	CantonContractID string    `json:"canton_contract_id"`
	OwnerPartyID     string    `json:"owner_party_id"`
	Balance          string    `json:"balance"`
	Symbol           string    `json:"symbol"`
	InstrumentID     string    `json:"instrument_id"`
	Locked           bool      `json:"locked"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (s *Store) ListUserTokenAssets(ctx context.Context, userID string) ([]UserTokenAsset, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT
			id,
			user_id,
			canton_contract_id,
			owner_party_id,
			balance::text,
			symbol,
			instrument_id,
			locked,
			created_at,
			updated_at
		FROM public.user_token_assets
		WHERE user_id = $1
		  AND locked = false
		  AND balance > 0
		ORDER BY balance DESC, created_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list user token assets: %w", err)
	}
	defer rows.Close()

	assets := make([]UserTokenAsset, 0)
	for rows.Next() {
		var asset UserTokenAsset
		if err := rows.Scan(
			&asset.ID,
			&asset.UserID,
			&asset.CantonContractID,
			&asset.OwnerPartyID,
			&asset.Balance,
			&asset.Symbol,
			&asset.InstrumentID,
			&asset.Locked,
			&asset.CreatedAt,
			&asset.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user token asset: %w", err)
		}
		assets = append(assets, asset)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user token assets: %w", err)
	}

	return assets, nil
}

func (s *Store) ListTokenAssetsByOwnerParty(ctx context.Context, ownerPartyID string) ([]UserTokenAsset, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT
			id,
			user_id,
			canton_contract_id,
			owner_party_id,
			balance::text,
			symbol,
			instrument_id,
			locked,
			created_at,
			updated_at
		FROM public.user_token_assets
		WHERE owner_party_id = $1
		  AND locked = false
		  AND balance > 0
		ORDER BY balance DESC, created_at ASC
	`, ownerPartyID)
	if err != nil {
		return nil, fmt.Errorf("list token assets by owner party: %w", err)
	}
	defer rows.Close()

	assets := make([]UserTokenAsset, 0)
	for rows.Next() {
		var asset UserTokenAsset
		if err := rows.Scan(
			&asset.ID,
			&asset.UserID,
			&asset.CantonContractID,
			&asset.OwnerPartyID,
			&asset.Balance,
			&asset.Symbol,
			&asset.InstrumentID,
			&asset.Locked,
			&asset.CreatedAt,
			&asset.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan token asset by owner party: %w", err)
		}
		assets = append(assets, asset)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate token assets by owner party: %w", err)
	}

	return assets, nil
}

func (s *Store) UpsertUserTokenAsset(
	ctx context.Context,
	userID string,
	cantonContractID string,
	ownerPartyID string,
	balance string,
	symbol string,
	instrumentID string,
) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO public.user_token_assets (
			user_id,
			canton_contract_id,
			owner_party_id,
			balance,
			symbol,
			instrument_id,
			locked
		) VALUES ($1, $2, $3, $4, $5, $6, false)
		ON CONFLICT (canton_contract_id) DO UPDATE
		SET
			balance = EXCLUDED.balance,
			owner_party_id = EXCLUDED.owner_party_id,
			updated_at = now()
	`, userID, cantonContractID, ownerPartyID, balance, symbol, instrumentID)
	if err != nil {
		return fmt.Errorf("upsert user token asset: %w", err)
	}
	return nil
}

func (s *Store) ArchiveUserTokenAssets(ctx context.Context, cantonContractIDs []string) error {
	if len(cantonContractIDs) == 0 {
		return nil
	}

	_, err := s.pool.Exec(ctx, `
		DELETE FROM public.user_token_assets
		WHERE canton_contract_id = ANY($1)
	`, cantonContractIDs)
	if err != nil {
		return fmt.Errorf("archive user token assets: %w", err)
	}
	return nil
}
