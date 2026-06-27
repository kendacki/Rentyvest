type PrepareFaucetClaimResponse = {
  amount: string;
  symbol: string;
  canton_party_id: string;
  admin_party_id: string;
  issuer_contract_id: string;
  template_id: string;
  command_id: string;
};

type LoopProvider = {
  submitAndWaitForTransaction: (
    payload: {
      commands: unknown[];
      disclosedContracts: unknown[];
      actAs?: string[];
      readAs?: string[];
    },
    options?: { message?: string },
  ) => Promise<{
    command_id?: string;
    update_id?: string;
    update_data?: unknown;
  }>;
};

function findCreatedAssetContractId(updateData: unknown): string {
  const suffix = ':Asset';

  const visit = (node: unknown): string => {
    if (!node || typeof node !== 'object') {
      return '';
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        const found = visit(child);
        if (found) {
          return found;
        }
      }
      return '';
    }

    const record = node as Record<string, unknown>;
    const contractId =
      typeof record.contractId === 'string'
        ? record.contractId
        : typeof record.contract_id === 'string'
          ? record.contract_id
          : '';

    const templateId =
      typeof record.templateId === 'string'
        ? record.templateId
        : typeof record.template_id === 'string'
          ? record.template_id
          : '';

    if (contractId && templateId.endsWith(suffix)) {
      return contractId;
    }

    for (const value of Object.values(record)) {
      const found = visit(value);
      if (found) {
        return found;
      }
    }

    return '';
  };

  return visit(updateData);
}

export async function claimFaucetViaLoop(
  apiUrl: string,
  partyId: string,
  provider: LoopProvider,
): Promise<{ commandId: string; holdingContractId: string; updateId?: string }> {
  const prepareResponse = await fetch(`${apiUrl}/faucet/usdc/prepare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Canton-Party-Id': partyId,
    },
    body: JSON.stringify({ canton_party_id: partyId }),
  });

  if (!prepareResponse.ok) {
    const problem = await prepareResponse.json().catch(() => null);
    throw new Error(
      typeof problem?.detail === 'string'
        ? problem.detail
        : `Faucet prepare failed (${prepareResponse.status})`,
    );
  }

  const prepared = (await prepareResponse.json()) as PrepareFaucetClaimResponse;

  const loopResult = await provider.submitAndWaitForTransaction(
    {
      actAs: [prepared.admin_party_id, partyId],
      readAs: [prepared.admin_party_id, partyId],
      disclosedContracts: [],
      commands: [
        {
          ExerciseCommand: {
            templateId: prepared.template_id,
            contractId: prepared.issuer_contract_id,
            choice: 'Mint',
            choiceArgument: {
              owner: partyId,
              amount: prepared.amount,
              observers: [],
            },
          },
        },
      ],
    },
    { message: 'Approve test USDC faucet claim in Loop' },
  );

  const holdingContractId = findCreatedAssetContractId(loopResult.update_data);
  const commandId = loopResult.command_id ?? prepared.command_id;

  const completeResponse = await fetch(`${apiUrl}/faucet/usdc/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Canton-Party-Id': partyId,
    },
    body: JSON.stringify({
      canton_party_id: partyId,
      canton_command_id: commandId,
      canton_update_id: loopResult.update_id,
      canton_holding_contract_id: holdingContractId,
    }),
  });

  if (!completeResponse.ok) {
    const problem = await completeResponse.json().catch(() => null);
    throw new Error(
      typeof problem?.detail === 'string'
        ? problem.detail
        : `Faucet finalize failed (${completeResponse.status})`,
    );
  }

  return {
    commandId,
    holdingContractId,
    updateId: loopResult.update_id,
  };
}
