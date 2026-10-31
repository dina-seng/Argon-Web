/**
 * features/auth/RegisterPage.tsx
 * Registration form with role selection (CUSTOMER / ORGANIZER) → POST /auth/register.
 */

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AuthFrame } from './AuthFrame';
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
  { value: 'CUSTOMER', title: 'Attendee', description: 'Discover events and buy tickets.' },
  { value: 'ORGANIZER', title: 'Organizer', description: 'Create events and sell tickets.' },
];

/** api.ts throws `API error <status>`; recover the status to show a useful message. */
function statusOf(err: unknown): number {
  return Number(/API error (\d{3})/.exec(err instanceof Error ? err.message : '')?.[1]);
}

const inputClass = (invalid: boolean) =>
  [
    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#24222b] placeholder-[#aaa6a0]',
    'outline-none transition focus:border-[#9b7040] focus:ring-4 focus:ring-[#d9a96b]/15',
    invalid ? 'border-red-400' : 'border-[#e4e0d8] hover:border-[#c9c3b8]',
  ].join(' ');

export default function RegisterPage() {
  const { user: currentUser, isLoading, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<SelectableRole>('CUSTOMER');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → no need to register again.
  if (isLoading) return <p className="p-8 text-center text-sm text-gray-500">Checking your session…</p>;
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
      navigate(createdUser.role === 'ORGANIZER' ? '/organizer' : '/', { replace: true });
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
      eyebrow="A good place to start"
      title="Create your account"
      description="A few details and you’re in. Discover events and keep your tickets in one place."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-[#815a31] hover:text-[#5f4021]">Sign in</Link></>}
    >
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-[#34313a]">How will you use Argon?</legend>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => {
                  const selected = role === r.value;
                  return (
                    <label
                      key={r.value}
                      className={[
                        'cursor-pointer rounded-xl border p-3 transition focus-within:ring-4 focus-within:ring-[#d9a96b]/20',
                        selected
                          ? 'border-[#b78a56] bg-[#fbf6ee]'
                          : 'border-[#e4e0d8] bg-white hover:border-[#c9c3b8]',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={selected}
                        onChange={() => setRole(r.value)}
                        className="sr-only"
                      />
                      <span className="block text-sm font-semibold text-[#34313a]">{r.title}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-[#77747c]">{r.description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#34313a]">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                autoFocus
                placeholder="Sokha Chan"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((current) => ({ ...current, name: undefined })); }}
                onBlur={() => validateField('name')}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className={inputClass(!!errors.name)}
              />
              {errors.name && (
                <p id="name-error" className="mt-1.5 text-xs text-red-300">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#34313a]">
                Email
              </label>
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
                className={inputClass(!!errors.email)}
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-red-300">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#34313a]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((current) => ({ ...current, password: undefined, confirmPassword: confirmPassword && e.target.value !== confirmPassword ? 'Passwords do not match.' : undefined })); }}
                  onBlur={() => validateField('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error password-rules' : 'password-rules'}
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
              <ul id="password-rules" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {PASSWORD_RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-700' : 'text-[#96929a]'}`}>
                      <span aria-hidden="true">{ok ? '✓' : '·'}</span>
                      <span>
                        {r.label}
                        <span className="sr-only">{ok ? ' – met' : ' – not met yet'}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#34313a]">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((current) => ({ ...current, confirmPassword: !e.target.value ? undefined : e.target.value !== password ? 'Passwords do not match.' : undefined })); }}
                onBlur={() => validateField('confirmPassword')}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                className={inputClass(!!errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <p id="confirm-error" className="mt-1.5 text-xs text-red-300">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              isLoading={submitting}
              className="w-full rounded-xl bg-[#292833] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#403d4a] focus:outline-none focus:ring-4 focus:ring-[#292833]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create account
            </Button>
          </form>
    </AuthFrame>
  );
}
