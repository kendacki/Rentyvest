package stream

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/rentyvest/canton-indexer/internal/db"
	"github.com/rentyvest/canton-indexer/internal/realtime"
)

const (
	defaultReconnectDelay = 5 * time.Second
	updatesPath           = "/v2/updates"
)

type Consumer struct {
	cantonURL      string
	jwt            string
	actAsParty     string
	store          *db.Store
	broadcaster    *realtime.Broadcaster
	poolTemplateID string
	nftTemplateID  string
	offset         string
	httpClient     *http.Client
}

type Config struct {
	CantonURL      string
	JWT            string
	ActAsParty     string
	PoolTemplateID string
	NFTTemplateID  string
	InitialOffset  string
}

func NewConsumer(store *db.Store, broadcaster *realtime.Broadcaster, cfg Config) (*Consumer, error) {
	cantonURL := strings.TrimRight(cfg.CantonURL, "/")
	if cantonURL == "" {
		cantonURL = strings.TrimRight(os.Getenv("CANTON_JSON_API_URL"), "/")
	}
	if cantonURL == "" {
		return nil, fmt.Errorf("CANTON_JSON_API_URL is required")
	}

	actAs := cfg.ActAsParty
	if actAs == "" {
		actAs = os.Getenv("CANTON_ACT_AS_PARTY")
	}
	if actAs == "" {
		return nil, fmt.Errorf("CANTON_ACT_AS_PARTY is required")
	}

	poolTemplate := cfg.PoolTemplateID
	if poolTemplate == "" {
		poolTemplate = os.Getenv("CANTON_TEMPLATE_PROPERTY_POOL")
	}
	if poolTemplate == "" {
		poolTemplate = "RentyVest.PropertyPool:PropertyPool"
	}

	nftTemplate := cfg.NFTTemplateID
	if nftTemplate == "" {
		nftTemplate = os.Getenv("CANTON_TEMPLATE_PROPERTY_NFT")
	}
	if nftTemplate == "" {
		nftTemplate = "RentyVest.PropertyNFT:PropertyNFT"
	}

	offset := cfg.InitialOffset
	if offset == "" {
		offset = os.Getenv("CANTON_INDEXER_OFFSET")
	}
	if offset == "" {
		offset = "0"
	}

	jwt := cfg.JWT
	if jwt == "" {
		jwt = os.Getenv("CANTON_JWT")
	}

	return &Consumer{
		cantonURL:      cantonURL,
		jwt:            jwt,
		actAsParty:     actAs,
		store:          store,
		broadcaster:    broadcaster,
		poolTemplateID: poolTemplate,
		nftTemplateID:  nftTemplate,
		offset:         offset,
		httpClient: &http.Client{
			Timeout: 90 * time.Second,
		},
	}, nil
}

func (c *Consumer) Run(ctx context.Context) error {
	log.Printf("canton indexer stream consumer started at offset %s", c.offset)

	for {
		if err := c.consume(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			log.Printf("canton indexer stream error: %v", err)
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(defaultReconnectDelay):
		}
	}
}

func (c *Consumer) consume(ctx context.Context) error {
	wsURL := strings.Replace(c.cantonURL, "https://", "wss://", 1)
	wsURL = strings.Replace(wsURL, "http://", "ws://", 1)
	wsURL = wsURL + updatesPath

	headers := http.Header{}
	if c.jwt != "" {
		headers.Set("Authorization", "Bearer "+c.jwt)
	}

	dialer := websocket.Dialer{
		HandshakeTimeout: 15 * time.Second,
		Subprotocols:     []string{"daml.ws.auth"},
	}

	conn, _, err := dialer.DialContext(ctx, wsURL, headers)
	if err != nil {
		return fmt.Errorf("dial canton updates websocket: %w", err)
	}
	defer conn.Close()

	subscribeRequest := map[string]interface{}{
		"beginExclusive": c.offset,
		"verbose":          true,
		"filter": map[string]interface{}{
			"filtersByParty": map[string]interface{}{
				c.actAsParty: map[string]interface{}{
					"templateFilters": []map[string]interface{}{
						{"templateId": c.poolTemplateID, "includeCreatedEventBlob": false},
						{"templateId": c.nftTemplateID, "includeCreatedEventBlob": false},
					},
				},
			},
		},
	}

	if err := conn.WriteJSON(subscribeRequest); err != nil {
		return fmt.Errorf("subscribe to canton updates: %w", err)
	}

	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		_, message, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("read canton update message: %w", err)
		}

		if err := c.handleUpdateMessage(ctx, message); err != nil {
			log.Printf("canton indexer projection error: %v", err)
		}
	}
}

func (c *Consumer) handleUpdateMessage(ctx context.Context, message []byte) error {
	var envelope map[string]interface{}
	if err := json.Unmarshal(message, &envelope); err != nil {
		return fmt.Errorf("decode update envelope: %w", err)
	}

	if errPayload, ok := envelope["error"]; ok && errPayload != nil {
		return fmt.Errorf("canton update stream error: %v", errPayload)
	}

	update, ok := envelope["update"].(map[string]interface{})
	if !ok {
		return nil
	}

	if offset, ok := update["offset"].(string); ok && offset != "" {
		c.offset = offset
	}

	transaction, ok := update["transaction"].(map[string]interface{})
	if !ok {
		return nil
	}

	events, ok := transaction["events"].([]interface{})
	if !ok {
		return nil
	}

	for _, rawEvent := range events {
		event, ok := rawEvent.(map[string]interface{})
		if !ok {
			continue
		}

		if created, ok := event["CreatedEvent"].(map[string]interface{}); ok {
			if err := c.handleCreatedEvent(ctx, created); err != nil {
				return err
			}
			continue
		}

		if archived, ok := event["ArchivedEvent"].(map[string]interface{}); ok {
			if err := c.handleArchivedEvent(ctx, archived); err != nil {
				return err
			}
		}
	}

	return nil
}

func (c *Consumer) handleCreatedEvent(ctx context.Context, event map[string]interface{}) error {
	templateID, _ := event["templateId"].(string)
	contractID, _ := event["contractId"].(string)
	createArgument, _ := event["createArgument"].(map[string]interface{})

	if contractID == "" || createArgument == nil {
		return nil
	}

	switch {
	case templateMatches(templateID, c.poolTemplateID):
		return c.projectPropertyPoolCreated(ctx, contractID, createArgument)
	case templateMatches(templateID, c.nftTemplateID):
		return c.projectPropertyNFTCreated(ctx, contractID, createArgument)
	default:
		return nil
	}
}

func (c *Consumer) handleArchivedEvent(ctx context.Context, event map[string]interface{}) error {
	templateID, _ := event["templateId"].(string)
	if !templateMatches(templateID, c.poolTemplateID) {
		return nil
	}

	contractID, _ := event["contractId"].(string)
	if contractID == "" {
		return nil
	}

	log.Printf("canton indexer: archived PropertyPool contract %s", contractID)
	return nil
}

func (c *Consumer) projectPropertyPoolCreated(
	ctx context.Context,
	contractID string,
	args map[string]interface{},
) error {
	propertyIDText, _ := args["property_id"].(string)
	if propertyIDText == "" {
		return nil
	}

	nextSlotIndex, ok := intFromArgument(args["next_slot_index"])
	if !ok {
		return nil
	}

	propertyID, err := c.store.ResolvePropertyID(ctx, propertyIDText)
	if err != nil {
		return err
	}

	if err := c.store.UpdatePropertySlotsFilled(ctx, propertyID, nextSlotIndex); err != nil {
		return err
	}

	status, err := c.store.GetPropertyStatus(ctx, propertyID)
	if err != nil {
		status = "active"
	}

	if c.broadcaster != nil {
		if err := c.broadcaster.BroadcastPropertySlotsUpdated(ctx, realtime.PropertySlotsUpdatedPayload{
			PropertyID:  propertyID.String(),
			SlotsFilled: nextSlotIndex,
			Status:      status,
		}); err != nil {
			log.Printf("canton indexer: realtime broadcast failed for property %s: %v", propertyID, err)
		}
	}

	log.Printf(
		"canton indexer: projected PropertyPool %s -> property %s slots_filled=%d",
		contractID,
		propertyID,
		nextSlotIndex,
	)

	return nil
}

func (c *Consumer) projectPropertyNFTCreated(
	ctx context.Context,
	contractID string,
	args map[string]interface{},
) error {
	propertyIDText, _ := args["property_id"].(string)
	if propertyIDText == "" {
		return nil
	}

	slotIndex, ok := intFromArgument(args["slot_index"])
	if !ok {
		return nil
	}

	ownerID := partyFromArgument(args["current_holder"])
	if ownerID == "" {
		ownerID = partyFromArgument(args["original_holder"])
	}
	if ownerID == "" {
		return fmt.Errorf("property nft %s is missing holder party", contractID)
	}

	propertyID, err := c.store.ResolvePropertyID(ctx, propertyIDText)
	if err != nil {
		return err
	}

	poolID, _ := args["pool_id"].(string)
	tokenID := fmt.Sprintf("%s:%d", poolID, slotIndex)

	var pledgeID *uuid.UUID
	if paymentReference, ok := args["payment_reference"].(string); ok {
		pledgeID, _ = c.store.FindPledgeIDByIdempotencyKey(ctx, paymentReference)
	}

	if err := c.store.InsertMintedNFT(ctx, db.MintedNFT{
		PropertyID:       propertyID,
		OwnerID:          ownerID,
		PledgeID:         pledgeID,
		CantonContractID: contractID,
		TokenID:          tokenID,
		ShareUnits:       1,
	}); err != nil {
		return err
	}

	if c.broadcaster != nil {
		if err := c.broadcaster.BroadcastNFTMinted(ctx, realtime.NFTMintedPayload{
			PropertyID:       propertyID.String(),
			OwnerID:          ownerID,
			CantonContractID: contractID,
			SlotIndex:        slotIndex,
		}); err != nil {
			log.Printf("canton indexer: nft broadcast failed for %s: %v", contractID, err)
		}
	}

	log.Printf(
		"canton indexer: projected PropertyNFT %s slot=%d owner=%s",
		contractID,
		slotIndex,
		ownerID,
	)

	return nil
}

func templateMatches(actual string, expected string) bool {
	if actual == expected {
		return true
	}
	return strings.HasSuffix(actual, ":"+expected) || strings.Contains(actual, expected)
}

func intFromArgument(value interface{}) (int32, bool) {
	switch typed := value.(type) {
	case float64:
		return int32(typed), true
	case string:
		parsed, err := strconv.ParseInt(typed, 10, 32)
		if err != nil {
			return 0, false
		}
		return int32(parsed), true
	default:
		return 0, false
	}
}

func partyFromArgument(value interface{}) string {
	raw, ok := value.(string)
	if !ok {
		return ""
	}
	if idx := strings.Index(raw, "::"); idx >= 0 {
		return raw[idx+2:]
	}
	return raw
}

// LongPollOnce supports HTTP environments where websocket streaming is unavailable.
func (c *Consumer) LongPollOnce(ctx context.Context) error {
	requestBody, err := json.Marshal(map[string]interface{}{
		"beginExclusive": c.offset,
		"verbose":          true,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.cantonURL+"/v2/updates",
		strings.NewReader(string(requestBody)),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.jwt != "" {
		req.Header.Set("Authorization", "Bearer "+c.jwt)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("canton long poll failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	return c.handleUpdateMessage(ctx, body)
}
