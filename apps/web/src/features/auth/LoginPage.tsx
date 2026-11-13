/**
 * features/auth/LoginPage.tsx
 * Email/password form → POST /auth/login → store JWT → redirect by role.
 */

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthFrame } from './AuthFrame';
import { ApiRequestError } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function homeForRole(role: string | undefined): string {
  switch (role) {
    case 'ORGANIZER':
      return '/organizer';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}

function messageFor(err: unknown): string {
  if (err instanceof TypeError) return "Can't reach the server. Check your connection and try again.";
  const status = err instanceof ApiRequestError ? err.status : 0;
  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return 'This account has been suspended. Please contact support.';
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again shortly.';
  return 'Could not sign you in. Please check your details and try again.';
}

const labelClass = 'mb-[8px] block text-[13px] font-extrabold uppercase leading-[16px] tracking-[0.04em] text-peach';

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  // Keep the query too: checkout carries the event and ticket quantity in it.
  const from = fromLocation?.pathname ? `${fromLocation.pathname}${fromLocation.search ?? ''}` : undefined;
  const sessionExpired = (location.state as { sessionExpired?: boolean } | null)?.sessionExpired ?? false;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → go home instead of showing the form.
  if (isLoading) return <p className="min-h-screen bg-ink p-8 text-center text-sm text-peach-soft">Checking your session…</p>;
  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
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
      const signedInUser = await login(email.trim(), password);
      const role = signedInUser.role;
      navigate(from ?? homeForRole(role), { replace: true });
    } catch (err) {
      setFormError(messageFor(err));
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="Sign in"
      title="Your tickets are waiting"
      leftHeading={<>Welcome<br />back.</>}
      leftVariant="default"
      footer={<>New to Argon?{' '}<Link to="/register" state={{ from: fromLocation }} className="font-extrabold tracking-[-0.02em] text-peach underline hover:text-white">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="mt-[21px]">
        {sessionExpired && (
          <div role="status" className="mb-4 border border-peach/40 bg-flame/10 px-4 py-3 text-sm text-peach">
            Your session expired. Sign in again to continue.
          </div>
        )}
        {formError && (
          <div role="alert" className="mb-4 border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {formError}
          </div>
        )}

        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((current) => ({ ...current, email: undefined })); }}
          onBlur={() => validateField('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="ag-input h-[54px] text-[16px]"
        />
        {errors.email && <p id="email-error" className="mt-1.5 text-xs text-red-300">{errors.email}</p>}

        <label htmlFor="password" className={`${labelClass} mt-[20px]`}>Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((current) => ({ ...current, password: undefined })); }}
          onBlur={() => validateField('password')}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="ag-input h-[54px] text-[16px]"
        />
        {errors.password && <p id="password-error" className="mt-1.5 text-xs text-red-300">{errors.password}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-[20px] flex h-[56px] w-full items-center justify-center bg-flame text-[16px] font-black uppercase tracking-[0.04em] text-white transition hover:bg-blood disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthFrame>
  );
}
