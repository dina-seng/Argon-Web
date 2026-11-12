/**
 * AuthFrame — split-screen auth layout matching designs 05-Login and 06-Register.
 */
import type { ReactNode } from 'react';
import { ArgonLogo } from '../../components/public/Brand';
import { Arches, Dots, EMBER, SUNRISE, Sun } from '../../components/public/PosterArt';

export function AuthFrame({
  eyebrow,
  title,
  children,
  footer,
  leftHeading,
  leftVariant = 'default',
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  leftHeading: ReactNode;
  /** 'default' = sunrise (Login), 'dark' = ember with sun (Register) */
  leftVariant?: 'default' | 'dark';
}) {
  const dark = leftVariant === 'dark';

  return (
    <div className="flex min-h-screen bg-ink text-white">
      <div className="relative hidden w-[49.75%] shrink-0 overflow-hidden lg:block" style={{ background: dark ? EMBER : SUNRISE }}>
        <Dots from={dark ? '637px' : '440px'} opacity={dark ? 0.2 : 0.32} />
        {dark ? (
          <>
            <h2 className="ag-display absolute left-[42px] top-[122px] text-[100px] leading-[88px] text-cream">{leftHeading}</h2>
            <Sun cx={430} cy={490} r={235} bands={[[532, 12], [567, 18], [610, 24], [661, 34]]} bandColor="#A3220F" bandLeft={184} />
          </>
        ) : (
          <>
            <Arches cx={358} cy={980} ring={428} discs={[336, 243, 151]} />
            <h2 className="ag-display absolute left-[40px] top-[139px] text-[102px] leading-[86px] text-blood">{leftHeading}</h2>
          </>
        )}
        <div className="absolute left-[43px] top-[34px]">
          <ArgonLogo className={dark ? 'text-white' : 'text-ink'} />
        </div>
      </div>

      <div className="ag-type flex min-h-screen flex-1 items-center justify-center p-4 py-10 lg:p-8">
        <div className={`w-full ${dark ? 'max-w-[440px]' : 'max-w-[420px]'}`}>
          <div className="mb-8 lg:hidden"><ArgonLogo /></div>
          <p className="text-[13px] font-extrabold uppercase leading-[16px] tracking-[0.14em] text-peach">{eyebrow}</p>
          <h1 className={`ag-display tracking-[-0.03em] ${dark ? 'mt-[4px] text-[38px] leading-[36px]' : 'mt-[6px] text-[42px] leading-[40px]'}`}>{title}</h1>
          {children}
          <div className="mt-[20px] text-[15px] leading-[20px] text-peach-soft">{footer}</div>
        </div>
      </div>
    </div>
  );
}
