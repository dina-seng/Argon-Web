/**
 * features/auth/RegisterPage.tsx
 * Registration form with role selection (CUSTOMER / ORGANIZER) → POST /auth/register.
 */

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthFrame } from './AuthFrame';
import { ApiRequestError } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

type SelectableRole = 'CUSTOMER' | 'ORGANIZER';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/** Mirrors the password rules in the API's registerSchema. */
const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One number', test: (v) => /[0-9]/.test(v) },
  { label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES: { value: SelectableRole; title: string; description: string }[] = [
  { value: 'CUSTOMER', title: 'Attend events', description: 'Buy tickets, get QR passes' },
  { value: 'ORGANIZER', title: 'Organize events', description: 'Sell tickets, run the gate' },
];

function statusOf(err: unknown): number {
  return err instanceof ApiRequestError ? err.status : 0;
}

const labelClass = 'mb-[6px] block text-[14px] font-extrabold uppercase leading-[18px] tracking-[0.04em] text-peach';

export default function RegisterPage() {
  const { user: currentUser, isLoading, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const from = fromLocation?.pathname ? `${fromLocation.pathname}${fromLocation.search ?? ''}` : undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<SelectableRole>('CUSTOMER');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → no need to register again.
  if (isLoading) return <p className="min-h-screen bg-ink p-8 text-center text-sm text-peach-soft">Checking your session…</p>;
  if (currentUser) return <Navigate to={currentUser.role === 'ORGANIZER' ? '/organizer' : currentUser.role === 'ADMIN' ? '/admin' : '/'} replace />;

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = 'Enter your name.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!PASSWORD_RULES.every((r) => r.test(password))) {
      next.password = 'Password does not meet all the requirements below.';
    }
    if (!confirmPassword) next.confirmPassword = 'Confirm your password.';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';
    return next;
  }

  function validateField(field: keyof FieldErrors) {
    const next = validate();
    setErrors((current) => ({ ...current, [field]: next[field] }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const createdUser = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role,
      });
      navigate(from ?? (createdUser.role === 'ORGANIZER' ? '/organizer' : '/'), { replace: true });
    } catch (err) {
      const status = statusOf(err);
      if (status === 409) {
        setErrors({ email: 'An account with this email already exists.' });
      } else if (err instanceof TypeError) {
        setFormError("Can't reach the server. Check your connection and try again.");
      } else if (status >= 500) {
        setFormError('Something went wrong on our side. Please try again shortly.');
      } else {
        setFormError('Could not create your account. Please check your details and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="Create account"
      title="How will you use Argon?"
      leftHeading={<>Join the<br />night</>}
      leftVariant="dark"
      footer={<>Already have an account?{' '}<Link to="/login" state={{ from: fromLocation }} className="font-extrabold tracking-[-0.02em] text-peach underline hover:text-white">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="mt-[17px]">
        {formError && (
          <div role="alert" className="mb-4 border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {formError}
          </div>
        )}

        <fieldset>
          <legend className="sr-only">How will you use Argon?</legend>
          <div className="grid grid-cols-2 gap-[10px]">
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <label
                  key={r.value}
                  className={`h-[71px] cursor-pointer border px-[15px] pt-[14px] transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white ${
                    selected ? 'border-white bg-white text-ink' : 'border-white/35 text-white hover:border-white'
                  }`}
                >
                  <input type="radio" name="role" value={r.value} checked={selected} onChange={() => setRole(r.value)} className="sr-only" />
                  <span className="flex items-center gap-[11px] text-[16px] font-extrabold leading-[22px] tracking-[-0.03em]">
                    <span aria-hidden="true" className={`ml-[5px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${selected ? 'border border-flame' : 'bg-white'}`}>
                      {selected && <span className="h-[12px] w-[12px] rounded-full bg-flame" />}
                    </span>
                    {r.title}
                  </span>
                  <span className={`mt-[1px] block text-[13px] leading-[18px] ${selected ? 'text-peach-muted' : 'text-peach-soft'}`}>{r.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label htmlFor="name" className={`${labelClass} mt-[17px]`}>Full name</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Sokha Chan"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((current) => ({ ...current, name: undefined })); }}
          onBlur={() => validateField('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="ag-input h-[52px] text-[16px]"
        />
        {errors.name && <p id="name-error" className="mt-1.5 text-xs text-red-300">{errors.name}</p>}

        <label htmlFor="email" className={`${labelClass} mt-[17px]`}>Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((current) => ({ ...current, email: undefined })); }}
          onBlur={() => validateField('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="ag-input h-[52px] text-[16px]"
        />
        {errors.email && <p id="email-error" className="mt-1.5 text-xs text-red-300">{errors.email}</p>}

        <label htmlFor="password" className={`${labelClass} mt-[17px]`}>Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((current) => ({ ...current, password: undefined, confirmPassword: confirmPassword && e.target.value !== confirmPassword ? 'Passwords do not match.' : undefined })); }}
          onBlur={() => validateField('password')}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error password-rules' : 'password-rules'}
          className="ag-input h-[52px] text-[16px]"
        />
        {errors.password && <p id="password-error" className="mt-1.5 text-xs text-red-300">{errors.password}</p>}

        <ul id="password-rules" className="mt-[15px] grid grid-cols-2 gap-x-[14px] gap-y-[4px]">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className={`flex items-center gap-[4px] text-[13px] leading-[18px] ${ok ? 'text-green-300' : 'text-peach-soft'}`}>
                <span aria-hidden="true" className="flex w-[10px] justify-center">{ok ? '✓' : <span className="h-[9px] w-[9px] rounded-full border border-current" />}</span>
                <span>
                  {r.label}
                  <span className="sr-only">{ok ? ' – met' : ' – not met yet'}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <label htmlFor="confirmPassword" className={`${labelClass} mt-[15px]`}>Confirm password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setErrors((current) => ({ ...current, confirmPassword: !e.target.value ? undefined : e.target.value !== password ? 'Passwords do not match.' : undefined })); }}
          onBlur={() => validateField('confirmPassword')}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
          className="ag-input h-[52px] text-[16px]"
        />
        {errors.confirmPassword && <p id="confirm-error" className="mt-1.5 text-xs text-red-300">{errors.confirmPassword}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-[18px] flex h-[56px] w-full items-center justify-center bg-flame text-[16px] font-black uppercase tracking-[0.04em] text-white transition hover:bg-blood disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthFrame>
  );
}
