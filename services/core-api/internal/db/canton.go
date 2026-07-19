package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type CantonPledgeJob struct {
	PledgeID             uuid.UUID
	UserID               string
	PropertyID           uuid.UUID
	Units                int32
	IdempotencyKey       string
	CantonPoolContractID string
}

func (s *Store) ListPendingCantonPledges(ctx context.Context, limit int32) ([]CantonPledgeJob, error) {
	if limit <= 0 {
		limit = 50
	}

	rows, err := s.pool.Query(ctx, `
		SELECT
			p.id,
			p.user_id,
			p.property_id,
			p.units,
			p.idempotency_key,
			COALESCE(pr.canton_pool_contract_id, '')
		FROM public.pledges p
		INNER JOIN public.properties pr ON pr.id = p.property_id
		WHERE p.canton_submit_status = 'pending'
		  AND p.status = 'confirmed'
		  AND COALESCE(pr.canton_pool_contract_id, '') <> ''
		ORDER BY p.created_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("list pending canton pledges: %w", err)
	}
	defer rows.Close()

	jobs := make([]CantonPledgeJob, 0, limit)
	for rows.Next() {
		var job CantonPledgeJob
		if err := rows.Scan(
			&job.PledgeID,
			&job.UserID,
			&job.PropertyID,
			&job.Units,
			&job.IdempotencyKey,
			&job.CantonPoolContractID,
		); err != nil {
			return nil, fmt.Errorf("scan canton pledge job: %w", err)
		}
		jobs = append(jobs, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate canton pledge jobs: %w", err)
	}

	return jobs, nil
}

func (s *Store) MarkCantonPledgeSubmitted(ctx context.Context, pledgeID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE public.pledges
		SET
			canton_submit_status = 'submitted',
			canton_submit_error = NULL,
			canton_submitted_at = now(),
			updated_at = now()
		WHERE id = $1
	`, pledgeID)
	if err != nil {
		return fmt.Errorf("mark canton pledge submitted: %w", err)
	}
	return nil
}

func (s *Store) MarkCantonPledgeFailed(ctx context.Context, pledgeID uuid.UUID, submitError string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE public.pledges
		SET
			canton_submit_status = 'failed',
			canton_submit_error = $2,
			updated_at = now()
		WHERE id = $1
	`, pledgeID, submitError)
	if err != nil {
		return fmt.Errorf("mark canton pledge failed: %w", err)
	}
	return nil
}

func (s *Store) UpdatePropertySlotsFilled(
	ctx context.Context,
	propertyID uuid.UUID,
	slotsFilled int32,
) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE public.properties
		SET
			slots_filled = $2,
			updated_at = now()
		WHERE id = $1
	`, propertyID, slotsFilled)
	if err != nil {
		return fmt.Errorf("update property slots filled: %w", err)
	}
	return nil
}

type PropertyNeedingPool struct {
	ID         uuid.UUID
	Title      string
	TotalUnits int32
	UnitPrice  string
}

// ListPropertiesNeedingPool returns active properties that have no on-ledger
// PropertyPool yet (typically listings just promoted by the approval trigger).
func (s *Store) ListPropertiesNeedingPool(ctx context.Context, limit int32) ([]PropertyNeedingPool, error) {
	if limit <= 0 {
		limit = 20
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, title, total_units, unit_price::text
		FROM public.properties
		WHERE status = 'active'
		  AND COALESCE(canton_pool_contract_id, '') = ''
		  AND total_units > 0
		  AND unit_price > 0
		ORDER BY created_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("list properties needing pool: %w", err)
	}
	defer rows.Close()

	properties := make([]PropertyNeedingPool, 0, limit)
	for rows.Next() {
		var property PropertyNeedingPool
		if err := rows.Scan(
			&property.ID,
			&property.Title,
			&property.TotalUnits,
			&property.UnitPrice,
		); err != nil {
			return nil, fmt.Errorf("scan property needing pool: %w", err)
		}
		properties = append(properties, property)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate properties needing pool: %w", err)
	}

	return properties, nil
}

func (s *Store) GetPropertyTitle(ctx context.Context, propertyID uuid.UUID) (string, error) {
	var title string
	err := s.pool.QueryRow(ctx, `
		SELECT title
		FROM public.properties
		WHERE id = $1
	`, propertyID).Scan(&title)
	if err != nil {
		return "", fmt.Errorf("get property title: %w", err)
	}
	return title, nil
}

// UpdatePropertyPoolContractID rotates the stored PropertyPool contract id
// after a Pledge exercise archived the previous pool and created a successor.
func (s *Store) UpdatePropertyPoolContractID(
	ctx context.Context,
	propertyID uuid.UUID,
	poolContractID string,
) error {
	if poolContractID == "" {
		return nil
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE public.properties
		SET canton_pool_contract_id = $2, updated_at = now()
		WHERE id = $1
	`, propertyID, poolContractID)
	if err != nil {
		return fmt.Errorf("update property pool contract id: %w", err)
	}
	return nil
}

func (s *Store) SetPropertyPoolContract(
	ctx context.Context,
	propertyID uuid.UUID,
	poolContractID string,
	expiryAt time.Time,
) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE public.properties
		SET
			canton_pool_contract_id = $2,
			expiry_at = $3,
			updated_at = now()
		WHERE id = $1
	`, propertyID, poolContractID, expiryAt)
	if err != nil {
		// expiry_at only exists once migration 007 is applied; a missing
		// column must not orphan a pool that was already created on Canton.
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "42703" {
			if _, fallbackErr := s.pool.Exec(ctx, `
				UPDATE public.properties
				SET canton_pool_contract_id = $2, updated_at = now()
				WHERE id = $1
			`, propertyID, poolContractID); fallbackErr == nil {
				return nil
			}
		}
		return fmt.Errorf("set property pool contract: %w", err)
	}
	return nil
}

type MintedNFT struct {
	PropertyID       uuid.UUID
	OwnerID          string
	PledgeID         *uuid.UUID
	CantonContractID string
	TokenID          string
	ShareUnits       int32
}

func (s *Store) InsertMintedNFT(ctx context.Context, nft MintedNFT) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO public.nfts (
			property_id,
			owner_id,
			pledge_id,
			canton_contract_id,
			token_id,
			share_units,
			minted_at
		) VALUES ($1, $2, $3, $4, $5, $6, now())
		ON CONFLICT (canton_contract_id) DO NOTHING
	`, nft.PropertyID, nft.OwnerID, nft.PledgeID, nft.CantonContractID, nft.TokenID, nft.ShareUnits)
	if err != nil {
		return fmt.Errorf("insert minted nft: %w", err)
	}
	return nil
}

func (s *Store) FindPropertyIDByPoolContract(ctx context.Context, poolContractID string) (uuid.UUID, error) {
	var propertyID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT id
		FROM public.properties
		WHERE canton_pool_contract_id = $1
	`, poolContractID).Scan(&propertyID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("find property by pool contract: %w", err)
	}
	return propertyID, nil
}

func (s *Store) FindPledgeIDByIdempotencyKey(ctx context.Context, key string) (*uuid.UUID, error) {
	var pledgeID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT id
		FROM public.pledges
		WHERE idempotency_key = $1
	`, key).Scan(&pledgeID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find pledge by idempotency key: %w", err)
	}
	return &pledgeID, nil
}

func (s *Store) ResolvePropertyIDByPoolID(ctx context.Context, poolID string) (uuid.UUID, error) {
	var propertyID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT id
		FROM public.properties
		WHERE canton_pool_contract_id = $1
		   OR id::text = $2
		LIMIT 1
	`, poolID, poolID).Scan(&propertyID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("resolve property id by pool id: %w", err)
	}
	return propertyID, nil
}
