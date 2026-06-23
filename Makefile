# RentyVest Canton DevNet deployment automation
#
# Prerequisites:
#   - Daml SDK 3.4.x installed (`daml` on PATH) — matches Canton Network DevNet
#   - `.env` at repo root with your validator participant settings (see `.env.example`)
#
# Expected .env variables:
#   CANTON_NETWORK=devnet
#   CANTON_JSON_API_URL=https://participant.example.com:3975   (JSON Ledger API v2)
#   CANTON_LEDGER_HOST=participant.example.com                   (gRPC Ledger API host)
#   CANTON_LEDGER_PORT=3901                                      (gRPC Ledger API port)
#   CANTON_LEDGER_TLS=true                                       (required for remote DevNet)
#   CANTON_JWT=<ledger-api-jwt>                                  (OIDC token for secured participants)

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

DAML_DIR := daml
DAML_NAME := rentyvest
DAML_VERSION := 0.1.0
DAR_BUILT := $(DAML_DIR)/.daml/dist/$(DAML_NAME)-$(DAML_VERSION).dar
RENTYVEST_DAR := $(DAML_DIR)/.daml/dist/RentyVest.dar
TOKEN_FILE := $(DAML_DIR)/.canton-token.tmp
DEVNET_INIT_SCRIPT := RentyVest.Init:setupDevnet
DEVNET_DEPLOY_SCRIPT := RentyVest.Init:deployDevnet
# Legacy aliases retained for backward compatibility.
TESTNET_INIT_SCRIPT := RentyVest.Init:setupTestnet
TESTNET_DEPLOY_SCRIPT := RentyVest.Init:deployTestnet

ifneq (,$(wildcard .env))
include .env
export
endif

CANTON_NETWORK ?= devnet
CANTON_JSON_API_URL ?= http://127.0.0.1:7575

# Parse host/port from CANTON_JSON_API_URL unless explicitly overridden.
CANTON_LEDGER_HOST ?= $(shell echo "$(CANTON_JSON_API_URL)" | sed -E 's|^[a-zA-Z]+://([^:/]+).*|\1|')
CANTON_LEDGER_PORT ?= $(shell echo "$(CANTON_JSON_API_URL)" | sed -E -n 's|^[a-zA-Z]+://[^:/]+:([0-9]+).*|\1|p')
ifeq ($(CANTON_LEDGER_PORT),)
CANTON_LEDGER_PORT := 7575
endif

LEDGER_AUTH_FLAGS :=
ifdef CANTON_JWT
LEDGER_AUTH_FLAGS := --access-token-file $(TOKEN_FILE)
endif

LEDGER_TLS_FLAGS :=
ifeq ($(CANTON_LEDGER_TLS),true)
LEDGER_TLS_FLAGS := --tls
endif
ifneq (,$(findstring https://,$(CANTON_JSON_API_URL)))
ifeq ($(CANTON_LEDGER_TLS),)
LEDGER_TLS_FLAGS := --tls
endif
endif

LEDGER_UPLOAD_TIMEOUT := --timeout 120

.PHONY: help build-contracts deploy-devnet init-devnet deploy-contracts deploy-all \
        deploy-testnet init-testnet clean-contracts

help:
	@echo "RentyVest Canton deployment targets (network: $(CANTON_NETWORK)):"
	@echo "  make build-contracts    Compile Daml sources and produce RentyVest.dar"
	@echo "  make deploy-devnet      Upload RentyVest.dar to your DevNet participant"
	@echo "  make init-devnet        Allocate platform parties only"
	@echo "  make deploy-contracts   Instantiate all on-ledger contracts (USDC, demo pool)"
	@echo "  make deploy-all         Upload DAR + deploy all contract instances"
	@echo "  make deploy-testnet     Alias for deploy-devnet (legacy)"
	@echo "  make init-testnet       Alias for init-devnet (legacy)"
	@echo "  make clean-contracts    Remove compiled Daml artifacts"

build-contracts:
	@echo "==> Building RentyVest Daml contracts in $(DAML_DIR)/ (SDK 3.4.x / DevNet)"
	cd $(DAML_DIR) && daml build
	@echo "==> Packaging canonical artifact as $(RENTYVEST_DAR)"
	@cp "$(DAR_BUILT)" "$(RENTYVEST_DAR)"
	@echo "==> Build complete."
	@echo "    Source DAR : $(DAR_BUILT)"
	@echo "    Deploy DAR : $(RENTYVEST_DAR)"

deploy-devnet: build-contracts
	@echo "==> Deploying $(RENTYVEST_DAR) to Canton $(CANTON_NETWORK)"
	@echo "    gRPC host: $(CANTON_LEDGER_HOST)"
	@echo "    gRPC port: $(CANTON_LEDGER_PORT)"
	@echo "    JSON API : $(CANTON_JSON_API_URL)"
ifdef CANTON_JWT
	@echo "    Auth: CANTON_JWT provided (writing temporary token file)"
	@printf '%s' "$(CANTON_JWT)" > "$(TOKEN_FILE)"
endif
	cd $(DAML_DIR) && daml ledger upload-dar "$(abspath $(RENTYVEST_DAR))" \
		--host "$(CANTON_LEDGER_HOST)" \
		--port "$(CANTON_LEDGER_PORT)" \
		$(LEDGER_TLS_FLAGS) \
		$(LEDGER_UPLOAD_TIMEOUT) \
		$(LEDGER_AUTH_FLAGS)
	@echo "==> DAR uploaded successfully."
	@echo "    Next step: make deploy-contracts"

init-devnet: build-contracts
	@echo "==> Running Daml script $(DEVNET_INIT_SCRIPT) on Canton $(CANTON_NETWORK)"
	@echo "    gRPC host: $(CANTON_LEDGER_HOST)"
	@echo "    gRPC port: $(CANTON_LEDGER_PORT)"
ifdef CANTON_JWT
	@echo "    Auth: CANTON_JWT provided (writing temporary token file)"
	@printf '%s' "$(CANTON_JWT)" > "$(TOKEN_FILE)"
endif
	cd $(DAML_DIR) && daml script \
		--dar "$(abspath $(RENTYVEST_DAR))" \
		--script-name "$(DEVNET_INIT_SCRIPT)" \
		--host "$(CANTON_LEDGER_HOST)" \
		--port "$(CANTON_LEDGER_PORT)" \
		$(LEDGER_TLS_FLAGS) \
		$(LEDGER_AUTH_FLAGS)
	@echo "==> DevNet initialization complete."
	@echo "    Copy the party IDs printed above into services/core-api/.env:"
	@echo "      CANTON_ACT_AS_PARTY"
	@echo "      CANTON_READ_AS_PARTY"
	@echo "      CANTON_PROP_MANAGER_PARTY"

deploy-contracts: build-contracts
	@echo "==> Running Daml script $(DEVNET_DEPLOY_SCRIPT) on Canton $(CANTON_NETWORK)"
	@echo "    gRPC host: $(CANTON_LEDGER_HOST)"
	@echo "    gRPC port: $(CANTON_LEDGER_PORT)"
ifdef CANTON_JWT
	@echo "    Auth: CANTON_JWT provided (writing temporary token file)"
	@printf '%s' "$(CANTON_JWT)" > "$(TOKEN_FILE)"
endif
	cd $(DAML_DIR) && daml script \
		--dar "$(abspath $(RENTYVEST_DAR))" \
		--script-name "$(DEVNET_DEPLOY_SCRIPT)" \
		--host "$(CANTON_LEDGER_HOST)" \
		--port "$(CANTON_LEDGER_PORT)" \
		$(LEDGER_TLS_FLAGS) \
		$(LEDGER_AUTH_FLAGS)
	@echo "==> Contract deployment complete."
	@echo "    Copy contract IDs from script output into services/core-api/.env:"
	@echo "      CANTON_USDC_ISSUER_CONTRACT_ID"
	@echo "      CANTON_DEMO_POOL_CONTRACT_ID"

deploy-all: deploy-devnet deploy-contracts
	@echo "==> Full deployment complete (DAR uploaded + contracts instantiated on $(CANTON_NETWORK))."

deploy-testnet: deploy-devnet

init-testnet: init-devnet

clean-contracts:
	@echo "==> Removing Daml build artifacts"
	rm -rf "$(DAML_DIR)/.daml/dist" "$(DAML_DIR)/.daml/artifacts" "$(TOKEN_FILE)"
	@echo "==> Clean complete."
