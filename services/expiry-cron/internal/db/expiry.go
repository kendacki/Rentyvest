package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ExpiredProperty struct {
	ID                   uuid.UUID
	CantonPoolContractID string
	ExpiryAt             time.Time
}

type PropertyPledge struct {
	ID             uuid.UUID
	IdempotencyKey string
	Units          int32
	UserID         string
}

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) ListExpiredProperties(
	ctx context.Context,
	limit int32,
) ([]ExpiredProperty, error) {
	if limit <= 0 {
		limit = 50
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, COALESCE(canton_pool_contract_id, ''), expiry_at
		FROM public.properties
		WHERE status = 'pending'
		  AND expiry_at IS NOT NULL
		  AND expiry_at < now()
		  AND expiry_submitted = false
		ORDER BY expiry_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("list expired properties: %w", err)
	}
	defer rows.Close()

	properties := make([]ExpiredProperty, 0, limit)
	for rows.Next() {
		var property ExpiredProperty
		if err := rows.Scan(&property.ID, &property.CantonPoolContractID, &property.ExpiryAt); err != nil {
			return nil, fmt.Errorf("scan expired property: %w", err)
		}
		properties = append(properties, property)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate expired properties: %w", err)
	}

	return properties, nil
}

func (s *Store) MarkExpirySubmitted(ctx context.Context, propertyID uuid.UUID) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE public.properties
		SET
			expiry_submitted = true,
			updated_at = now()
		WHERE id = $1
		  AND expiry_submitted = false
	`, propertyID)
	if err != nil {
		return false, fmt.Errorf("mark expiry submitted: %w", err)
	}

	return tag.RowsAffected() > 0, nil
}

func (s *Store) ListConfirmedPledgesForProperty(
	ctx context.Context,
	propertyID uuid.UUID,
) ([]PropertyPledge, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, idempotency_key, units, user_id
		FROM public.pledges
		WHERE property_id = $1
		  AND status = 'confirmed'
		ORDER BY created_at ASC
	`, propertyID)
	if err != nil {
		return nil, fmt.Errorf("list confirmed pledges: %w", err)
	}
	defer rows.Close()

	pledges := make([]PropertyPledge, 0)
	for rows.Next() {
		var pledge PropertyPledge
		if err := rows.Scan(&pledge.ID, &pledge.IdempotencyKey, &pledge.Units, &pledge.UserID); err != nil {
			return nil, fmt.Errorf("scan property pledge: %w", err)
		}
		pledges = append(pledges, pledge)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate property pledges: %w", err)
	}

	return pledges, nil
}

func (s *Store) ReconcileExpiredProperty(ctx context.Context, propertyID uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin reconcile transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	err = tx.QueryRow(ctx, `
		SELECT status
		FROM public.properties
		WHERE id = $1
		FOR UPDATE
	`, propertyID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("property %s not found", propertyID)
	}
	if err != nil {
		return fmt.Errorf("lock property for reconcile: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE public.properties
		SET
			status = 'expired',
			slots_filled = 0,
			updated_at = now()
		WHERE id = $1
	`, propertyID)
	if err != nil {
		return fmt.Errorf("expire property: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE public.pledges
		SET
			status = 'refunded',
			updated_at = now()
		WHERE property_id = $1
		  AND status = 'confirmed'
	`, propertyID)
	if err != nil {
		return fmt.Errorf("refund property pledges: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit reconcile transaction: %w", err)
	}

	return nil
}

func (s *Store) ResetExpirySubmitted(ctx context.Context, propertyID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE public.properties
		SET
			expiry_submitted = false,
			updated_at = now()
		WHERE id = $1
	`, propertyID)
	if err != nil {
		return fmt.Errorf("reset expiry submitted: %w", err)
	}
	return nil
}
