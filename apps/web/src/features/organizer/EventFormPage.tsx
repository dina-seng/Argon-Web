/**
 * features/organizer/EventFormPage.tsx
 * Create (/organizer/events/new) or edit (/organizer/events/:id) an event.
 */
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EventCategory, EventStatus, MAX_EVENT_CAPACITY, createEventSchema, updateEventSchema } from '@argon/shared';
import type { OrganizerEvent } from '@argon/shared';
import type { ZodIssue } from 'zod';
import { api } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/eventLabels';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EventCover } from '@/components/EventCover';

interface FormValues {
  title: string;
  startsAt: string; // datetime-local value, e.g. "2026-11-05T19:00"
  venue: string;
  category: EventCategory;
  capacity: string;
  description: string;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_FORM: FormValues = {
  title: '',
  startsAt: '',
  venue: '',
  category: EventCategory.OTHER,
  capacity: '',
  description: '',
};

/** ISO timestamp → value for <input type="datetime-local"> in the user's timezone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toFormValues(event: OrganizerEvent): FormValues {
  return {
    title: event.title,
    startsAt: toLocalInput(event.startsAt),
    venue: event.venue,
    category: event.category,
    capacity: String(event.capacity),
    description: event.description,
  };
}

/** Form values → API payload. Empty/invalid dates are left as '' so validation reports them. */
function toPayload(values: FormValues) {
  const date = new Date(values.startsAt);
  return {
    title: values.title,
    startsAt: values.startsAt && !Number.isNaN(date.getTime()) ? date.toISOString() : '',
    venue: values.venue,
    category: values.category,
    capacity: values.capacity,
    description: values.description,
  };
}

function toFieldErrors(issues: ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0] as keyof FormValues | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export default function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [original, setOriginal] = useState<OrganizerEvent | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get<OrganizerEvent>(`/organizer/events/${id}`)
      .then((event) => {
        if (cancelled) return;
        setOriginal(event);
        setValues(toFormValues(event));
      })
      .catch((error: Error) => !cancelled && setFormError(error.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const intent = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    setFormError(null);

    const payload = toPayload(values);
    let body: Record<string, unknown>;

    if (original) {
      // Only send what changed, so e.g. editing the description of an event that has
      // already started doesn't fail the "date must be in the future" check.
      const before = toPayload(toFormValues(original));
      body = Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => value !== before[key as keyof typeof before]),
      );
      if (Object.keys(body).length === 0) {
        navigate('/organizer');
        return;
      }
      const result = updateEventSchema.safeParse(body);
      if (!result.success) return setFieldErrors(toFieldErrors(result.error.issues));
      body = result.data;
    } else {
      const result = createEventSchema.safeParse(payload);
      if (!result.success) return setFieldErrors(toFieldErrors(result.error.issues));
      body = result.data;
    }

    setIsSaving(true);
    try {
      if (original) {
        await api.patch<OrganizerEvent>(`/events/${original.id}`, body);
      } else {
        const created = await api.post<OrganizerEvent>('/events', body);
        if (intent === 'publish') {
          // The event exists now; if publishing fails it stays a draft on the dashboard
          // (with its own Publish button) rather than letting a retry create a duplicate.
          await api
            .patch<OrganizerEvent>(`/events/${created.id}/status`, { status: EventStatus.PUBLISHED })
            .catch(() => undefined);
        }
      }
      navigate('/organizer');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong');
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-fg-muted">Loading event…</p>;

  const minCapacity = original ? Math.max(1, original.soldCount) : 1;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link to="/organizer" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-fg-muted hover:text-fg">
          <Icon name="arrowLeft" size={16} />
          Back to dashboard
        </Link>
        <h1 className="text-[32px] font-bold leading-[1.25] text-fg sm:text-[40px]">{isEdit ? 'Edit event' : 'Create event'}</h1>
        <p className="text-base leading-[1.5] text-fg-muted">
          {isEdit ? 'Update the details customers see.' : 'Fill in the details. You can save a draft and publish later.'}
        </p>
      </header>

      {formError && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {formError}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface-card">
        {/* Cover uploads come later; preview the placeholder customers will see for this category. */}
        <EventCover category={values.category} coverImageUrl={original?.coverImageUrl ?? null} className="h-[184px]">
          <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
            <Badge label={CATEGORY_LABELS[values.category]} />
            <span className="text-xs font-semibold text-fg/80">Cover poster uploads coming soon</span>
          </div>
        </EventCover>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 p-6">
          <Field label="Event title" htmlFor="title" error={fieldErrors.title}>
            <input
              id="title"
              className={inputClass(fieldErrors.title)}
              value={values.title}
              maxLength={200}
              placeholder="e.g. Phnom Penh Jazz Night"
              onChange={(e) => setField('title', e.target.value)}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Date & time" htmlFor="startsAt" error={fieldErrors.startsAt}>
              <input
                id="startsAt"
                type="datetime-local"
                className={inputClass(fieldErrors.startsAt)}
                value={values.startsAt}
                min={toLocalInput(new Date().toISOString())}
                onChange={(e) => setField('startsAt', e.target.value)}
              />
            </Field>

            <Field label="Category" htmlFor="category" error={fieldErrors.category}>
              <select
                id="category"
                className={inputClass(fieldErrors.category)}
                value={values.category}
                onChange={(e) => setField('category', e.target.value as EventCategory)}
              >
                {Object.values(EventCategory).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Location" htmlFor="venue" error={fieldErrors.venue}>
            <input
              id="venue"
              className={inputClass(fieldErrors.venue)}
              value={values.venue}
              maxLength={300}
              placeholder="Venue name and city"
              onChange={(e) => setField('venue', e.target.value)}
            />
          </Field>

          <Field
            label="Total ticket capacity"
            htmlFor="capacity"
            error={fieldErrors.capacity}
            hint={original && original.soldCount > 0 ? `${original.soldCount} tickets already sold.` : undefined}
          >
            <input
              id="capacity"
              type="number"
              inputMode="numeric"
              min={minCapacity}
              max={MAX_EVENT_CAPACITY}
              className={inputClass(fieldErrors.capacity)}
              value={values.capacity}
              placeholder="e.g. 200"
              onChange={(e) => setField('capacity', e.target.value)}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={fieldErrors.description}>
            <textarea
              id="description"
              rows={6}
              maxLength={5000}
              className={inputClass(fieldErrors.description)}
              value={values.description}
              placeholder="What should attendees know?"
              onChange={(e) => setField('description', e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-6">
            {isEdit ? (
              <Button type="submit" value="save" isLoading={isSaving}>
                Save changes
              </Button>
            ) : (
              <>
                <Button type="submit" value="draft" variant="secondary" disabled={isSaving}>
                  Save as draft
                </Button>
                <Button type="submit" value="publish" isLoading={isSaving}>
                  Publish
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function inputClass(error: string | undefined): string {
  return [
    'w-full rounded-lg border bg-surface px-4 py-3 text-base text-fg placeholder:text-fg-muted [color-scheme:dark]',
    'focus:border-accent focus:outline-none',
    error ? 'border-red-400' : 'border-line-strong',
  ].join(' ');
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}

function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-300">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-fg-muted">{hint}</p>
      )}
    </div>
  );
}
