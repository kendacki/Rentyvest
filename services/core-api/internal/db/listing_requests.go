package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type PropertyListingRequest struct {
	ID                     uuid.UUID  `json:"id"`
	SubmitterID            string     `json:"submitter_id"`
	CantonPartyID          *string    `json:"canton_party_id,omitempty"`
	ContactName            string     `json:"contact_name"`
	ContactEmail           string     `json:"contact_email"`
	ContactPhone           *string    `json:"contact_phone,omitempty"`
	PropertyTitle          string     `json:"property_title"`
	PropertyDescription    string     `json:"property_description"`
	PropertyType           string     `json:"property_type"`
	AddressLine1           string     `json:"address_line1"`
	City                   string     `json:"city"`
	State                  string     `json:"state"`
	Country                string     `json:"country"`
	PostalCode             *string    `json:"postal_code,omitempty"`
	TotalUnits             int32      `json:"total_units"`
	UnitPrice              string     `json:"unit_price"`
	EstimatedAnnualYield   string     `json:"estimated_annual_yield"`
	ImageURL               *string    `json:"image_url,omitempty"`
	AdditionalNotes        *string    `json:"additional_notes,omitempty"`
	Status                 string     `json:"status"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type CreatePropertyListingRequestInput struct {
	SubmitterID          string
	CantonPartyID        *string
	ContactName          string
	ContactEmail         string
	ContactPhone         *string
	PropertyTitle        string
	PropertyDescription  string
	PropertyType         string
	AddressLine1         string
	City                 string
	State                string
	Country              string
	PostalCode           *string
	TotalUnits           int32
	UnitPrice            string
	EstimatedAnnualYield string
	ImageURL             *string
	AdditionalNotes      *string
}

func (s *Store) CreatePropertyListingRequest(
	ctx context.Context,
	input CreatePropertyListingRequestInput,
) (*PropertyListingRequest, error) {
	var created PropertyListingRequest

	err := s.pool.QueryRow(ctx, `
		INSERT INTO public.property_listing_requests (
			submitter_id,
			canton_party_id,
			contact_name,
			contact_email,
			contact_phone,
			property_title,
			property_description,
			property_type,
			address_line1,
			city,
			state,
			country,
			postal_code,
			total_units,
			unit_price,
			estimated_annual_yield,
			image_url,
			additional_notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING
			id,
			submitter_id,
			canton_party_id,
			contact_name,
			contact_email,
			contact_phone,
			property_title,
			property_description,
			property_type,
			address_line1,
			city,
			state,
			country,
			postal_code,
			total_units,
			unit_price::text,
			estimated_annual_yield::text,
			image_url,
			additional_notes,
			status,
			created_at,
			updated_at
	`,
		input.SubmitterID,
		input.CantonPartyID,
		input.ContactName,
		input.ContactEmail,
		input.ContactPhone,
		input.PropertyTitle,
		input.PropertyDescription,
		input.PropertyType,
		input.AddressLine1,
		input.City,
		input.State,
		input.Country,
		input.PostalCode,
		input.TotalUnits,
		input.UnitPrice,
		input.EstimatedAnnualYield,
		input.ImageURL,
		input.AdditionalNotes,
	).Scan(
		&created.ID,
		&created.SubmitterID,
		&created.CantonPartyID,
		&created.ContactName,
		&created.ContactEmail,
		&created.ContactPhone,
		&created.PropertyTitle,
		&created.PropertyDescription,
		&created.PropertyType,
		&created.AddressLine1,
		&created.City,
		&created.State,
		&created.Country,
		&created.PostalCode,
		&created.TotalUnits,
		&created.UnitPrice,
		&created.EstimatedAnnualYield,
		&created.ImageURL,
		&created.AdditionalNotes,
		&created.Status,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert property listing request: %w", err)
	}

	return &created, nil
}
