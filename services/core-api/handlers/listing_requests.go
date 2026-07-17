package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/rentyvest/core-api/internal/auth"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/privy"
	"github.com/rentyvest/core-api/internal/problems"
)

type ListingRequestsHandler struct {
	store         *db.Store
	privyVerifier *privy.Verifier
}

func NewListingRequestsHandler(store *db.Store, verifier *privy.Verifier) *ListingRequestsHandler {
	return &ListingRequestsHandler{
		store:         store,
		privyVerifier: verifier,
	}
}

type createListingRequestBody struct {
	CantonPartyID        string  `json:"canton_party_id,omitempty"`
	ContactName          string  `json:"contact_name"`
	ContactEmail         string  `json:"contact_email"`
	ContactPhone         string  `json:"contact_phone,omitempty"`
	PropertyTitle        string  `json:"property_title"`
	PropertyDescription  string  `json:"property_description"`
	PropertyType         string  `json:"property_type"`
	AddressLine1         string  `json:"address_line1"`
	City                 string  `json:"city"`
	State                string  `json:"state"`
	Country              string  `json:"country"`
	PostalCode           string  `json:"postal_code,omitempty"`
	TotalUnits           int32   `json:"total_units"`
	UnitPrice            float64 `json:"unit_price"`
	EstimatedAnnualYield float64 `json:"estimated_annual_yield"`
	ImageURL             string  `json:"image_url,omitempty"`
	AdditionalNotes      string  `json:"additional_notes,omitempty"`
}

type createListingRequestResponse struct {
	Request db.PropertyListingRequest `json:"request"`
}

func (h *ListingRequestsHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST to submit a property listing request")
		return
	}

	userID, err := h.authenticate(r)
	if err != nil {
		writeListingAuthError(w, err)
		return
	}

	var body createListingRequestBody
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4001", "Bad Request", "Request body must be valid JSON")
		return
	}

	if err := validateListingRequestBody(&body); err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-4002", "Bad Request", err.Error())
		return
	}

	created, err := h.store.CreatePropertyListingRequest(r.Context(), db.CreatePropertyListingRequestInput{
		SubmitterID:          userID,
		CantonPartyID:        optionalString(body.CantonPartyID),
		ContactName:          strings.TrimSpace(body.ContactName),
		ContactEmail:         strings.TrimSpace(body.ContactEmail),
		ContactPhone:         optionalString(body.ContactPhone),
		PropertyTitle:        strings.TrimSpace(body.PropertyTitle),
		PropertyDescription:  strings.TrimSpace(body.PropertyDescription),
		PropertyType:         strings.TrimSpace(body.PropertyType),
		AddressLine1:         strings.TrimSpace(body.AddressLine1),
		City:                 strings.TrimSpace(body.City),
		State:                strings.TrimSpace(body.State),
		Country:              strings.TrimSpace(body.Country),
		PostalCode:           optionalString(body.PostalCode),
		TotalUnits:           body.TotalUnits,
		UnitPrice:            formatAmount(body.UnitPrice),
		EstimatedAnnualYield: strconv.FormatFloat(body.EstimatedAnnualYield, 'f', -1, 64),
		ImageURL:             optionalString(body.ImageURL),
		AdditionalNotes:      optionalString(body.AdditionalNotes),
	})
	if err != nil {
		if strings.Contains(err.Error(), "property_listing_requests") {
			problems.WriteCode(w, http.StatusServiceUnavailable, "RV-9004", "Service Unavailable", "Property listing submissions are not enabled on this environment")
			return
		}
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to save property listing request")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createListingRequestResponse{Request: *created})
}

func (h *ListingRequestsHandler) authenticate(r *http.Request) (string, error) {
	token, err := auth.ExtractBearerToken(r)
	if err != nil {
		return "", fmt.Errorf("authorization: %w", err)
	}

	return h.privyVerifier.Verify(r.Context(), token)
}

func writeListingAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, privy.ErrTokenExpired):
		problems.WriteCode(w, http.StatusUnauthorized, "RV-1002", "Unauthorized", "Privy access token has expired")
	case errors.Is(err, privy.ErrTokenInvalid), errors.Is(err, privy.ErrSubjectMissing):
		problems.WriteCode(w, http.StatusUnauthorized, "RV-1003", "Unauthorized", "Privy access token is invalid")
	default:
		if strings.Contains(err.Error(), "authorization") {
			problems.WriteCode(w, http.StatusUnauthorized, "RV-1001", "Unauthorized", err.Error())
			return
		}
		problems.WriteCode(w, http.StatusUnauthorized, "RV-1003", "Unauthorized", "Unable to authenticate request")
	}
}

func validateListingRequestBody(body *createListingRequestBody) error {
	if strings.TrimSpace(body.ContactName) == "" {
		return errors.New("contact_name is required")
	}
	if strings.TrimSpace(body.ContactEmail) == "" {
		return errors.New("contact_email is required")
	}
	if strings.TrimSpace(body.PropertyTitle) == "" {
		return errors.New("property_title is required")
	}
	if len(strings.TrimSpace(body.PropertyDescription)) < 40 {
		return errors.New("property_description must be at least 40 characters")
	}

	propertyType := strings.TrimSpace(body.PropertyType)
	switch propertyType {
	case "residential", "commercial", "mixed_use", "other":
		body.PropertyType = propertyType
	default:
		return errors.New("property_type must be residential, commercial, mixed_use, or other")
	}

	if strings.TrimSpace(body.AddressLine1) == "" {
		return errors.New("address_line1 is required")
	}
	if strings.TrimSpace(body.City) == "" {
		return errors.New("city is required")
	}
	if strings.TrimSpace(body.State) == "" {
		return errors.New("state is required")
	}
	if strings.TrimSpace(body.Country) == "" {
		body.Country = "United States"
	}
	if body.TotalUnits <= 0 {
		return errors.New("total_units must be greater than zero")
	}
	if body.UnitPrice <= 0 {
		return errors.New("unit_price must be greater than zero")
	}
	if body.EstimatedAnnualYield < 0 || body.EstimatedAnnualYield > 100 {
		return errors.New("estimated_annual_yield must be between 0 and 100")
	}

	imageURL := strings.TrimSpace(body.ImageURL)
	if imageURL != "" && !strings.HasPrefix(strings.ToLower(imageURL), "http://") && !strings.HasPrefix(strings.ToLower(imageURL), "https://") {
		return errors.New("image_url must start with http:// or https://")
	}

	return nil
}

func optionalString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
