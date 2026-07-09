import type { PrepareExecuteParams } from '@canton-network/dapp-sdk';
import type {
  LoopWalletSubmitPayload,
  PrepareExecutePayload,
  PreparedLedgerCommand,
} from '../../types/ledger';

function normalizeCommands(
  commands: LoopWalletSubmitPayload['commands'],
): PrepareExecuteParams['commands'] {
  if (Array.isArray(commands)) {
    return commands as PrepareExecuteParams['commands'];
  }

  if (commands && typeof commands === 'object') {
    const entries = Object.entries(commands as Record<string, unknown>).sort(
      ([left], [right]) => Number(left) - Number(right),
    );
    return entries.map(([, command]) => command) as PrepareExecuteParams['commands'];
  }

  return [];
}

export function toPrepareExecuteParams(
  prepared: PreparedLedgerCommand,
): PrepareExecuteParams {
  const loopSubmit = prepared.loop_submit;

  return {
    commandId: loopSubmit.commandId ?? prepared.command_id,
    commands: normalizeCommands(loopSubmit.commands),
    actAs: loopSubmit.actAs,
    readAs: loopSubmit.readAs,
    disclosedContracts: (loopSubmit.disclosedContracts ??
      []) as PrepareExecuteParams['disclosedContracts'],
  };
}

/** Prefer API `prepare_execute` when present (transfer-nft endpoint). */
export function resolvePrepareExecuteParams(
  prepared: PreparedLedgerCommand,
  prepareExecute?: PrepareExecutePayload,
): PrepareExecuteParams {
  if (prepareExecute) {
    return {
      commandId: prepareExecute.commandId,
      commands: prepareExecute.commands as PrepareExecuteParams['commands'],
      actAs: prepareExecute.actAs,
      readAs: prepareExecute.readAs,
      disclosedContracts: (prepareExecute.disclosedContracts ??
        []) as PrepareExecuteParams['disclosedContracts'],
    };
  }

  return toPrepareExecuteParams(prepared);
}
