package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/rentyvest/core-api/canton"
	"github.com/rentyvest/core-api/handlers"
	"github.com/rentyvest/core-api/internal/db"
	"github.com/rentyvest/core-api/internal/httpmw"
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

	tokenManager, err := canton.NewM2MTokenManagerFromEnv()
	if err != nil {
		log.Fatalf("canton m2m token manager: %v", err)
	}

	cantonCfg := canton.Config{}
	if tokenManager != nil {
		cantonCfg.TokenSource = tokenManager
		if _, err := tokenManager.AccessToken(context.Background()); err != nil {
			log.Printf(
				"WARNING: canton m2m token fetch failed: %v — ledger submits will fail until OAuth credentials are fixed",
				err,
			)
		} else {
			log.Printf("canton m2m oauth token acquired; refresh every %s", tokenManager.RefreshInterval())
		}
	}

	cantonClient, err := canton.NewClient(cantonCfg)
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	if err != nil {
		log.Printf("canton client disabled: %v", err)
	} else {
		if tokenManager != nil {
			go tokenManager.Start(workerCtx)
		}
		worker := canton.NewWorker(store, cantonClient)
		go worker.Start(workerCtx)
	}

	authHandler := handlers.NewAuthHandler(verifier, supabaseJWTSecret, tokenManager)
	propertiesHandler := handlers.NewPropertiesHandler(store)
	pledgesHandler := handlers.NewPledgesHandler(store, verifier, cantonClient)
	faucetHandler := handlers.NewFaucetHandler(store, cantonClient)
	assetsHandler := handlers.NewAssetsHandler(store, verifier, cantonClient)

	mux := http.NewServeMux()
	mux.HandleFunc("/auth/exchange", authHandler.Exchange)
	mux.HandleFunc("/properties", propertiesHandler.List)
	mux.HandleFunc("/pledges", pledgesHandler.Create)
	mux.HandleFunc("/pledges/flw-webhook", pledgesHandler.FlutterwaveWebhook)
	mux.HandleFunc("/faucet/usdc", faucetHandler.ClaimUSDC)
	mux.HandleFunc("/faucet/usdc/prepare", faucetHandler.PrepareClaim)
	mux.HandleFunc("/faucet/usdc/complete", faucetHandler.CompleteClaim)
	mux.HandleFunc("/faucet/assets", faucetHandler.ListAssetsByParty)
	mux.HandleFunc("/nfts/assets", assetsHandler.ListAssets)
	mux.HandleFunc("/nfts/assets/merge", assetsHandler.MergeAssets)

	addr := os.Getenv("PORT")
	if addr == "" {
		addr = "8080"
	}

	log.Printf("core-api listening on :%s", addr)

	allowedOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	}
	if extra := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS")); extra != "" {
		for _, origin := range strings.Split(extra, ",") {
			if trimmed := strings.TrimSpace(origin); trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}

	handler := httpmw.CORS(allowedOrigins, mux)
	if err := http.ListenAndServe(":"+addr, handler); err != nil {
		log.Fatal(err)
	}
}
