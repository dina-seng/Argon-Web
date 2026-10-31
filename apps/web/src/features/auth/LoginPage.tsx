/**
 * features/auth/LoginPage.tsx
 * Email/password form → POST /auth/login → store JWT → redirect by role.
 */

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuthFrame } from './AuthFrame';
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

/** api.ts throws `API error <status>`; recover the status to show a useful message. */
function messageFor(err: unknown): string {
  if (err instanceof TypeError) return "Can't reach the server. Check your connection and try again.";
  const status = Number(/API error (\d{3})/.exec(err instanceof Error ? err.message : '')?.[1]);
  if (status === 401) return 'Invalid email or password.';
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again shortly.';
  return 'Could not sign you in. Please check your details and try again.';
}

const inputClass = (invalid: boolean) =>
  [
    'w-full rounded-xl border bg-white px-4 py-3.5 text-sm text-[#24222b] placeholder-[#aaa6a0]',
    'outline-none transition focus:border-[#9b7040] focus:ring-4 focus:ring-[#d9a96b]/15',
    invalid ? 'border-red-400' : 'border-[#e4e0d8] hover:border-[#c9c3b8]',
  ].join(' ');

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const sessionExpired = (location.state as { sessionExpired?: boolean } | null)?.sessionExpired ?? false;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → go home instead of showing the form.
  if (isLoading) return <p className="p-8 text-center text-sm text-gray-500">Checking your session…</p>;
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
      eyebrow="Good to see you again"
      title="Welcome back"
      description="Sign in to pick up where you left off. Your next event is just around the corner."
      footer={<>New to Argon? <Link to="/register" className="font-semibold text-[#815a31] hover:text-[#5f4021]">Create an account</Link></>}
    >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {sessionExpired && (
              <div role="status" className="rounded-xl border border-[#e7d6b7] bg-[#fbf6ee] px-4 py-3 text-sm text-[#684b2c]">
                Your session expired. Sign in again to continue.
              </div>
            )}
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#34313a]">
                Email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((current) => ({ ...current, email: undefined })); }}
                onBlur={() => validateField('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={inputClass(!!errors.email)}
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-red-300">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-[#34313a]">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-[#815a31] hover:text-[#5f4021]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((current) => ({ ...current, password: undefined })); }}
                  onBlur={() => validateField('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`${inputClass(!!errors.password)} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-[#8b8790] hover:text-[#34313a]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-red-300">
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              isLoading={submitting}
              className="w-full rounded-xl bg-[#292833] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#403d4a] focus:outline-none focus:ring-4 focus:ring-[#292833]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign in
            </Button>
          </form>
    </AuthFrame>
  );
}
