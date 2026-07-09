package canton

// PrepareExecuteParams mirrors the Canton dApp SDK prepareExecute parameter schema
// (CIP-103 prepareExecuteAndWait).
type PrepareExecuteParams struct {
	CommandID          string        `json:"commandId"`
	Commands           []interface{} `json:"commands"`
	ActAs              []string      `json:"actAs"`
	ReadAs             []string      `json:"readAs"`
	DisclosedContracts []interface{} `json:"disclosedContracts"`
}

// ToPrepareExecuteParams maps a PreparedLedgerCommand into WalletConnect-ready params.
func ToPrepareExecuteParams(prepared PreparedLedgerCommand) PrepareExecuteParams {
	loopSubmit := prepared.LoopSubmit
	commands := loopSubmit.Commands
	if commands == nil {
		commands = []interface{}{}
	}
	disclosed := loopSubmit.DisclosedContracts
	if disclosed == nil {
		disclosed = []interface{}{}
	}

	commandID := loopSubmit.CommandID
	if commandID == "" {
		commandID = prepared.CommandID
	}

	return PrepareExecuteParams{
		CommandID:          commandID,
		Commands:           commands,
		ActAs:              loopSubmit.ActAs,
		ReadAs:             loopSubmit.ReadAs,
		DisclosedContracts: disclosed,
	}
}
