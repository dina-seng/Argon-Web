/** Logo, checkout stepper and small shared pieces of the public web. */
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';

export function ArgonMark({ className = 'h-[28px] w-[28px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={className} fill="currentColor">
      <path d="M0 0H28L25 7.4H9.4L7 13H21L17.4 19.6H5.4L0 27.6Z" />
    </svg>
  );
}

export function ArgonLogo({ className = 'text-white' }: { className?: string }) {
  return (
    <Link to="/" aria-label="Argon home" className={`inline-flex items-center gap-[16px] ${className}`}>
      <ArgonMark />
      <span className="text-[18px] font-black leading-none tracking-[0.2em]">ARGON</span>
    </Link>
  );
}

export function BackLink({ to, onClick, children }: { to?: string; onClick?: () => void; children: ReactNode }) {
  const className = 'ag-label inline-flex items-center gap-1 text-[13px] text-peach hover:text-white transition-colors';
  if (to) return <Link to={to} className={className}><Arrow left /> {children}</Link>;
  return <button type="button" onClick={onClick} className={className}><Arrow left /> {children}</button>;
}

/** Heavier than the font's arrow glyphs, as in the designs. */
export function Arrow({ left = false, className = '' }: { left?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={`inline-block h-[0.8em] w-[0.8em] align-[-0.03em] ${left ? 'rotate-180' : ''} ${className}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 6h9M6.5 2.2 10.2 6l-3.700 3.800" />
    </svg>
  );
}

const STEPS = ['01 TICKETS', '02 PAYMENT', '03 YOUR TICKET'];

/** Top bar of the booking flow. */
export function CheckoutHeader({ step, bordered = false }: { step: 1 | 2 | 3; bordered?: boolean }) {
  return (
    <header className={`bg-ink ${bordered ? 'border-b border-white/10' : ''}`}>
      <div className="ag-wrap flex min-h-[74px] flex-wrap items-center justify-between gap-3 py-[18px]">
        <ArgonLogo />
        <ol className="flex flex-wrap gap-[6px]">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? 'done' : n === step ? 'now' : 'next';
            return (
              <li
                key={label}
                aria-current={state === 'now' ? 'step' : undefined}
                className={`flex h-[38px] items-center px-[16px] text-[13px] font-extrabold tracking-[0.05em] ${
                  state === 'now'
                    ? 'bg-flame text-white'
                    : state === 'done'
                      ? 'bg-[#3A0D0D] text-peach'
                      : 'border border-white/30 text-peach-soft'
                }`}
              >
                {state === 'done' && <span aria-hidden="true" className="mr-[5px]">✓</span>}
                {label}
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}

/**
 * Scannable QR drawn as crisp modules with the red brand square in the middle.
 * Error correction H leaves room for the square, which covers under 4% of the code.
 */
export function BrandQr({ value, size }: { value: string; size: number }) {
  const [modules, setModules] = useState<{ count: number; path: string } | null>(null);

  useEffect(() => {
    const qr = QRCode.create(value || ' ', { errorCorrectionLevel: 'H' });
    const count = qr.modules.size;
    let path = '';
    for (let y = 0; y < count; y += 1) {
      for (let x = 0; x < count; x += 1) {
        if (qr.modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`;
      }
    }
    setModules({ count, path });
  }, [value]);

  const box = modules ? modules.count * 0.17 : 0;
  const c = modules ? modules.count / 2 : 0;

  return (
    <svg
      role="img"
      aria-label="QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${modules?.count ?? 1} ${modules?.count ?? 1}`}
      shapeRendering="crispEdges"
      className="block max-w-full"
    >
      {modules && (
        <>
          <path d={modules.path} fill="#140404" />
          <rect x={c - box / 2} y={c - box / 2} width={box} height={box} fill="#E3140F" />
          <rect x={c - box * 0.3} y={c - box * 0.3} width={box * 0.6} height={box * 0.6} fill="#fff" />
        </>
      )}
    </svg>
  );
}
