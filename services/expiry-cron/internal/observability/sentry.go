package observability

import (
	"log"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
)

func InitSentry() func() {
	dsn := os.Getenv("SENTRY_DSN")
	if dsn == "" {
		return func() {}
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      os.Getenv("SENTRY_ENVIRONMENT"),
		Release:          os.Getenv("SENTRY_RELEASE"),
		TracesSampleRate: 0.1,
	})
	if err != nil {
		log.Printf("sentry init failed: %v", err)
		return func() {}
	}

	log.Printf("sentry initialized")
	return func() {
		sentry.Flush(2 * time.Second)
	}
}

func CaptureError(err error) {
	if err == nil {
		return
	}

	log.Printf("expiry-cron error: %v", err)
	sentry.CaptureException(err)
}
