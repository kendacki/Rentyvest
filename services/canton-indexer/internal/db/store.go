package db

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	config.MaxConns = 8
	config.MinConns = 1
	config.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
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

func (s *Store) ResolvePropertyID(ctx context.Context, propertyIDText string) (uuid.UUID, error) {
	propertyID, err := uuid.Parse(propertyIDText)
	if err != nil {
		return uuid.Nil, fmt.Errorf("parse property id %q: %w", propertyIDText, err)
	}
	return propertyID, nil
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

func (s *Store) FindPledgeIDByIdempotencyKey(ctx context.Context, key string) (*uuid.UUID, error) {
	if key == "" {
		return nil, nil
	}

	var pledgeID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		SELECT id
		FROM public.pledges
		WHERE idempotency_key = $1
	`, key).Scan(&pledgeID)
	if err != nil {
		return nil, nil
	}
	return &pledgeID, nil
}

func (s *Store) GetPropertyStatus(ctx context.Context, propertyID uuid.UUID) (string, error) {
	var status string
	err := s.pool.QueryRow(ctx, `
		SELECT status
		FROM public.properties
		WHERE id = $1
	`, propertyID).Scan(&status)
	if err != nil {
		return "", fmt.Errorf("get property status: %w", err)
	}
	return status, nil
}
