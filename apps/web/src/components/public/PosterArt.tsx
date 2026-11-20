/** Vector artwork shared by the posters, event hero, auth panels and tickets. */
import { useEffect, useId, useState, type CSSProperties } from 'react';

export const SUNRISE =
  'linear-gradient(180deg,#FFEFE8 0%,#FFC4B4 16%,#FF8366 36%,#FF6E4E 50%,#F2452F 72%,#D41412 100%)';
export const EMBER = 'linear-gradient(162deg,#3B0707 0%,#7A1510 40%,#941F13 62%,#DE512D 100%)';

/**
 * An event's own photo, tinted by the art beneath it. Without a usable photo
 * nothing renders, so the poster stays pure vector art.
 */
export function CoverPhoto({ src, mask }: { src: string | null | undefined; mask?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity"
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    />
  );
}

/** Dot screen; `from` is where it starts, as a CSS length. */
export function Dots({ from = '0px', to = '0px', opacity = 0.32, size = 14.6, style }: { from?: string; to?: string; opacity?: number; size?: number; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0"
      style={{
        top: from,
        bottom: to,
        backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,${opacity}) 1.7px, transparent 2.1px)`,
        backgroundSize: `${size}px ${size}px`,
        ...style,
      }}
    />
  );
}

/**
 * Hollow numerals. A filter cuts the outline from the solid glyph, because
 * text-stroke would also draw the overlapping shapes inside a variable font.
 * `color` must be opaque for the cut to work, so fade with `opacity`.
 */
export function Outline({ text, size, color, opacity = 1, className = '', width = 2 }: { text: string; size: number; color: string; opacity?: number; className?: string; width?: number }) {
  const id = `outline${useId().replace(/:/g, '')}`;
  return (
    <>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="erode" radius={width} result="inner" />
          <feComposite in="SourceGraphic" in2="inner" operator="out" />
        </filter>
      </svg>
      <span aria-hidden="true" className={`ag-outline absolute ${className}`} style={{ fontSize: size, color, opacity, filter: `url(#${id})` }}>
        {text}
      </span>
    </>
  );
}

/** Concentric stage arches: one thin ring over nested translucent discs. */
export function Arches({ cx, cy, ring, discs }: { cx: number; cy: number; ring: number; discs: number[] }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {discs.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.13)" />
      ))}
      <circle cx={cx} cy={cy} r={ring} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
    </svg>
  );
}

/** Retro sun cut by horizon bands. */
export function Sun({ cx, cy, r, color = '#FFE6CF', bands, bandColor, bandLeft }: { cx: number; cy: number; r: number; color?: string; bands: [number, number][]; bandColor: string; bandLeft: number }) {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {bands.map(([y, h]) => (
        <rect key={y} x={bandLeft} y={y} width="2000" height={h} fill={bandColor} />
      ))}
    </svg>
  );
}
