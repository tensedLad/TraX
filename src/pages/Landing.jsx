import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/market', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="space-y-24 animate-fade-in">
      {/* Hero */}
      <div className="text-center pt-16 pb-8">
          <h1 className="font-serif text-5xl md:text-7xl tracking-tight text-[#f0ebe0] mb-6">
              Trade anything. <br/><span className="italic text-[#d4af37]">Own everything.</span>
          </h1>
          <p className="text-[#8a8580] text-lg max-w-2xl mx-auto mb-10">
              The virtual exchange where commodities, physical goods, and internet culture collide. Execute trades, propose new assets, and climb the leaderboard.
          </p>
          <div className="flex justify-center space-x-4">
              <button onClick={() => navigate('/auth')} className="bg-[#d4af37] text-black font-medium text-sm px-6 py-3 rounded-lg hover:bg-[#e5c048] active:scale-95 transition-all">
                  Start with ₮10,000 free
              </button>
              <button onClick={() => navigate('/market')} className="bg-[#0f0f0f] border border-[#1a1a1a] text-[#f0ebe0] font-medium text-sm px-6 py-3 rounded-lg hover:border-[#2a2a2a] active:scale-95 transition-all">
                  Explore Market
              </button>
          </div>
      </div>

      {/* Trending */}
      <div>
          <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl tracking-tight">What's Trending</h2>
              <button onClick={() => navigate('/market')} className="text-sm text-[#d4af37] hover:underline flex items-center">
                  View all <iconify-icon icon="solar:arrow-right-linear" class="ml-1"></iconify-icon>
              </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Mini Asset Card 1 */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] hover:bg-[#151515] transition-all cursor-pointer group" onClick={() => navigate('/asset/BANANA')}>
                  <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[#d4af37] text-sm group-hover:text-[#e5c048]">BANANA</span>
                      <span className="text-xs text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded">+4.2%</span>
                  </div>
                  <div className="text-[#8a8580] text-xs mb-3">Physical Goods</div>
                  <div className="font-mono text-xl text-[#f0ebe0]">₮14.20</div>
              </div>
              {/* Mini Asset Card 2 */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] hover:bg-[#151515] transition-all cursor-pointer group" onClick={() => navigate('/asset/SKIBIDI')}>
                  <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[#d4af37] text-sm group-hover:text-[#e5c048]">SKIBIDI</span>
                      <span className="text-xs text-[#f87171] bg-[#f87171]/10 px-2 py-0.5 rounded">-18.3%</span>
                  </div>
                  <div className="text-[#8a8580] text-xs mb-3">Meme Stock</div>
                  <div className="font-mono text-xl text-[#f0ebe0]">₮2.40</div>
              </div>
              {/* Mini Asset Card 3 */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] hover:bg-[#151515] transition-all cursor-pointer group" onClick={() => navigate('/asset/GOLD')}>
                  <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[#d4af37] text-sm group-hover:text-[#e5c048]">GOLD</span>
                      <span className="text-xs text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded">+0.8%</span>
                  </div>
                  <div className="text-[#8a8580] text-xs mb-3">Commodity</div>
                  <div className="font-mono text-xl text-[#f0ebe0]">₮4820.00</div>
              </div>
              {/* Mini Asset Card 4 */}
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 hover:border-[#2a2a2a] hover:bg-[#151515] transition-all cursor-pointer group" onClick={() => navigate('/asset/COLDPLAY')}>
                  <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[#d4af37] text-sm group-hover:text-[#e5c048]">COLDPLAY</span>
                      <span className="text-xs text-[#4ade80] bg-[#4ade80]/10 px-2 py-0.5 rounded">+34.1%</span>
                  </div>
                  <div className="text-[#8a8580] text-xs mb-3">Meme Stock</div>
                  <div className="font-mono text-xl text-[#f0ebe0]">₮88.00</div>
              </div>
          </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8 pb-16">
          <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#d4af37]">
                  <iconify-icon icon="solar:chart-square-linear" stroke-width="1.5" class="text-xl"></iconify-icon>
              </div>
              <h3 className="font-serif text-xl tracking-tight">Trade</h3>
              <p className="text-[#8a8580] text-sm leading-relaxed">Execute market and limit orders with sub-second latency. Build a diverse portfolio spanning real-world commodities and internet hypes.</p>
          </div>
          <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#d4af37]">
                  <iconify-icon icon="solar:lightbulb-linear" stroke-width="1.5" class="text-xl"></iconify-icon>
              </div>
              <h3 className="font-serif text-xl tracking-tight">Propose</h3>
              <p className="text-[#8a8580] text-sm leading-relaxed">Notice a missing market? Draft an IPO proposal. If the community backs it with enough votes, it goes live on the exchange.</p>
          </div>
          <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#d4af37]">
                  <iconify-icon icon="solar:cup-star-linear" stroke-width="1.5" class="text-xl"></iconify-icon>
              </div>
              <h3 className="font-serif text-xl tracking-tight">Own</h3>
              <p className="text-[#8a8580] text-sm leading-relaxed">Compete on the global rich list. Become a majority shareholder of your favorite assets and earn exclusive platform badges.</p>
          </div>
      </div>
    </div>
  );
}
