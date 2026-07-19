'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
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

type SubmittedSummary = {
  title: string;
  location: string;
  propertyType: string;
  totalUnits: number;
  unitPrice: number;
  estimatedAnnualYield: number;
  imageUrl: string;
  contactEmail: string;
};

const REVIEW_STEPS = [
  {
    title: 'Review',
    description: 'Our team verifies the property details and documentation.',
  },
  {
    title: 'Pool deployment',
    description: 'We deploy your PropertyPool on Canton DevNet and size the slots.',
  },
  {
    title: 'Live on marketplace',
    description: 'Your listing goes live and investors can start pledging tUSDC.',
  },
];

function CheckBadge() {
  return (
    <span className="animate-check-pop relative inline-flex h-16 w-16 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/20 [animation-iteration-count:2]" />
      <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-brand-orange/30 bg-gradient-to-br from-brand-orange/15 to-brand-orange/30 shadow-[0_8px_24px_rgba(234,88,12,0.3)] backdrop-blur-md">
        <svg
          className="h-8 w-8 text-brand-orange"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path className="animate-check-draw" d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </span>
  );
}

const numberFormatter = new Intl.NumberFormat('en-US');

export function PropertyListingForm() {
  const { partyId } = useCantonWallet();

  const [submitState, setSubmitState] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(
    null,
  );

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
        setSubmitMessage(null);
        setSubmittedSummary({
          title: values.property_title.trim(),
          location: [values.city.trim(), values.state.trim(), values.country.trim()]
            .filter(Boolean)
            .join(', '),
          propertyType:
            PROPERTY_TYPE_OPTIONS.find((option) => option.value === values.property_type)
              ?.label ?? values.property_type,
          totalUnits: values.total_units,
          unitPrice: values.unit_price,
          estimatedAnnualYield: values.estimated_annual_yield,
          imageUrl: values.image_url.trim(),
          contactEmail: values.contact_email.trim(),
        });
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

  const dismissSuccess = useCallback(() => {
    setSubmitState('idle');
    setSubmitMessage(null);
    setSubmittedSummary(null);
  }, []);

  const successModal =
    submitState === 'success' ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Listing submitted"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismissSuccess}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        />
        <article className="glass-panel animate-modal-pop relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl font-sans">
          <button
            type="button"
            aria-label="Close"
            onClick={dismissSuccess}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/50 text-neutral-500 backdrop-blur-md transition-colors hover:bg-white/80 hover:text-brand-black"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="px-5 py-8 text-center sm:px-8">
            <CheckBadge />
            <p className="section-label mt-5 text-brand-orange">Listing submitted</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-brand-black">
            You&rsquo;re in the review queue
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
            Thanks for submitting{' '}
            {submittedSummary?.title ? (
              <span className="font-semibold text-brand-black">
                {submittedSummary.title}
              </span>
            ) : (
              'your property'
            )}
            . We&rsquo;ll email{' '}
            {submittedSummary?.contactEmail ? (
              <span className="font-semibold text-brand-black">
                {submittedSummary.contactEmail}
              </span>
            ) : (
              'you'
            )}{' '}
            within 2–3 business days about the next steps.
          </p>
        </div>

        {submittedSummary ? (
          <div className="px-5 pb-6 sm:px-8">
            <div className="glass-inset overflow-hidden">
              {submittedSummary.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={submittedSummary.imageUrl}
                  alt={submittedSummary.title}
                  className="h-40 w-full object-cover"
                />
              ) : null}
              <div className="space-y-3 p-4 text-left">
                <div>
                  <p className="text-sm font-semibold text-brand-black">
                    {submittedSummary.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {submittedSummary.propertyType}
                    {submittedSummary.location ? ` · ${submittedSummary.location}` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/60 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Slots
                    </p>
                    <p className="text-sm font-bold text-brand-black">
                      {numberFormatter.format(submittedSummary.totalUnits)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/60 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Per slot
                    </p>
                    <p className="text-sm font-bold text-brand-black">
                      {numberFormatter.format(submittedSummary.unitPrice)}{' '}
                      <span className="text-[10px] font-semibold text-neutral-500">
                        tUSDC
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-brand-orange/10 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Est. yield
                    </p>
                    <p className="text-sm font-bold text-brand-orange">
                      {submittedSummary.estimatedAnnualYield}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-5 pb-6 sm:px-8">
          <div className="glass-accent p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
              What happens next
            </p>
            <ol className="mt-3 space-y-3">
              {REVIEW_STEPS.map((step, index) => (
                <li key={step.title} className="flex items-start gap-3 text-left">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0
                        ? 'bg-brand-orange text-white'
                        : 'border border-brand-orange/30 bg-white/60 text-brand-orange'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-brand-black">
                      {step.title}
                    </p>
                    <p className="text-xs leading-relaxed text-neutral-600">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

          <div className="space-y-3 px-5 pb-8 sm:px-8">
            <button
              type="button"
              onClick={dismissSuccess}
              className="btn-primary h-12 w-full text-sm"
            >
              Submit another property
            </button>
            <Link href="/marketplace" className="btn-secondary h-12 w-full text-sm">
              Browse the marketplace
            </Link>
          </div>
        </article>
      </div>
    ) : null;

  return (
    <>
      {successModal}
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
    </>
  );
}
