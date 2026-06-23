export type Pledge = {
  id: string;
  user_id: string;
  property_id: string;
  units: number;
  amount: string;
  currency: string;
  status: string;
  payment_method?: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};
