import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-glow w-full border-t border-[#1a1a1a] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                <div>
                    <span className="font-serif italic text-xl text-[#f0ebe0] block mb-4">TraX</span>
                    <p className="text-xs text-[#8a8580] leading-relaxed">The virtual exchange where commodities, physical goods, and internet culture collide.</p>
                </div>
                <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#8a8580] font-medium mb-3">Platform</h4>
                    <div className="flex flex-col space-y-2">
                        <Link to="/market" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] cursor-pointer transition-colors">Market</Link>
                        <Link to="/portfolio" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] cursor-pointer transition-colors">Portfolio</Link>
                        <Link to="/leaderboard" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] cursor-pointer transition-colors">Leaderboard</Link>
                        <Link to="/propose" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] cursor-pointer transition-colors">Propose</Link>
                    </div>
                </div>
                <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#8a8580] font-medium mb-3">Resources</h4>
                    <div className="flex flex-col space-y-2">
                        <Link to="/how-it-works" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] transition-colors">How it Works</Link>
                        <Link to="/faq" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] transition-colors">FAQ</Link>
                    </div>
                </div>
                <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#8a8580] font-medium mb-3">Legal</h4>
                    <div className="flex flex-col space-y-2">
                        <Link to="/terms" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] transition-colors">Terms of Service</Link>
                        <Link to="/privacy" className="text-sm text-[#5a5650] hover:text-[#f0ebe0] transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#1a1a1a]">
                <div className="flex flex-col items-center md:items-start text-xs text-[#5a5650] max-w-2xl mb-4 md:mb-0">
                   <p className="font-mono mb-2 text-[#f87171]/80 uppercase tracking-widest text-[10px]">Disclaimer: Virtual Market Simulation</p>
                   <p className="text-justify leading-relaxed">TraX is a simulated, virtual trading platform created for educational and entertainment purposes only. The assets, prices, and trading features presented on this platform do not reflect real-world financial markets. No actual cryptocurrency or fiat currency is traded, deposited, or withdrawn. The platform holds zero financial value. Users should not consider this platform as financial advice or an alternative to real trading.</p>
                </div>
                <div className="flex flex-col items-center md:items-end space-y-4">
                    <span className="text-xs text-[#5a5650] font-mono">© 2026 TraX Simulation.</span>
                    <div className="flex items-center space-x-4">
                        <a href="#" className="text-[#5a5650] hover:text-[#d4af37] transition-colors"><iconify-icon icon="mdi:twitter" class="text-lg"></iconify-icon></a>
                        <a href="https://github.com/tensedLad/TraX" target="_blank" rel="noopener noreferrer" className="text-[#5a5650] hover:text-[#d4af37] transition-colors"><iconify-icon icon="mdi:github" class="text-lg"></iconify-icon></a>
                        <a href="#" className="text-[#5a5650] hover:text-[#d4af37] transition-colors"><iconify-icon icon="mdi:discord" class="text-lg"></iconify-icon></a>
                    </div>
                </div>
            </div>
        </div>
    </footer>
  );
}
