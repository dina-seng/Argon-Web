import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f3ee] text-[#1d1c25] lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#20202b] px-12 py-10 text-[#f6f2ea] lg:flex lg:flex-col xl:px-16">
        <div aria-hidden="true" className="absolute -right-28 top-1/3 h-80 w-80 rounded-full border border-white/[0.08]" />
        <div aria-hidden="true" className="absolute -right-12 top-[38%] h-48 w-48 rounded-full border border-white/[0.08]" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9a96b] font-display text-lg font-bold text-[#20202b]">A</span>
          <span className="font-display text-lg font-semibold tracking-tight">argon</span>
        </div>

        <div className="relative my-auto max-w-lg pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9a96b]">Cambodia, come alive</p>
          <h2 className="mt-6 max-w-md font-display text-5xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
            Make room for a good night.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/60">
            Find the gathering, show, or little adventure you’ll still be talking about tomorrow.
          </p>

          <div className="mt-12 flex max-w-sm items-center rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#d9a96b] text-[#20202b]">
              <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden="true">
                <path d="M5 10.5h22v3a2.5 2.5 0 0 0 0 5v3H5v-3a2.5 2.5 0 0 0 0-5v-3Z" stroke="currentColor" strokeWidth="1.6" />
                <path d="M16 11v10m-4-6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Your next plan</p>
              <p className="mt-1 font-display text-lg font-medium">Starts with a ticket.</p>
            </div>
            <span aria-hidden="true" className="ml-auto h-10 border-l border-dashed border-white/15" />
            <span aria-hidden="true" className="ml-3 text-xl text-[#d9a96b]">✳</span>
          </div>
        </div>

        <p className="relative text-xs text-white/35">Discover something worth going out for.</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[440px]">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#20202b] font-display font-bold text-[#d9a96b]">A</span>
            <span className="font-display text-lg font-semibold tracking-tight">argon</span>
          </Link>
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9b7040]">{eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-[2.15rem]">{title}</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#77747c]">{description}</p>
          </div>
          <div className="rounded-[22px] border border-[#e7e3db] bg-white p-6 shadow-[0_18px_60px_-35px_rgba(29,28,37,0.25)] sm:p-8">
            {children}
          </div>
          <div className="mt-6 text-center text-sm text-[#77747c]">{footer}</div>
          <p className="mt-8 text-center text-[11px] text-[#aaa6a0]">By continuing, you agree to Argon’s terms and privacy policy.</p>
        </div>
      </section>
    </main>
  );
}
