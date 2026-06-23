package canton

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/rentyvest/core-api/internal/db"
	"golang.org/x/time/rate"
)

const (
	defaultPollInterval   = 15 * time.Second
	defaultSubmissionsPer = 10
)

type Worker struct {
	store    *db.Store
	client   *Client
	limiter  *rate.Limiter
	interval time.Duration
}

func NewWorker(store *db.Store, client *Client) *Worker {
	interval := defaultPollInterval
	if raw := os.Getenv("CANTON_WORKER_POLL_INTERVAL"); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
			interval = parsed
		}
	}

	submissionsPerSecond := defaultSubmissionsPer
	if raw := os.Getenv("CANTON_SUBMISSIONS_PER_SECOND"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			submissionsPerSecond = parsed
		}
	}

	return &Worker{
		store:    store,
		client:   client,
		limiter:  rate.NewLimiter(rate.Limit(submissionsPerSecond), submissionsPerSecond),
		interval: interval,
	}
}

func (w *Worker) Start(ctx context.Context) {
	log.Printf(
		"canton pledge worker started (poll=%s, rate=%.0f/s)",
		w.interval,
		float64(w.limiter.Limit()),
	)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	w.poll(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Printf("canton pledge worker stopped: %v", ctx.Err())
			return
		case <-ticker.C:
			w.poll(ctx)
		}
	}
}

func (w *Worker) poll(parent context.Context) {
	ctx, cancel := context.WithTimeout(parent, 2*time.Minute)
	defer cancel()

	jobs, err := w.store.ListPendingCantonPledges(ctx, 100)
	if err != nil {
		log.Printf("canton worker: failed to list pending pledges: %v", err)
		return
	}

	if len(jobs) == 0 {
		return
	}

	log.Printf("canton worker: processing %d pending pledge submissions", len(jobs))

	for _, job := range jobs {
		if err := w.limiter.Wait(ctx); err != nil {
			log.Printf("canton worker: rate limiter interrupted: %v", err)
			return
		}

		if err := w.submitJob(ctx, job); err != nil {
			log.Printf("canton worker: pledge %s submission failed: %v", job.PledgeID, err)
			if markErr := w.store.MarkCantonPledgeFailed(ctx, job.PledgeID, err.Error()); markErr != nil {
				log.Printf("canton worker: failed to mark pledge %s failed: %v", job.PledgeID, markErr)
			}
			continue
		}

		if err := w.store.MarkCantonPledgeSubmitted(ctx, job.PledgeID); err != nil {
			log.Printf("canton worker: failed to mark pledge %s submitted: %v", job.PledgeID, err)
			continue
		}

		log.Printf("canton worker: pledge %s submitted to Canton", job.PledgeID)
	}
}

func (w *Worker) submitJob(ctx context.Context, job db.CantonPledgeJob) error {
	return fmt.Errorf("legacy async canton pledge worker is deprecated; submit pledges via POST /pledges with payment_asset_contract_id")
}
