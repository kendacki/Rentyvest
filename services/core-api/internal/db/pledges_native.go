package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	PropertyStatusActive       = "active"
	PledgePaymentMethodTUSDC   = "tusdc"
	PledgeStatusConfirmed      = "confirmed"
	CantonSubmitStatusSubmitted = "submitted"
	CantonSubmitStatusFailed    = "failed"
)

var ErrPropertyPoolUnavailable = errors.New("property pool is not available for pledges")
var ErrInsufficientPoolCapacity = errors.New("insufficient pool capacity")

type PropertyNativePledgeContext struct {
	ID                   uuid.UUID
	UnitPrice            string
	TotalUnits           int32
	SlotsFilled          int32
	Status               string
	CantonPoolContractID string
}

func (s *Store) GetPropertyNativePledgeContext(
	ctx context.Context,
	propertyID uuid.UUID,
) (*PropertyNativePledgeContext, error) {
	var property PropertyNativePledgeContext
	err := s.pool.QueryRow(ctx, `
		SELECT
			id,
			unit_price::text,
			total_units,
			slots_filled,
			status,
			COALESCE(canton_pool_contract_id, '')
		FROM public.properties
		WHERE id = $1
	`, propertyID).Scan(
		&property.ID,
		&property.UnitPrice,
		&property.TotalUnits,
		&property.SlotsFilled,
		&property.Status,
		&property.CantonPoolContractID,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query property native pledge context: %w", err)
	}
	return &property, nil
}

func (property *PropertyNativePledgeContext) ValidateForNativePledge(slotCount int32) error {
	if property.Status != PropertyStatusActive {
		return ErrPropertyPoolUnavailable
	}
	if property.CantonPoolContractID == "" {
		return ErrPropertyPoolUnavailable
	}
	if slotCount <= 0 {
		return ErrInsufficientPoolCapacity
	}
	if property.SlotsFilled+slotCount > property.TotalUnits {
		return ErrInsufficientPoolCapacity
	}
	return nil
}

type NativePledgeRecord struct {
	UserID                 string
	PropertyID             uuid.UUID
	Units                  int32
	Amount                 string
	Currency               string
	PaymentMethod          string
	PaymentAssetContractID string
	IdempotencyKey         string
	CantonCommandID        string
	CantonUpdateID         string
}

func (s *Store) InsertConfirmedNativePledge(
	ctx context.Context,
	record NativePledgeRecord,
) (*Pledge, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin native pledge transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var property PropertyAvailability
	err = tx.QueryRow(ctx, `
		SELECT id, unit_price::text, total_units, slots_filled, status
		FROM public.properties
		WHERE id = $1
		FOR UPDATE
	`, record.PropertyID).Scan(
		&property.ID,
		&property.UnitPrice,
		&property.TotalUnits,
		&property.SlotsFilled,
		&property.Status,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lock property for native pledge: %w", err)
	}
	if property.Status != PropertyStatusActive {
		return nil, ErrPropertyPoolUnavailable
	}
	if property.SlotsFilled+record.Units > property.TotalUnits {
		return nil, ErrInsufficientPoolCapacity
	}

	var created Pledge
	err = tx.QueryRow(ctx, `
		INSERT INTO public.pledges (
			user_id,
			property_id,
			units,
			amount,
			currency,
			status,
			payment_method,
			idempotency_key,
			canton_submit_status,
			canton_submitted_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
		RETURNING
			id, user_id, property_id, units, amount::text, currency, status,
			payment_method, idempotency_key, created_at, updated_at
	`,
		record.UserID,
		record.PropertyID,
		record.Units,
		record.Amount,
		record.Currency,
		PledgeStatusConfirmed,
		record.PaymentMethod,
		record.IdempotencyKey,
		CantonSubmitStatusSubmitted,
	).Scan(
		&created.ID,
		&created.UserID,
		&created.PropertyID,
		&created.Units,
		&created.Amount,
		&created.Currency,
		&created.Status,
		&created.PaymentMethod,
		&created.IdempotencyKey,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicateIdempotencyKey
		}
		return nil, fmt.Errorf("insert confirmed native pledge: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE public.properties
		SET slots_filled = slots_filled + $2, updated_at = now()
		WHERE id = $1
	`, record.PropertyID, record.Units)
	if err != nil {
		return nil, fmt.Errorf("increment property slots for native pledge: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit native pledge transaction: %w", err)
	}

	return &created, nil
}
