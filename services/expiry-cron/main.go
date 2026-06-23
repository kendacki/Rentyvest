package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
	"github.com/rentyvest/expiry-cron/canton"
	"github.com/rentyvest/expiry-cron/internal/db"
	"github.com/rentyvest/expiry-cron/internal/observability"
)

const (
	defaultTickInterval   = 5 * time.Minute
	defaultPropertyLimit  = int32(25)
	defaultExpiryReason   = "fundraising deadline elapsed"
	defaultMetaURIBase    = "https://api.rentyvest.com/metadata/pledges"
)

type Worker struct {
	store        *db.Store
	cantonClient *canton.Client
	interval     time.Duration
	metaURIBase  string
	expiryReason string
	propertyLimit int32
}

func main() {
	flushSentry := observability.InitSentry()
	defer flushSentry()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	connectCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	pool, err := db.Connect(connectCtx)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	cantonClient, err := canton.NewClient(canton.Config{})
	if err != nil {
		log.Fatalf("canton client init failed: %v", err)
	}

	worker := NewWorker(db.NewStore(pool), cantonClient)
	log.Printf("expiry-cron started (interval=%s)", worker.interval)
	worker.Run(ctx)
}

func NewWorker(store *db.Store, cantonClient *canton.Client) *Worker {
	interval := defaultTickInterval
	if raw := strings.TrimSpace(os.Getenv("EXPIRY_CRON_INTERVAL")); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
			interval = parsed
		}
	}

	metaURIBase := strings.TrimRight(strings.TrimSpace(os.Getenv("PLEDGE_META_URI_BASE")), "/")
	if metaURIBase == "" {
		metaURIBase = defaultMetaURIBase
	}

	expiryReason := strings.TrimSpace(os.Getenv("EXPIRY_REASON"))
	if expiryReason == "" {
		expiryReason = defaultExpiryReason
	}

	return &Worker{
		store:         store,
		cantonClient:  cantonClient,
		interval:      interval,
		metaURIBase:   metaURIBase,
		expiryReason:  expiryReason,
		propertyLimit: defaultPropertyLimit,
	}
}

func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	w.poll(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Printf("expiry-cron stopped: %v", ctx.Err())
			return
		case <-ticker.C:
			w.poll(ctx)
		}
	}
}

func (w *Worker) poll(parent context.Context) {
	ctx, cancel := context.WithTimeout(parent, 4*time.Minute)
	defer cancel()

	properties, err := w.store.ListExpiredProperties(ctx, w.propertyLimit)
	if err != nil {
		observability.CaptureError(fmt.Errorf("list expired properties: %w", err))
		return
	}

	if len(properties) == 0 {
		return
	}

	log.Printf("expiry-cron: processing %d expired properties", len(properties))

	for _, property := range properties {
		if err := w.processProperty(ctx, property); err != nil {
			observability.CaptureError(fmt.Errorf("process property %s: %w", property.ID, err))
		}
	}
}

func (w *Worker) processProperty(ctx context.Context, property db.ExpiredProperty) error {
	if strings.TrimSpace(property.CantonPoolContractID) == "" {
		return fmt.Errorf("property %s is missing canton_pool_contract_id", property.ID)
	}

	marked, err := w.store.MarkExpirySubmitted(ctx, property.ID)
	if err != nil {
		return fmt.Errorf("mark expiry submitted: %w", err)
	}
	if !marked {
		return nil
	}

	pledges, err := w.store.ListConfirmedPledgesForProperty(ctx, property.ID)
	if err != nil {
		if resetErr := w.store.ResetExpirySubmitted(ctx, property.ID); resetErr != nil {
			observability.CaptureError(fmt.Errorf("reset expiry submitted for %s: %w", property.ID, resetErr))
		}
		return fmt.Errorf("list confirmed pledges: %w", err)
	}

	poolContractID := property.CantonPoolContractID

	for _, pledge := range pledges {
		bidReference := pledgeBidReference(w.metaURIBase, pledge.IdempotencyKey)
		refundReference := fmt.Sprintf("expiry-refund-%s", pledge.ID)

		nextPoolContractID, err := w.cantonClient.SubmitExpireBid(ctx, canton.ExpireBidCommand{
			PoolContractID:  poolContractID,
			BidReference:    bidReference,
			RefundReference: refundReference,
			CommandID:       fmt.Sprintf("expire-bid-%s", pledge.ID),
		})
		if err != nil {
			if resetErr := w.store.ResetExpirySubmitted(ctx, property.ID); resetErr != nil {
				observability.CaptureError(fmt.Errorf("reset expiry submitted for %s: %w", property.ID, resetErr))
			}
			return fmt.Errorf("expire bid %s: %w", pledge.ID, err)
		}
		poolContractID = nextPoolContractID
	}

	if _, err := w.cantonClient.SubmitExpirePool(ctx, canton.ExpirePoolCommand{
		PoolContractID: poolContractID,
		Reason:         w.expiryReason,
		CommandID:      fmt.Sprintf("expire-pool-%s", property.ID),
	}); err != nil {
		if resetErr := w.store.ResetExpirySubmitted(ctx, property.ID); resetErr != nil {
			observability.CaptureError(fmt.Errorf("reset expiry submitted for %s: %w", property.ID, resetErr))
		}
		return fmt.Errorf("submit expire pool: %w", err)
	}

	if err := w.store.ReconcileExpiredProperty(ctx, property.ID); err != nil {
		return fmt.Errorf("reconcile expired property: %w", err)
	}

	log.Printf("expiry-cron: property %s expired and pledges refunded", property.ID)
	return nil
}

func pledgeBidReference(metaURIBase, idempotencyKey string) string {
	return fmt.Sprintf("%s/%s", metaURIBase, idempotencyKey)
}
