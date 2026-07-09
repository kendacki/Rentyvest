// One-off migration runner: go run ./cmd/applymigration [path-to.sql]
package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	sqlPath := filepath.Join("..", "..", "supabase", "migrations", "006_faucet_party_claims.sql")
	if len(os.Args) > 1 {
		sqlPath = os.Args[1]
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "DATABASE_URL is not set")
		os.Exit(1)
	}

	sqlBytes, err := os.ReadFile(sqlPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read migration: %v\n", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		fmt.Fprintf(os.Stderr, "connect: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	if _, err := pool.Exec(ctx, string(sqlBytes)); err != nil {
		fmt.Fprintf(os.Stderr, "apply migration: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Applied", sqlPath)
}
