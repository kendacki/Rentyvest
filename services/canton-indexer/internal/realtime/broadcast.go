package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

const propertiesChannel = "public:properties"

type Broadcaster struct {
	supabaseURL string
	serviceKey  string
	httpClient  *http.Client
}

type broadcastRequest struct {
	Messages []broadcastMessage `json:"messages"`
}

type broadcastMessage struct {
	Topic   string          `json:"topic"`
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
}

type PropertySlotsUpdatedPayload struct {
	PropertyID  string `json:"property_id"`
	SlotsFilled int32  `json:"slots_filled"`
	Status      string `json:"status"`
}

type NFTMintedPayload struct {
	PropertyID       string `json:"property_id"`
	OwnerID          string `json:"owner_id"`
	CantonContractID string `json:"canton_contract_id"`
	SlotIndex        int32  `json:"slot_index"`
}

func NewBroadcaster() (*Broadcaster, error) {
	supabaseURL := strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
	if supabaseURL == "" {
		raw := os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
		supabaseURL = strings.TrimRight(strings.Replace(raw, "/rest/v1/", "", 1), "/")
	}
	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL is required for realtime broadcast")
	}

	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if serviceKey == "" {
		serviceKey = os.Getenv("service_role")
	}
	if serviceKey == "" {
		return nil, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is required for realtime broadcast")
	}

	return &Broadcaster{
		supabaseURL: supabaseURL,
		serviceKey:  serviceKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}, nil
}

func (b *Broadcaster) BroadcastPropertySlotsUpdated(
	ctx context.Context,
	payload PropertySlotsUpdatedPayload,
) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal property slots payload: %w", err)
	}

	return b.broadcast(ctx, "slots_updated", body)
}

func (b *Broadcaster) BroadcastNFTMinted(ctx context.Context, payload NFTMintedPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal nft minted payload: %w", err)
	}

	return b.broadcast(ctx, "nft_minted", body)
}

func (b *Broadcaster) broadcast(ctx context.Context, event string, payload json.RawMessage) error {
	requestBody, err := json.Marshal(broadcastRequest{
		Messages: []broadcastMessage{
			{
				Topic:   propertiesChannel,
				Event:   event,
				Payload: payload,
			},
		},
	})
	if err != nil {
		return fmt.Errorf("marshal broadcast request: %w", err)
	}

	url := fmt.Sprintf("%s/realtime/v1/api/broadcast", b.supabaseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(string(requestBody)))
	if err != nil {
		return fmt.Errorf("build realtime broadcast request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", b.serviceKey)
	req.Header.Set("Authorization", "Bearer "+b.serviceKey)

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send realtime broadcast: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("realtime broadcast failed with status %d", resp.StatusCode)
	}

	return nil
}
