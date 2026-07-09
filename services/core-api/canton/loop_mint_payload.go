package canton

import (
	"encoding/json"
	"log"
)

// LoopMintSubmitPreview mirrors the JSON shape passed to Loop Wallet
// submitAndWaitForTransaction from apps/web/lib/faucet/loopMint.ts.
type LoopMintSubmitPreview struct {
	ActAs              []string      `json:"actAs"`
	ReadAs             []string      `json:"readAs"`
	CommandID          string        `json:"commandId,omitempty"`
	DisclosedContracts []interface{} `json:"disclosedContracts"`
	Commands           []interface{} `json:"commands"`
}

// FaucetMintDiagnostics documents Canton identifiers and both Loop/backend payloads.
type FaucetMintDiagnostics struct {
	PackageID           string `json:"package_id"`
	QualifiedTemplateID string `json:"qualified_template_id"`
	IssuerContractID    string `json:"issuer_contract_id"`
	AdminPartyID        string `json:"admin_party_id"`
	OwnerPartyID        string `json:"owner_party_id"`
	MintAmount          string `json:"mint_amount"`
	MintChoice          string `json:"mint_choice"`
	MintChoiceArguments map[string]interface{} `json:"mint_choice_arguments"`
	// Mint on-ledger is controlled by platform_admin only (see TestUSDC.daml).
	MintControllerNote string `json:"mint_controller_note"`
	// What the frontend currently sends to Loop (includes owner in actAs).
	LoopPayloadFrontend LoopMintSubmitPreview `json:"loop_payload_frontend_current"`
	// What core-api uses for backend-only mint (admin actAs only).
	CantonSubmitBackend submitRequest `json:"canton_submit_backend"`
	EnvHints            []string      `json:"env_hints,omitempty"`
}

// BuildFaucetMintDiagnostics constructs debug payloads for faucet prepare responses.
func BuildFaucetMintDiagnostics(
	adminPartyID,
	ownerPartyID,
	qualifiedTemplateID,
	issuerContractID,
	mintAmount,
	commandID,
	ledgerUserID string,
) FaucetMintDiagnostics {
	if ledgerUserID == "" {
		ledgerUserID = "6"
	}

	choiceArgs := map[string]interface{}{
		"owner":     ownerPartyID,
		"amount":    mintAmount,
		"observers": []string{},
	}

	exercise := exerciseCommand{
		ExerciseCommand: exercisePayload{
			TemplateID:     qualifiedTemplateID,
			ContractID:     issuerContractID,
			Choice:         "Mint",
			ChoiceArgument: choiceArgs,
		},
	}

	frontendPreview := LoopMintSubmitPreview{
		ActAs:              []string{adminPartyID, ownerPartyID},
		ReadAs:             []string{adminPartyID, ownerPartyID},
		DisclosedContracts: []interface{}{},
		Commands:           []interface{}{exercise},
	}

	backendSubmit := submitRequest{
		ActAs:     []string{adminPartyID},
		ReadAs:    []string{adminPartyID},
		UserID:    ledgerUserID,
		CommandID: commandID,
		Commands:  []interface{}{exercise},
	}

	packageID := PackageIDFromEnv()
	hints := []string{
		"Update CANTON_DAML_PACKAGE_ID and CANTON_USDC_ISSUER_CONTRACT_ID in root .env when redeploying DAR or creating a new USDCIssuer.",
		"Qualified template id is built from CANTON_DAML_PACKAGE_ID + CANTON_TEMPLATE_USDC_ISSUER (see canton/qualified.go).",
		"Mint choice arguments must be { owner, amount, observers } — no meta.values wrapper.",
		"Loop prepare 500 often means actAs includes a party the Loop wallet cannot sign (platform_admin). Mint controller is platform_admin only.",
	}

	return FaucetMintDiagnostics{
		PackageID:           packageID,
		QualifiedTemplateID: qualifiedTemplateID,
		IssuerContractID:    issuerContractID,
		AdminPartyID:        adminPartyID,
		OwnerPartyID:        ownerPartyID,
		MintAmount:          mintAmount,
		MintChoice:          "Mint",
		MintChoiceArguments: choiceArgs,
		MintControllerNote:  "RentyVest.TestUSDC:USDCIssuer.Mint is controlled by platform_admin only; Loop users cannot act as platform_admin.",
		LoopPayloadFrontend: frontendPreview,
		CantonSubmitBackend: backendSubmit,
		EnvHints:            hints,
	}
}

// LogFaucetMintDiagnostics prints the diagnostics JSON to core-api stdout.
func LogFaucetMintDiagnostics(d FaucetMintDiagnostics) {
	payload, err := json.Marshal(d)
	if err != nil {
		log.Printf("[faucet/prepare] diagnostics marshal error: %v", err)
		return
	}
	log.Printf("[faucet/prepare] diagnostics=%s", string(payload))
}
