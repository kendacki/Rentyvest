type ClaimUSDCResponse = {
  amount: string;
  symbol: string;
  canton_party_id: string;
  canton_holding_contract_id?: string;
  canton_command_id: string;
  claimed_at: string;
};

type ProblemDetails = {
  detail?: string;
  title?: string;
  code?: string;
};

/**
 * Mint test USDC via core-api M2M (admin signs on Canton).
 * Loop wallet is used only to connect and supply the recipient party id.
 */
export async function claimFaucetViaBackend(
  apiUrl: string,
  partyId: string,
): Promise<{ commandId: string; holdingContractId: string }> {
  const response = await fetch(`${apiUrl}/faucet/usdc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Canton-Party-Id': partyId,
    },
    body: JSON.stringify({ canton_party_id: partyId }),
  });

  if (!response.ok) {
    let message = `Faucet claim failed (${response.status})`;
    try {
      const problem = (await response.json()) as ProblemDetails;
      if (problem.detail) {
        message = problem.detail;
      } else if (problem.title) {
        message = problem.title;
      }
    } catch {
      // Response body was not JSON.
    }
    throw new Error(message);
  }

  const data = (await response.json()) as ClaimUSDCResponse;

  return {
    commandId: data.canton_command_id,
    holdingContractId: data.canton_holding_contract_id ?? '',
  };
}
