import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-20">
      {/* Glitch Effect Title */}
      <div className="relative mb-6">
        <h1 className="text-[120px] md:text-[180px] font-mono font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#d4af37] to-[#5a4a1a] opacity-90 select-none">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent animate-pulse"></div>
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-serif italic text-[#f0ebe0] mb-3">
        Market Unreachable
      </h2>
      <p className="text-sm text-[#8a8580] max-w-md mb-2 leading-relaxed">
        The page you're looking for doesn't exist on this exchange, or the servers are experiencing heavy load.
      </p>
      <p className="text-xs text-[#5a5650] max-w-sm mb-8">
        If this keeps happening, please wait a moment and try again. Our trading engines are processing millions of virtual orders.
      </p>

      {/* Status Indicators */}
      <div className="flex items-center gap-6 mb-10 text-[10px] font-mono uppercase tracking-widest text-[#5a5650]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f87171] animate-pulse"></span>
          <span>Route Not Found</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse"></span>
          <span>Retrying...</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/market"
          className="px-8 py-3 bg-[#d4af37] text-[#0a0a0a] text-sm font-medium rounded-lg hover:bg-[#c9a42f] active:scale-[0.98] transition-all"
        >
          Go to Market
        </Link>
        <Link
          to="/"
          className="px-8 py-3 border border-[#1a1a1a] text-[#8a8580] text-sm font-medium rounded-lg hover:border-[#2a2a2a] hover:text-[#f0ebe0] active:scale-[0.98] transition-all"
        >
          Back Home
        </Link>
      </div>

      {/* Decorative Bottom */}
      <div className="mt-16 w-full max-w-xs">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#1a1a1a] to-transparent mb-4"></div>
        <p className="text-[10px] text-[#3a3630] font-mono tracking-widest">TRAX VIRTUAL EXCHANGE • ERROR HANDLER</p>
      </div>
    </div>
  );
}
