'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useCantonWallet } from '../../providers/CantonWalletProvider';
import type { PropertyListingFormValues } from '../../types/listing';

const listingSchema = z.object({
  contact_name: z.string().trim().min(2, 'Enter your full name'),
  contact_email: z.string().trim().email('Enter a valid email address'),
  contact_phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? ''),
  property_title: z.string().trim().min(4, 'Property title is required'),
  property_description: z
    .string()
    .trim()
    .min(40, 'Describe the property in at least 40 characters'),
  property_type: z.enum(['residential', 'commercial', 'mixed_use', 'other']),
  address_line1: z.string().trim().min(4, 'Street address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State or region is required'),
  country: z.string().trim().min(2, 'Country is required'),
  postal_code: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? ''),
  total_units: z.coerce
    .number()
    .int('Slots must be a whole number')
    .min(1, 'Offer at least 1 fractional slot')
    .max(10000, 'Contact us for pools above 10,000 slots'),
  unit_price: z.coerce
    .number()
    .min(1, 'Slot price must be at least 1 tUSDC'),
  estimated_annual_yield: z.coerce
    .number()
    .min(0, 'Yield cannot be negative')
    .max(100, 'Enter yield as a percentage up to 100'),
  image_url: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? '')
    .refine(
      (value) => value === '' || /^https?:\/\/.+/i.test(value),
      'Image URL must start with http:// or https://',
    ),
  additional_notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? ''),
});

type FormValues = z.infer<typeof listingSchema>;

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20';

const TEXTAREA_CLASS =
  'min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20';

const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function PropertyListingForm() {
  const { user } = usePrivy();
  const { partyId } = useCantonWallet();
  const { supabase, isLoading: isAuthLoading } = useSupabaseAuth();

  const [submitState, setSubmitState] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(listingSchema),
    mode: 'onChange',
    defaultValues: {
      contact_name: '',
      contact_email: user?.email?.address ?? '',
      contact_phone: '',
      property_title: '',
      property_description: '',
      property_type: 'residential',
      address_line1: '',
      city: '',
      state: '',
      country: 'United States',
      postal_code: '',
      total_units: 100,
      unit_price: 1000,
      estimated_annual_yield: 8,
      image_url: '',
      additional_notes: '',
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!user?.id) {
        setSubmitState('error');
        setSubmitMessage('Sign in is required before submitting a listing.');
        return;
      }

      if (!supabase) {
        setSubmitState('error');
        setSubmitMessage(
          isAuthLoading
            ? 'Finishing sign-in. Try again in a moment.'
            : 'Unable to connect to RentyVest services. Refresh and try again.',
        );
        return;
      }

      setSubmitState('submitting');
      setSubmitMessage(null);

      const payload: PropertyListingFormValues = {
        contact_name: values.contact_name,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        property_title: values.property_title,
        property_description: values.property_description,
        property_type: values.property_type,
        address_line1: values.address_line1,
        city: values.city,
        state: values.state,
        country: values.country,
        postal_code: values.postal_code,
        total_units: values.total_units,
        unit_price: values.unit_price,
        estimated_annual_yield: values.estimated_annual_yield,
        image_url: values.image_url,
        additional_notes: values.additional_notes,
      };

      const { error } = await supabase.from('property_listing_requests').insert({
        submitter_id: user.id,
        canton_party_id: partyId ?? null,
        ...payload,
        contact_phone: payload.contact_phone || null,
        postal_code: payload.postal_code || null,
        image_url: payload.image_url || null,
        additional_notes: payload.additional_notes || null,
      });

      if (error) {
        setSubmitState('error');
        setSubmitMessage(
          error.message.includes('property_listing_requests')
            ? 'Listing submissions are not enabled yet. Contact support@rentyvest.com.'
            : error.message,
        );
        return;
      }

      setSubmitState('success');
      setSubmitMessage(
        'Your listing request was received. Our team will review the details and reach out about onboarding your property pool on Canton DevNet.',
      );
      reset({
        contact_name: values.contact_name,
        contact_email: values.contact_email,
        contact_phone: '',
        property_title: '',
        property_description: '',
        property_type: 'residential',
        address_line1: '',
        city: '',
        state: '',
        country: values.country,
        postal_code: '',
        total_units: 100,
        unit_price: 1000,
        estimated_annual_yield: 8,
        image_url: '',
        additional_notes: '',
      });
    },
    [isAuthLoading, partyId, reset, supabase, user?.id],
  );

  if (submitState === 'success') {
    return (
      <article className="card-surface overflow-hidden">
        <div className="border-b border-white/10 bg-black px-5 py-5 sm:px-6">
          <p className="section-label">Listing submitted</p>
          <p className="mt-2 text-sm text-neutral-300">{submitMessage}</p>
        </div>
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-sm text-neutral-600">
            We typically respond within 2–3 business days. You can submit another
            property once review begins.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitState('idle');
              setSubmitMessage(null);
            }}
            className="btn-secondary h-11 w-full text-sm"
          >
            Submit another property
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="card-surface overflow-hidden">
      <div className="border-b border-white/10 bg-black px-5 py-5 sm:px-6">
        <p className="section-label">List on RentyVest</p>
        <p className="mt-2 text-sm text-neutral-300">
          Share your property details to start fractional listing on Canton DevNet.
          Our team reviews each submission before creating an on-chain PropertyPool.
        </p>
      </div>

      <form
        className="space-y-8 px-5 py-6 sm:px-6"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brand-black">Owner contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="contact_name">
                Full name
              </label>
              <input
                id="contact_name"
                type="text"
                autoComplete="name"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('contact_name')}
              />
              <FieldError message={errors.contact_name?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="contact_email">
                Email
              </label>
              <input
                id="contact_email"
                type="email"
                autoComplete="email"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('contact_email')}
              />
              <FieldError message={errors.contact_email?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="contact_phone">
                Phone (optional)
              </label>
              <input
                id="contact_phone"
                type="tel"
                autoComplete="tel"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('contact_phone')}
              />
              <FieldError message={errors.contact_phone?.message} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brand-black">Property overview</h2>
          <div className="grid gap-4">
            <div>
              <label className={LABEL_CLASS} htmlFor="property_title">
                Property title
              </label>
              <input
                id="property_title"
                type="text"
                placeholder="e.g. Lagos Marina Tower — Fractional equity"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('property_title')}
              />
              <FieldError message={errors.property_title?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="property_type">
                Property type
              </label>
              <select
                id="property_type"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('property_type')}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed_use">Mixed use</option>
                <option value="other">Other</option>
              </select>
              <FieldError message={errors.property_type?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="property_description">
                Description
              </label>
              <textarea
                id="property_description"
                placeholder="Describe the asset, tenant profile, occupancy, and why investors should consider this pool."
                className={`${TEXTAREA_CLASS} mt-1.5`}
                {...register('property_description')}
              />
              <FieldError message={errors.property_description?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="image_url">
                Hero image URL (optional)
              </label>
              <input
                id="image_url"
                type="url"
                placeholder="https://…"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('image_url')}
              />
              <FieldError message={errors.image_url?.message} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brand-black">Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="address_line1">
                Street address
              </label>
              <input
                id="address_line1"
                type="text"
                autoComplete="street-address"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('address_line1')}
              />
              <FieldError message={errors.address_line1?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="city">
                City
              </label>
              <input
                id="city"
                type="text"
                autoComplete="address-level2"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('city')}
              />
              <FieldError message={errors.city?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="state">
                State / region
              </label>
              <input
                id="state"
                type="text"
                autoComplete="address-level1"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('state')}
              />
              <FieldError message={errors.state?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="country">
                Country
              </label>
              <input
                id="country"
                type="text"
                autoComplete="country-name"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('country')}
              />
              <FieldError message={errors.country?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="postal_code">
                Postal code (optional)
              </label>
              <input
                id="postal_code"
                type="text"
                autoComplete="postal-code"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('postal_code')}
              />
              <FieldError message={errors.postal_code?.message} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brand-black">Token economics</h2>
          <p className="text-sm text-neutral-600">
            Investors pledge tUSDC per slot. We use these figures to size your on-chain
            PropertyPool before marketplace listing goes live.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-inset p-4">
              <label className={LABEL_CLASS} htmlFor="total_units">
                Total slots
              </label>
              <input
                id="total_units"
                type="number"
                min={1}
                step={1}
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('total_units')}
              />
              <FieldError message={errors.total_units?.message} />
            </div>
            <div className="glass-inset p-4">
              <label className={LABEL_CLASS} htmlFor="unit_price">
                Price per slot (tUSDC)
              </label>
              <input
                id="unit_price"
                type="number"
                min={1}
                step="0.01"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('unit_price')}
              />
              <FieldError message={errors.unit_price?.message} />
            </div>
            <div className="glass-accent p-4">
              <label className={LABEL_CLASS} htmlFor="estimated_annual_yield">
                Est. annual yield (%)
              </label>
              <input
                id="estimated_annual_yield"
                type="number"
                min={0}
                max={100}
                step="0.1"
                className={`${INPUT_CLASS} mt-1.5`}
                {...register('estimated_annual_yield')}
              />
              <FieldError message={errors.estimated_annual_yield?.message} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brand-black">Additional notes</h2>
          <textarea
            id="additional_notes"
            placeholder="Compliance documents, preferred launch timeline, property manager contact, or other context."
            className={TEXTAREA_CLASS}
            {...register('additional_notes')}
          />
          <FieldError message={errors.additional_notes?.message} />
        </section>

        {partyId ? (
          <p className="truncate glass-inset px-3 py-2 text-xs text-slate-600">
            <span className="font-medium text-slate-800">Linked Canton party:</span>{' '}
            {partyId}
          </p>
        ) : null}

        {submitState === 'error' && submitMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {submitMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!isValid || submitState === 'submitting' || isAuthLoading}
          className="btn-primary h-12 w-full disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
        >
          {submitState === 'submitting' ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Submitting listing…
            </span>
          ) : (
            'Submit listing request'
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Submissions are reviewed manually. Listing on marketplace requires PropertyPool
          deployment on Canton DevNet.
        </p>
      </form>
    </article>
  );
}
