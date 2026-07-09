package handlers

import (
	"log"
	"os"
	"strings"

	"github.com/rentyvest/core-api/canton"
)

func (h *FaucetHandler) buildPrepareDiagnostics(
	cantonPartyID,
	issuerContractID,
	commandID string,
) canton.FaucetMintDiagnostics {
	adminParty := ""
	templateID := ""
	ledgerUserID := strings.TrimSpace(os.Getenv("CANTON_LEDGER_USER_ID"))

	if h.cantonClient != nil {
		adminParty = h.cantonClient.AdminPartyID()
		templateID = h.cantonClient.TemplateUSDCIssuerID()
	}

	diagnostics := canton.BuildFaucetMintDiagnostics(
		adminParty,
		cantonPartyID,
		templateID,
		issuerContractID,
		h.mintAmount,
		commandID,
		ledgerUserID,
	)

	canton.LogFaucetMintDiagnostics(diagnostics)

	log.Printf(
		"[faucet/prepare] owner=%s admin=%s package=%s template=%s issuer=%s amount=%s commandId=%s",
		cantonPartyID,
		adminParty,
		diagnostics.PackageID,
		templateID,
		issuerContractID,
		h.mintAmount,
		commandID,
	)

	return diagnostics
}
