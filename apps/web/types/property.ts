export type PropertyStatus =
  | 'draft'
  | 'active'
  | 'funded'
  | 'closed'
  | 'archived';

export type PropertyRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  total_units: number;
  unit_price: number | string;
  slots_filled: number;
  canton_pool_contract_id: string | null;
  estimated_annual_yield: number | string;
  status: PropertyStatus;
  listed_at: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  total_units: number;
  unit_price: number;
  slots_filled: number;
  canton_pool_contract_id: string | null;
  estimated_annual_yield: number;
  status: PropertyStatus;
  listed_at: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyUpdatePayload = Pick<PropertyRow, 'id' | 'slots_filled'>;

export function normalizeProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    description: row.description,
    address_line1: row.address_line1,
    city: row.city,
    state: row.state,
    country: row.country,
    postal_code: row.postal_code,
    total_units: row.total_units,
    unit_price: Number(row.unit_price),
    slots_filled: row.slots_filled,
    canton_pool_contract_id: row.canton_pool_contract_id ?? null,
    estimated_annual_yield: Number(row.estimated_annual_yield),
    status: row.status,
    listed_at: row.listed_at,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getSlotsRemaining(property: Property): number {
  return Math.max(property.total_units - property.slots_filled, 0);
}

export function getSlotFillPercent(property: Property): number {
  if (property.total_units <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((property.slots_filled / property.total_units) * 100),
  );
}
