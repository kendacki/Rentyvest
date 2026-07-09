package canton

// LoopWalletSubmitPayload is the JSON shape consumed by Loop SDK
// submitAndWaitForTransaction (see apps/web LoopWalletProvider).
type LoopWalletSubmitPayload struct {
	ActAs              []string      `json:"actAs"`
	ReadAs             []string      `json:"readAs"`
	CommandID          string        `json:"commandId,omitempty"`
	DisclosedContracts []interface{} `json:"disclosedContracts"`
	Commands           []interface{} `json:"commands"`
}

// PreparedLedgerCommand is returned by prepare endpoints; the frontend submits
// loop_submit via Loop Wallet — core-api never signs or executes it.
type PreparedLedgerCommand struct {
	CommandID       string                  `json:"command_id"`
	TemplateID      string                  `json:"template_id"`
	ContractID      string                  `json:"contract_id"`
	Choice          string                  `json:"choice"`
	ChoiceArgument  map[string]interface{}  `json:"choice_argument"`
	ControllerNote  string                  `json:"controller_note,omitempty"`
	LoopSubmit      LoopWalletSubmitPayload `json:"loop_submit"`
}
