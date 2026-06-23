package handlers

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/problems"
)

const (
	defaultPropertyPageSize = 20
	maxPropertyPageSize     = 100
	propertiesCacheControl  = "public, max-age=0, s-maxage=60, stale-while-revalidate=120"
)

type PropertiesHandler struct {
	store *db.Store
}

func NewPropertiesHandler(store *db.Store) *PropertiesHandler {
	return &PropertiesHandler{store: store}
}

type propertiesListResponse struct {
	Data       []db.Property `json:"data"`
	NextCursor *string       `json:"next_cursor,omitempty"`
	HasMore    bool          `json:"has_more"`
}

func (h *PropertiesHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		problems.Write(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use GET for listing properties")
		return
	}

	limit := parseLimit(r.URL.Query().Get("limit"), defaultPropertyPageSize, maxPropertyPageSize)

	cursor, err := decodePropertyCursor(r.URL.Query().Get("cursor"))
	if err != nil {
		problems.WriteCode(w, http.StatusBadRequest, "RV-1001", "Bad Request", "Invalid cursor value")
		return
	}

	properties, hasMore, err := h.store.ListActiveProperties(r.Context(), cursor, limit)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to list properties")
		return
	}

	response := propertiesListResponse{
		Data:    properties,
		HasMore: hasMore,
	}

	if hasMore && len(properties) > 0 {
		last := properties[len(properties)-1]
		encoded := encodePropertyCursor(db.PropertyCursor{
			CreatedAt: last.CreatedAt,
			ID:        last.ID,
		})
		response.NextCursor = &encoded
	}

	body, err := json.Marshal(response)
	if err != nil {
		problems.Write(w, http.StatusInternalServerError, "Internal Server Error", "Unable to encode properties response")
		return
	}

	etag := buildWeakETag(body)
	if match := strings.TrimSpace(r.Header.Get("If-None-Match")); match == etag {
		w.Header().Set("ETag", etag)
		w.Header().Set("Cache-Control", propertiesCacheControl)
		w.WriteHeader(http.StatusNotModified)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", propertiesCacheControl)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func parseLimit(raw string, defaultLimit int32, maxLimit int32) int32 {
	if raw == "" {
		return defaultLimit
	}

	parsed, err := strconv.ParseInt(raw, 10, 32)
	if err != nil || parsed <= 0 {
		return defaultLimit
	}

	if int32(parsed) > maxLimit {
		return maxLimit
	}

	return int32(parsed)
}

func encodePropertyCursor(cursor db.PropertyCursor) string {
	payload := fmt.Sprintf(
		"%s|%s",
		cursor.CreatedAt.UTC().Format(time.RFC3339Nano),
		cursor.ID.String(),
	)
	return base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func decodePropertyCursor(raw string) (*db.PropertyCursor, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}

	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, err
	}

	parts := strings.SplitN(string(decoded), "|", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid cursor payload")
	}

	createdAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, err
	}

	id, err := uuid.Parse(parts[1])
	if err != nil {
		return nil, err
	}

	return &db.PropertyCursor{
		CreatedAt: createdAt,
		ID:        id,
	}, nil
}

func buildWeakETag(body []byte) string {
	sum := sha256.Sum256(body)
	return fmt.Sprintf(`W/"%s"`, hex.EncodeToString(sum[:16]))
}
