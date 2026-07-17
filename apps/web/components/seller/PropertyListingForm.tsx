'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { COUNTRY_OPTIONS } from '../../lib/countries';
import { useCantonWallet } from '../../providers/CantonWalletProvider';
import type { PropertyListingFormValues, PropertyListingType } from '../../types/listing';
import { GlassInput, GlassSelect, GlassTextarea } from './GlassField';
import { HeroImageUpload } from './HeroImageUpload';

const listingSchema = z.object({
  contact_name: z.string().trim().min(2, 'Enter your full name'),
  contact_email: z.string().trim().email('Enter a valid email address'),
  contact_phone: z
    .string()
    .trim()
    .min(7, 'Phone number is required')
    .max(20, 'Enter a valid phone number')
    .regex(/^[\d\s+().-]+$/, 'Enter a valid phone number'),
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
      'Uploaded image URL is invalid',
    ),
  additional_notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? ''),
});

type FormValues = z.infer<typeof listingSchema>;

const PROPERTY_TYPE_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed use' },
  { value: 'other', label: 'Other' },
];

const LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-neutral-500';

const SECTION_TITLE_CLASS = 'text-sm font-semibold text-brand-black';

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className={LABEL_CLASS} htmlFor={htmlFor}>
      {children}
      <span className="text-brand-orange" aria-hidden="true">
        {' '}
        *
      </span>
    </label>
  );
}

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
  const { partyId } = useCantonWallet();

  const [submitState, setSubmitState] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(listingSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      contact_name: '',
      contact_email: '',
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

  const imageUrl = watch('image_url');

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!partyId) {
        setSubmitState('error');
        setSubmitMessage('Connect your Canton wallet before submitting a listing.');
        return;
      }

      setSubmitState('submitting');
      setSubmitMessage(null);

      try {
        const payload: PropertyListingFormValues & {
          canton_party_id: string;
        } = {
          canton_party_id: partyId,
          contact_name: values.contact_name,
          contact_email: values.contact_email,
          contact_phone: values.contact_phone,
          property_title: values.property_title.trim(),
          property_description: values.property_description.trim(),
          property_type: values.property_type as PropertyListingType,
          address_line1: values.address_line1.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          country: values.country.trim(),
          postal_code: values.postal_code.trim(),
          total_units: values.total_units,
          unit_price: values.unit_price,
          estimated_annual_yield: values.estimated_annual_yield,
          image_url: values.image_url.trim(),
          additional_notes: values.additional_notes.trim(),
        };

        const response = await fetch('/api/listing-requests', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let message = `Unable to submit listing (${response.status})`;
          try {
            const problem = (await response.json()) as { detail?: string; title?: string };
            message = problem.detail ?? problem.title ?? message;
          } catch {
            // Response was not JSON.
          }
          if (response.status === 429) {
            message =
              'Too many listing requests from this wallet. Please wait before submitting again.';
          }
          throw new Error(message);
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
      } catch (submitError) {
        setSubmitState('error');
        setSubmitMessage(
          submitError instanceof Error
            ? submitError.message
            : 'Unable to submit listing request.',
        );
      }
    },
    [partyId, reset],
  );

  if (submitState === 'success') {
    return (
      <article className="card-surface overflow-hidden font-sans">
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="section-label text-brand-orange">Listing submitted</p>
          <p className="text-sm leading-relaxed text-neutral-600">{submitMessage}</p>
          <p className="text-sm leading-relaxed text-neutral-600">
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
    <article className="card-surface overflow-hidden font-sans">
      <form
        className="space-y-8 px-5 py-5 sm:px-6"
        onSubmit={(event) => {
          void handleSubmit(onSubmit, (invalidFields) => {
            const firstField = Object.keys(invalidFields)[0];
            if (firstField) {
              document
                .getElementById(firstField)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              document.getElementById(firstField)?.focus();
            }
          })(event);
        }}
        noValidate
      >
        <section className="glass-inset space-y-4 p-5">
          <h2 className={SECTION_TITLE_CLASS}>Owner contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <RequiredLabel htmlFor="contact_name">Full name</RequiredLabel>
              <GlassInput
                id="contact_name"
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.contact_name)}
                {...register('contact_name')}
              />
              <FieldError message={errors.contact_name?.message} />
            </div>
            <div>
              <RequiredLabel htmlFor="contact_email">Email</RequiredLabel>
              <GlassInput
                id="contact_email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.contact_email)}
                {...register('contact_email')}
              />
              <FieldError message={errors.contact_email?.message} />
            </div>
            <div>
              <RequiredLabel htmlFor="contact_phone">Phone</RequiredLabel>
              <GlassInput
                id="contact_phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 123 4567"
                aria-invalid={Boolean(errors.contact_phone)}
                {...register('contact_phone')}
              />
              <FieldError message={errors.contact_phone?.message} />
            </div>
          </div>
        </section>

        <section className="glass-inset space-y-4 p-5">
          <h2 className={SECTION_TITLE_CLASS}>Property overview</h2>
          <div className="grid gap-4">
            <div>
              <RequiredLabel htmlFor="property_title">Property title</RequiredLabel>
              <GlassInput
                id="property_title"
                type="text"
                placeholder="e.g. Lagos Marina Tower — Fractional equity"
                aria-invalid={Boolean(errors.property_title)}
                {...register('property_title')}
              />
              <FieldError message={errors.property_title?.message} />
            </div>
            <div>
              <RequiredLabel htmlFor="property_type">Property type</RequiredLabel>
              <GlassSelect
                id="property_type"
                options={PROPERTY_TYPE_OPTIONS}
                aria-invalid={Boolean(errors.property_type)}
                {...register('property_type')}
              />
              <FieldError message={errors.property_type?.message} />
            </div>
            <div>
              <RequiredLabel htmlFor="property_description">Description</RequiredLabel>
              <GlassTextarea
                id="property_description"
                placeholder="Describe the asset, tenant profile, occupancy, and why investors should consider this pool."
                aria-invalid={Boolean(errors.property_description)}
                {...register('property_description')}
              />
              <FieldError message={errors.property_description?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="hero_image">
                Hero image (optional)
              </label>
              <HeroImageUpload
                value={imageUrl}
                onChange={(url) =>
                  setValue('image_url', url, { shouldValidate: true, shouldDirty: true })
                }
                error={errors.image_url?.message}
              />
            </div>
          </div>
        </section>

        <section className="glass-inset space-y-4 p-5">
          <h2 className={SECTION_TITLE_CLASS}>Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <RequiredLabel htmlFor="address_line1">Street address</RequiredLabel>
              <GlassInput
                id="address_line1"
                type="text"
                autoComplete="street-address"
                aria-invalid={Boolean(errors.address_line1)}
                {...register('address_line1')}
              />
              <FieldError message={errors.address_line1?.message} />
            </div>
            <div>
              <RequiredLabel htmlFor="city">City</RequiredLabel>
              <GlassInput
                id="city"
                type="text"
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                {...register('city')}
              />
              <FieldError message={errors.city?.message} />
            </div>
            <div>
              <RequiredLabel htmlFor="state">State / region</RequiredLabel>
              <GlassInput
                id="state"
                type="text"
                autoComplete="address-level1"
                aria-invalid={Boolean(errors.state)}
                {...register('state')}
              />
              <FieldError message={errors.state?.message} />
            </div>
            <div>
              <RequiredLabel htmlFor="country">Country</RequiredLabel>
              <GlassSelect
                id="country"
                autoComplete="country-name"
                options={COUNTRY_OPTIONS}
                aria-invalid={Boolean(errors.country)}
                {...register('country')}
              />
              <FieldError message={errors.country?.message} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="postal_code">
                Postal code (optional)
              </label>
              <GlassInput
                id="postal_code"
                type="text"
                autoComplete="postal-code"
                {...register('postal_code')}
              />
              <FieldError message={errors.postal_code?.message} />
            </div>
          </div>
        </section>

        <section className="glass-accent space-y-4 p-5">
          <h2 className={SECTION_TITLE_CLASS}>Tokenomics</h2>
          <p className="text-sm leading-relaxed text-neutral-600">
            Investors pledge tUSDC per slot. We use these figures to size your
            PropertyPool before marketplace listing goes live.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-inset p-4">
              <RequiredLabel htmlFor="total_units">Total slots</RequiredLabel>
              <GlassInput
                id="total_units"
                type="number"
                min={1}
                step={1}
                aria-invalid={Boolean(errors.total_units)}
                {...register('total_units')}
              />
              <FieldError message={errors.total_units?.message} />
            </div>
            <div className="glass-inset p-4">
              <RequiredLabel htmlFor="unit_price">Price per slot (tUSDC)</RequiredLabel>
              <GlassInput
                id="unit_price"
                type="number"
                min={1}
                step="0.01"
                aria-invalid={Boolean(errors.unit_price)}
                {...register('unit_price')}
              />
              <FieldError message={errors.unit_price?.message} />
            </div>
            <div className="glass-accent p-4">
              <RequiredLabel htmlFor="estimated_annual_yield">
                Est. annual yield (%)
              </RequiredLabel>
              <GlassInput
                id="estimated_annual_yield"
                type="number"
                min={0}
                max={100}
                step="0.1"
                aria-invalid={Boolean(errors.estimated_annual_yield)}
                {...register('estimated_annual_yield')}
              />
              <FieldError message={errors.estimated_annual_yield?.message} />
            </div>
          </div>
        </section>

        <section className="glass-inset space-y-4 p-5">
          <h2 className={SECTION_TITLE_CLASS}>Additional notes</h2>
          <GlassTextarea
            id="additional_notes"
            placeholder="Compliance documents, preferred launch timeline, property manager contact, or other context."
            {...register('additional_notes')}
          />
          <FieldError message={errors.additional_notes?.message} />
        </section>

        {submitState === 'error' && submitMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {submitMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!isValid || submitState === 'submitting'}
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

        <p className="text-center text-xs text-neutral-500">
          Fields marked with <span className="text-brand-orange">*</span> are required.
          Submissions are reviewed manually before marketplace listing goes live.
        </p>
      </form>
    </article>
  );
}
