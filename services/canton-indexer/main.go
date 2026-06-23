package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rentyvest/canton-indexer/internal/db"
	"github.com/rentyvest/canton-indexer/internal/realtime"
	"github.com/rentyvest/canton-indexer/stream"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	connectCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	pool, err := db.Connect(connectCtx)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	store := db.NewStore(pool)

	broadcaster, err := realtime.NewBroadcaster()
	if err != nil {
		log.Printf("realtime broadcaster disabled: %v", err)
	}

	consumer, err := stream.NewConsumer(store, broadcaster, stream.Config{})
	if err != nil {
		log.Fatalf("canton indexer consumer init failed: %v", err)
	}

	if err := consumer.Run(ctx); err != nil && err != context.Canceled {
		log.Fatalf("canton indexer stopped with error: %v", err)
	}
}
