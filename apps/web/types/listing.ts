export type PropertyListingType =
  | 'residential'
  | 'commercial'
  | 'mixed_use'
  | 'other';

export type PropertyListingRequestStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'rejected';

export type PropertyListingFormValues = {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  property_title: string;
  property_description: string;
  property_type: PropertyListingType;
  address_line1: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  total_units: number;
  unit_price: number;
  estimated_annual_yield: number;
  image_url: string;
  additional_notes: string;
};

export type PropertyListingRequestRow = PropertyListingFormValues & {
  id: string;
  submitter_id: string;
  canton_party_id: string | null;
  status: PropertyListingRequestStatus;
  created_at: string;
  updated_at: string;
};
