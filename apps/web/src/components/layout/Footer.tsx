import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#090a10] py-8 text-xs text-zinc-500 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span>argon / Local energy. Quiet interface.</span>
        </div>

        <div>
          <span>Cambodia · USD · All times ICT (UTC+7)</span>
        </div>

        <div className="flex items-center gap-4">
          <Link to="#" className="hover:text-zinc-300 transition-colors">
            Help &amp; support
          </Link>
          <span className="text-zinc-700">·</span>
          <Link to="/organizer/scanner" className="hover:text-purple-400 transition-colors">
            Organizer gate scanner
          </Link>
        </div>
      </div>
    </footer>
  );
}
