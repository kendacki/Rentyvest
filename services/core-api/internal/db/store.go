package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrDuplicateIdempotencyKey = errors.New("duplicate idempotency key")

type Property struct {
	ID                   uuid.UUID `json:"id"`
	OwnerID              string    `json:"owner_id"`
	Title                string    `json:"title"`
	Description          *string   `json:"description,omitempty"`
	AddressLine1         *string   `json:"address_line1,omitempty"`
	City                 *string   `json:"city,omitempty"`
	State                *string   `json:"state,omitempty"`
	Country              *string   `json:"country,omitempty"`
	PostalCode           *string   `json:"postal_code,omitempty"`
	TotalUnits           int32     `json:"total_units"`
	UnitPrice            string    `json:"unit_price"`
	SlotsFilled          int32     `json:"slots_filled"`
	EstimatedAnnualYield string    `json:"estimated_annual_yield"`
	Status               string    `json:"status"`
	ListedAt             *time.Time `json:"listed_at,omitempty"`
	ImageURL             *string   `json:"image_url,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type PropertyCursor struct {
	CreatedAt time.Time
	ID        uuid.UUID
}

type Pledge struct {
	ID             uuid.UUID `json:"id"`
	UserID         string    `json:"user_id"`
	PropertyID     uuid.UUID `json:"property_id"`
	Units          int32     `json:"units"`
	Amount         string    `json:"amount"`
	Currency       string    `json:"currency"`
	Status         string    `json:"status"`
	PaymentMethod  *string   `json:"payment_method,omitempty"`
	IdempotencyKey string    `json:"idempotency_key"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) GetUserKYCTier(ctx context.Context, userID string) (int32, error) {
	var tier int32
	err := s.pool.QueryRow(ctx, `
		SELECT kyc_tier
		FROM public.users
		WHERE id = $1
	`, userID).Scan(&tier)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("query user kyc tier: %w", err)
	}
	return tier, nil
}

func (s *Store) ListActiveProperties(
	ctx context.Context,
	cursor *PropertyCursor,
	limit int32,
) ([]Property, bool, error) {
	if limit <= 0 {
		limit = 20
	}

	const propertyColumns = `
		SELECT
			id, owner_id, title, description, address_line1, city, state, country,
			postal_code, total_units, unit_price::text, slots_filled,
			estimated_annual_yield::text, status, listed_at, image_url,
			created_at, updated_at
		FROM public.properties
		WHERE status = 'active'
	`

	var rows pgx.Rows
	var err error

	if cursor != nil {
		rows, err = s.pool.Query(ctx, propertyColumns+`
			AND (created_at, id) < ($1, $2)
			ORDER BY created_at DESC, id DESC
			LIMIT $3
		`, cursor.CreatedAt, cursor.ID, limit+1)
	} else {
		rows, err = s.pool.Query(ctx, propertyColumns+`
			ORDER BY created_at DESC, id DESC
			LIMIT $1
		`, limit+1)
	}
	if err != nil {
		return nil, false, fmt.Errorf("list properties: %w", err)
	}
	defer rows.Close()

	properties := make([]Property, 0, limit+1)
	for rows.Next() {
		var property Property
		if err := rows.Scan(
			&property.ID,
			&property.OwnerID,
			&property.Title,
			&property.Description,
			&property.AddressLine1,
			&property.City,
			&property.State,
			&property.Country,
			&property.PostalCode,
			&property.TotalUnits,
			&property.UnitPrice,
			&property.SlotsFilled,
			&property.EstimatedAnnualYield,
			&property.Status,
			&property.ListedAt,
			&property.ImageURL,
			&property.CreatedAt,
			&property.UpdatedAt,
		); err != nil {
			return nil, false, fmt.Errorf("scan property: %w", err)
		}
		properties = append(properties, property)
	}

	if err := rows.Err(); err != nil {
		return nil, false, fmt.Errorf("iterate properties: %w", err)
	}

	hasMore := len(properties) > int(limit)
	if hasMore {
		properties = properties[:limit]
	}

	return properties, hasMore, nil
}

type PropertyAvailability struct {
	ID          uuid.UUID
	UnitPrice   string
	TotalUnits  int32
	SlotsFilled int32
	Status      string
}

func (s *Store) GetPropertyAvailability(
	ctx context.Context,
	propertyID uuid.UUID,
) (*PropertyAvailability, error) {
	var property PropertyAvailability
	err := s.pool.QueryRow(ctx, `
		SELECT id, unit_price::text, total_units, slots_filled, status
		FROM public.properties
		WHERE id = $1
	`, propertyID).Scan(
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
		return nil, fmt.Errorf("query property availability: %w", err)
	}
	return &property, nil
}

func (s *Store) GetPledgeByIdempotencyKey(
	ctx context.Context,
	idempotencyKey string,
) (*Pledge, error) {
	var pledge Pledge
	err := s.pool.QueryRow(ctx, `
		SELECT
			id, user_id, property_id, units, amount::text, currency, status,
			payment_method, idempotency_key, created_at, updated_at
		FROM public.pledges
		WHERE idempotency_key = $1
	`, idempotencyKey).Scan(
		&pledge.ID,
		&pledge.UserID,
		&pledge.PropertyID,
		&pledge.Units,
		&pledge.Amount,
		&pledge.Currency,
		&pledge.Status,
		&pledge.PaymentMethod,
		&pledge.IdempotencyKey,
		&pledge.CreatedAt,
		&pledge.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query pledge by idempotency key: %w", err)
	}
	return &pledge, nil
}

func (s *Store) CreatePledge(
	ctx context.Context,
	pledge Pledge,
) (*Pledge, error) {
	var created Pledge
	err := s.pool.QueryRow(ctx, `
		INSERT INTO public.pledges (
			user_id, property_id, units, amount, currency, status,
			payment_method, idempotency_key
		) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
		RETURNING
			id, user_id, property_id, units, amount::text, currency, status,
			payment_method, idempotency_key, created_at, updated_at
	`,
		pledge.UserID,
		pledge.PropertyID,
		pledge.Units,
		pledge.Amount,
		pledge.Currency,
		pledge.PaymentMethod,
		pledge.IdempotencyKey,
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
		return nil, fmt.Errorf("insert pledge: %w", err)
	}
	return &created, nil
}

func (s *Store) ConfirmPledgeByIdempotencyKey(
	ctx context.Context,
	idempotencyKey string,
) (*Pledge, bool, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var pledge Pledge
	err = tx.QueryRow(ctx, `
		SELECT
			id, user_id, property_id, units, amount::text, currency, status,
			payment_method, idempotency_key, created_at, updated_at
		FROM public.pledges
		WHERE idempotency_key = $1
		FOR UPDATE
	`, idempotencyKey).Scan(
		&pledge.ID,
		&pledge.UserID,
		&pledge.PropertyID,
		&pledge.Units,
		&pledge.Amount,
		&pledge.Currency,
		&pledge.Status,
		&pledge.PaymentMethod,
		&pledge.IdempotencyKey,
		&pledge.CreatedAt,
		&pledge.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("lock pledge: %w", err)
	}

	if pledge.Status == "confirmed" {
		if err := tx.Commit(ctx); err != nil {
			return nil, false, fmt.Errorf("commit existing confirmed pledge: %w", err)
		}
		return &pledge, true, nil
	}

	var property PropertyAvailability
	err = tx.QueryRow(ctx, `
		SELECT id, unit_price::text, total_units, slots_filled, status
		FROM public.properties
		WHERE id = $1
		FOR UPDATE
	`, pledge.PropertyID).Scan(
		&property.ID,
		&property.UnitPrice,
		&property.TotalUnits,
		&property.SlotsFilled,
		&property.Status,
	)
	if err != nil {
		return nil, false, fmt.Errorf("lock property: %w", err)
	}

	if property.SlotsFilled+pledge.Units > property.TotalUnits {
		return nil, false, fmt.Errorf("insufficient slots available")
	}

	err = tx.QueryRow(ctx, `
		UPDATE public.pledges
		SET status = 'confirmed', updated_at = now()
		WHERE id = $1
		RETURNING
			id, user_id, property_id, units, amount::text, currency, status,
			payment_method, idempotency_key, created_at, updated_at
	`, pledge.ID).Scan(
		&pledge.ID,
		&pledge.UserID,
		&pledge.PropertyID,
		&pledge.Units,
		&pledge.Amount,
		&pledge.Currency,
		&pledge.Status,
		&pledge.PaymentMethod,
		&pledge.IdempotencyKey,
		&pledge.CreatedAt,
		&pledge.UpdatedAt,
	)
	if err != nil {
		return nil, false, fmt.Errorf("confirm pledge: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE public.properties
		SET slots_filled = slots_filled + $2, updated_at = now()
		WHERE id = $1
	`, pledge.PropertyID, pledge.Units)
	if err != nil {
		return nil, false, fmt.Errorf("increment slots filled: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit pledge confirmation: %w", err)
	}

	return &pledge, false, nil
}
