package canton

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rentyvest/core-api/internal/db"
)

const (
	defaultPoolCurrency        = "tUSDC"
	defaultFundraisingDuration = 30 * 24 * time.Hour
	defaultProvisionInterval   = 30 * time.Second
)

type createCommand struct {
	CreateCommand createPayload `json:"CreateCommand"`
}

type createPayload struct {
	TemplateID     string                 `json:"templateId"`
	CreateArgument map[string]interface{} `json:"createArgument"`
}

type CreatePoolCommand struct {
	PropertyID    string
	PropertyTitle string
	TotalSlots    int32
	SlotPrice     string
	Deadline      time.Time
	CommandID     string
}

// CreatePropertyPool creates a Pending PropertyPool on Canton for an approved
// listing so investors can pledge against it. platform_admin signs; the pool
// is platform-operated (seller/prop_manager = admin party).
func (c *Client) CreatePropertyPool(ctx context.Context, cmd CreatePoolCommand) (string, error) {
	if strings.TrimSpace(cmd.PropertyID) == "" {
		return "", fmt.Errorf("property id is required")
	}
	if strings.TrimSpace(cmd.PropertyTitle) == "" {
		return "", fmt.Errorf("property title is required")
	}
	if cmd.TotalSlots <= 0 {
		return "", fmt.Errorf("total slots must be positive")
	}
	if strings.TrimSpace(cmd.SlotPrice) == "" {
		return "", fmt.Errorf("slot price is required")
	}

	commandID := cmd.CommandID
	if commandID == "" {
		commandID = fmt.Sprintf("create-pool-%s", uuid.NewString())
	}

	deadline := cmd.Deadline
	if deadline.IsZero() {
		deadline = time.Now().Add(defaultFundraisingDuration)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	body := submitRequest{
		ActAs:     []string{c.adminParty},
		ReadAs:    []string{c.adminParty},
		UserID:    c.userID,
		CommandID: commandID,
		Commands: []interface{}{
			createCommand{
				CreateCommand: createPayload{
					TemplateID: c.templatePoolID,
					CreateArgument: map[string]interface{}{
						"platform_admin":          c.adminParty,
						"seller":                  c.adminParty,
						"prop_manager":            c.adminParty,
						"pool_id":                 cmd.PropertyID,
						"property_id":             cmd.PropertyID,
						"property_title":          cmd.PropertyTitle,
						"total_slots":             cmd.TotalSlots,
						"next_slot_index":         0,
						"slot_price":              cmd.SlotPrice,
						"currency":                defaultPoolCurrency,
						"status":                  "Pending",
						"fundraising_deadline":    deadline.UTC().Format(time.RFC3339),
						"yield_history":           []interface{}{},
						"transfer_log":            []interface{}{},
						"refunded_bid_references": []interface{}{},
						"escrowed_pledges":        []interface{}{},
						"created_at":              now,
					},
				},
			},
		},
	}

	responseBody, err := c.submitAndWaitForTransaction(ctx, body)
	if err != nil {
		return "", err
	}

	poolCID := extractCreatedContractID(responseBody, ":PropertyPool")
	if poolCID == "" {
		return "", fmt.Errorf("pool creation succeeded but response did not include a PropertyPool contract id")
	}

	return poolCID, nil
}

// PoolProvisioner watches for active properties without an on-ledger
// PropertyPool (e.g. approved listing requests promoted by the DB trigger)
// and creates the pool so pledging works end to end.
type PoolProvisioner struct {
	store    *db.Store
	client   *Client
	interval time.Duration
	duration time.Duration
}

func NewPoolProvisioner(store *db.Store, client *Client) *PoolProvisioner {
	interval := defaultProvisionInterval
	if raw := strings.TrimSpace(os.Getenv("CANTON_POOL_PROVISION_INTERVAL")); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
			interval = parsed
		}
	}

	duration := defaultFundraisingDuration
	if raw := strings.TrimSpace(os.Getenv("POOL_FUNDRAISING_DURATION")); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
			duration = parsed
		}
	}

	return &PoolProvisioner{
		store:    store,
		client:   client,
		interval: interval,
		duration: duration,
	}
}

func (p *PoolProvisioner) Start(ctx context.Context) {
	log.Printf("canton pool provisioner started (poll=%s, fundraising=%s)", p.interval, p.duration)

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	p.poll(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Printf("canton pool provisioner stopped: %v", ctx.Err())
			return
		case <-ticker.C:
			p.poll(ctx)
		}
	}
}

func (p *PoolProvisioner) poll(parent context.Context) {
	ctx, cancel := context.WithTimeout(parent, 2*time.Minute)
	defer cancel()

	properties, err := p.store.ListPropertiesNeedingPool(ctx, 20)
	if err != nil {
		log.Printf("[pool-provisioner] list properties failed: %v", err)
		return
	}

	for _, property := range properties {
		deadline := time.Now().Add(p.duration)

		poolCID, createErr := p.client.CreatePropertyPool(ctx, CreatePoolCommand{
			PropertyID:    property.ID.String(),
			PropertyTitle: property.Title,
			TotalSlots:    property.TotalUnits,
			SlotPrice:     property.UnitPrice,
			Deadline:      deadline,
			// Deterministic command id makes retries idempotent on Canton.
			CommandID: fmt.Sprintf("create-pool-%s", property.ID),
		})
		if createErr != nil {
			log.Printf("[pool-provisioner] pool creation failed property=%s err=%v", property.ID, createErr)
			continue
		}

		if setErr := p.store.SetPropertyPoolContract(ctx, property.ID, poolCID, deadline); setErr != nil {
			log.Printf(
				"[pool-provisioner] pool created on Canton but DB update failed property=%s pool=%s err=%v",
				property.ID, poolCID, setErr,
			)
			continue
		}

		log.Printf("[pool-provisioner] pool ready property=%s pool=%s", property.ID, poolCID)
	}
}
