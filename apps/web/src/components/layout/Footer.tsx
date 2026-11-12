/** Public footer. `compact` drops the copyright, as on the event detail design. */
export function Footer({ compact = false, className = 'bg-ink' }: { compact?: boolean; className?: string }) {
  return (
    <footer className={className}>
      <div className={`ag-wrap flex ${compact ? 'min-h-[72px]' : 'min-h-[80px]'} flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-peach-soft`}>
        <span className="tracking-[0.3em] text-white">ARGON</span>
        <span>CAMBODIA · USD · ALL TIMES ICT (UTC+7)</span>
        {!compact && <span>© 2026 ARGON</span>}
      </div>
    </footer>
  );
}
