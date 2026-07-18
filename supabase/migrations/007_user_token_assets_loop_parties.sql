-- Allow Loop wallet parties (no users row) to own indexed token assets.
-- Faucet writes canton_party_id into user_id, which breaks the users FK.

ALTER TABLE public.user_token_assets
  DROP CONSTRAINT IF EXISTS user_token_assets_user_id_fkey;

COMMENT ON COLUMN public.user_token_assets.user_id IS
  'Privy user id OR Canton party id for Loop-only wallets (no users FK).';
