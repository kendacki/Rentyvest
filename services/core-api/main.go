package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/handlers"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/privy"
)

func main() {
	privyAppID := os.Getenv("PRIVY_APP_ID")
	if privyAppID == "" {
		log.Fatal("PRIVY_APP_ID is required")
	}

	supabaseJWTSecret := os.Getenv("SUPABASE_JWT_SECRET")
	if supabaseJWTSecret == "" {
		log.Fatal("SUPABASE_JWT_SECRET is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	store := db.NewStore(pool)

	verifier := privy.NewVerifier(privy.Config{
		AppID:    privyAppID,
		CacheTTL: time.Hour,
	})

	authHandler := handlers.NewAuthHandler(verifier, supabaseJWTSecret)
	propertiesHandler := handlers.NewPropertiesHandler(store)
	pledgesHandler := handlers.NewPledgesHandler(store, verifier, cantonClient)

	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	cantonClient, err := canton.NewClient(canton.Config{})
	if err != nil {
		log.Printf("canton client disabled: %v", err)
	} else {
		worker := canton.NewWorker(store, cantonClient)
		go worker.Start(workerCtx)
	}

	faucetHandler := handlers.NewFaucetHandler(store, verifier, cantonClient)

	assetsHandler := handlers.NewAssetsHandler(store, verifier, cantonClient)

	mux := http.NewServeMux()
	mux.HandleFunc("/auth/exchange", authHandler.Exchange)
	mux.HandleFunc("/properties", propertiesHandler.List)
	mux.HandleFunc("/pledges", pledgesHandler.Create)
	mux.HandleFunc("/pledges/flw-webhook", pledgesHandler.FlutterwaveWebhook)
	mux.HandleFunc("/faucet/usdc", faucetHandler.ClaimUSDC)
	mux.HandleFunc("/nfts/assets", assetsHandler.ListAssets)
	mux.HandleFunc("/nfts/assets/merge", assetsHandler.MergeAssets)

	addr := os.Getenv("PORT")
	if addr == "" {
		addr = "8080"
	}

	log.Printf("core-api listening on :%s", addr)
	if err := http.ListenAndServe(":"+addr, mux); err != nil {
		log.Fatal(err)
	}
}
