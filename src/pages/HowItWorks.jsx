import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HowItWorks() {
  const { user } = useAuth();
  const steps = [
    { icon: 'solar:user-plus-bold', title: 'Create Account', desc: 'Sign up with your email. You instantly receive ₮10,000 in virtual currency to start trading.' },
    { icon: 'solar:chart-2-bold', title: 'Explore the Market', desc: 'Browse real-time listings of physical goods, commodities, and meme stocks. Study charts, order books, and recent trades.' },
    { icon: 'solar:bag-check-bold', title: 'Place Trades', desc: 'Use Market, Limit, or Stop Loss orders to buy and sell assets. Your orders hit a live order book with real matching.' },
    { icon: 'solar:graph-up-bold', title: 'Track Performance', desc: 'Monitor your portfolio, P&L, and trade history. Compete on the global leaderboard for top trader status.' },
    { icon: 'solar:document-add-bold', title: 'Propose Assets', desc: 'Have an idea for a new asset? Submit a proposal. If it gets 50 community votes, it goes live on the exchange.' },
    { icon: 'solar:cup-star-bold', title: 'Climb the Leaderboard', desc: 'Your net worth is tracked. Outperform other traders to earn your spot at the top of the leaderboard.' },
  ];

  const features = [
    { title: 'Real Order Book', desc: 'Every trade is matched against a live order book with bid/ask spreads, partial fills, and price discovery.' },
    { title: 'Live Charts', desc: 'Professional candlestick charts powered by TradingView Lightweight Charts with multiple timeframes (1m, 5m, 1h, 1D).' },
    { title: 'Bot Simulation', desc: 'AI market makers continuously provide liquidity and price movement, ensuring there\'s always action in the market.' },
    { title: 'Community Governance', desc: 'New assets are proposed and voted on by the community. 50 votes = automatic listing on the exchange.' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-fade-in py-4">
        <div className="text-center space-y-3">
            <h1 className="font-serif text-4xl tracking-tight text-[#f0ebe0]">How TraX Works</h1>
            <p className="text-[#8a8580] text-sm max-w-lg mx-auto">TraX is a virtual stock exchange where you trade real-world items, commodities, and meme stocks with simulated currency. Zero risk, maximum fun.</p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 hover:border-[#2a2a2a] transition-all group">
                  <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37] group-hover:bg-[#d4af37]/20 transition-colors">
                          <iconify-icon icon={step.icon} class="text-xl"></iconify-icon>
                      </div>
                      <span className="text-[10px] font-mono text-[#5a5650] uppercase">Step {i + 1}</span>
                  </div>
                  <h3 className="text-[#f0ebe0] font-medium mb-2">{step.title}</h3>
                  <p className="text-xs text-[#8a8580] leading-relaxed">{step.desc}</p>
              </div>
            ))}
        </div>

        {/* Key Features */}
        <div className="space-y-6">
            <h2 className="font-serif text-2xl tracking-tight text-[#f0ebe0] text-center">Key Features</h2>
            <div className="grid sm:grid-cols-2 gap-6">
                {features.map((f, i) => (
                  <div key={i} className="flex space-x-4 p-5 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl">
                      <div className="w-1 bg-[#d4af37] rounded-full shrink-0"></div>
                      <div>
                          <h4 className="text-[#f0ebe0] font-medium text-sm mb-1.5">{f.title}</h4>
                          <p className="text-xs text-[#8a8580] leading-relaxed">{f.desc}</p>
                      </div>
                  </div>
                ))}
            </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-10">
            <h3 className="font-serif text-2xl text-[#f0ebe0] mb-3">Ready to start trading?</h3>
            <p className="text-[#8a8580] text-sm mb-6">Join thousands of virtual traders on TraX.</p>
            <Link to={user ? '/market' : '/auth'} className="inline-block bg-[#d4af37] text-black font-medium text-sm px-8 py-3 rounded-lg hover:bg-[#e5c048] transition-colors">{user ? 'Go to Market →' : 'Get Started →'}</Link>
        </div>
    </div>
  );
}
