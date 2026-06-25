import { LedgerApiError } from '@c7/ledger';

export function formatCantonError(error: unknown): string {
  if (error instanceof LedgerApiError) {
    if (error.cantonError?.cause) {
      return error.cantonError.cause;
    }

    if (error.message) {
      return error.message;
    }

    return `Canton ledger request failed (${error.status} ${error.statusText})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Pledge submission failed';
}
