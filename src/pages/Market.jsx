import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MarketSkeleton } from '../components/Skeleton';

export default function Market() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Default (A-Z)');
  const [sortOpen, setSortOpen] = useState(false);
  const sortOptions = ['Default (A-Z)', 'Volume (High-Low)', 'Volume (Low-High)', 'Price (High-Low)', 'Price (Low-High)', '% Change', 'Mkt Cap'];

  // Fetch assets from Supabase with polling (saves realtime connections)
  useEffect(() => {
    const fetchAssets = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('volume_24h', { ascending: false });

      if (!error && data) {
        setAssets(data);
      }
      setLoading(false);
    };

    fetchAssets();
    // Polling every 5s instead of realtime WebSocket (Free Tier optimization)
    const poller = setInterval(fetchAssets, 5000);
    return () => clearInterval(poller);
  }, []);

  const getCatColor = (category) => {
    switch(category) {
      case 'Physical': return 'text-blue-400 bg-blue-500/10';
      case 'Commodity': return 'text-amber-500 bg-amber-500/10';
      case 'Meme Stock': return 'text-[#fb923c] bg-[#fb923c]/10';
      default: return 'text-[#8a8580] bg-[#8a8580]/10';
    }
  };

  const formatVolume = (vol) => {
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(0) + 'K';
    return vol?.toString() ?? '0';
  };

  const catMap = { 'physical': 'Physical', 'commodity': 'Commodity', 'meme': 'Meme Stock' };

  const filteredAssets = assets
    .filter(asset => {
      const matchesCat = activeCategory === 'all' || asset.category === catMap[activeCategory];
      const matchesSearch = asset.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            asset.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'Price (High-Low)': return Number(b.current_price) - Number(a.current_price);
        case 'Price (Low-High)': return Number(a.current_price) - Number(b.current_price);
        case 'Volume (High-Low)': return Number(b.volume_24h) - Number(a.volume_24h);
        case 'Volume (Low-High)': return Number(a.volume_24h) - Number(b.volume_24h);
        case '% Change': return Math.abs(Number(b.change_24h)) - Math.abs(Number(a.change_24h));
        case 'Mkt Cap': return (Number(b.current_price) * Number(b.total_supply)) - (Number(a.current_price) * Number(a.total_supply));
        default: return a.ticker.localeCompare(b.ticker);
      }
    });

  const categoryCounts = {
    all: assets.length,
    physical: assets.filter(a => a.category === 'Physical').length,
    commodity: assets.filter(a => a.category === 'Commodity').length,
    meme: assets.filter(a => a.category === 'Meme Stock').length,
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
      {/* Sidebar Filters */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-6">
          <div>
              <h3 className="text-xs uppercase tracking-wider text-[#8a8580] font-medium mb-3">Categories</h3>
              <div className="flex md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-2 md:pb-0">
                  {[
                    {key: 'all', label: 'All Assets'},
                    {key: 'physical', label: 'Physical Goods'},
                    {key: 'commodity', label: 'Commodities'},
                    {key: 'meme', label: 'Meme Stocks'},
                  ].map(cat => (
                    <button key={cat.key} onClick={() => setActiveCategory(cat.key)} className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${activeCategory === cat.key ? 'bg-[#1a1a1a] text-[#f0ebe0] border border-[#2a2a2a]' : 'text-[#8a8580] hover:bg-[#0f0f0f] hover:text-[#f0ebe0] border border-transparent'}`}>
                        <span>{cat.label}</span>
                        <span className="font-mono text-xs hidden md:inline text-[#5a5650]">{categoryCounts[cat.key]}</span>
                    </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 space-y-4">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f0f0f] p-2 rounded-lg border border-[#1a1a1a]">
              <div className="relative w-full sm:w-64">
                  <iconify-icon icon="solar:magnifer-linear" class="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8580]"></iconify-icon>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ticker or name..." 
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] text-sm rounded-md pl-9 pr-3 py-2 focus:outline-none focus:border-[#d4af37] transition-colors" 
                  />
              </div>
              <div className="relative">
                  <button onClick={() => setSortOpen(!sortOpen)} className="flex items-center space-x-2 bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] text-sm rounded-lg px-3 py-2 hover:border-[#2a2a2a] transition-colors cursor-pointer">
                      <span className="text-[#8a8580] text-xs">Sort:</span>
                      <span>{sortBy}</span>
                      <iconify-icon icon="solar:alt-arrow-down-linear" class={`text-[#8a8580] text-xs transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}></iconify-icon>
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg shadow-xl shadow-black/50 overflow-hidden">
                        {sortOptions.map(opt => (
                          <button key={opt} onClick={() => { setSortBy(opt); setSortOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === opt ? 'text-[#d4af37] bg-[#1a1a1a]' : 'text-[#f0ebe0] hover:bg-[#141414]'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
              </div>
          </div>

          {/* Asset List Header */}
          <div className="hidden md:grid grid-cols-14 gap-4 px-4 py-2 text-xs text-[#8a8580] uppercase tracking-wider font-medium border-b border-[#1a1a1a]" style={{gridTemplateColumns: 'repeat(14, minmax(0, 1fr))'}}>
              <div className="col-span-4">Asset</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">24h Change</div>
              <div className="col-span-2 text-right">Volume</div>
              <div className="col-span-2 text-right">Mkt Cap</div>
              <div className="col-span-2 text-right">Status</div>
          </div>

          {/* Loading */}
          {loading && <MarketSkeleton />}

          {/* Asset Rows */}
          <div className="space-y-2">
            {filteredAssets.map(asset => (
              <div 
                key={asset.id}
                onClick={() => navigate(`/asset/${asset.ticker}`)} 
                className="group grid grid-cols-2 gap-4 items-center bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 hover:bg-[#141414] hover:border-[#2a2a2a] transition-all duration-200 cursor-pointer md:grid-cols-none" style={{gridTemplateColumns: 'repeat(14, minmax(0, 1fr))'}}
              >
                  <div className="col-span-2 md:col-span-4 flex items-center space-x-3" style={{gridColumn: 'span 4 / span 4'}}>
                      <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center font-serif text-[#d4af37]">{asset.ticker[0]}</div>
                      <div>
                          <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm text-[#f0ebe0]">{asset.ticker}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${getCatColor(asset.category)}`}>{asset.category}</span>
                          </div>
                          <div className="text-xs text-[#8a8580]">{asset.name}</div>
                      </div>
                  </div>
                  <div className="text-right col-span-1 md:col-span-2 font-mono text-sm text-[#f0ebe0]">₮{Number(asset.current_price).toFixed(2)}</div>
                  <div className={`text-right col-span-1 md:col-span-2 font-mono text-sm ${Number(asset.change_24h) < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                    {Number(asset.change_24h) >= 0 ? '+' : ''}{Number(asset.change_24h).toFixed(2)}%
                  </div>
                  <div className="text-right hidden md:block col-span-2 font-mono text-sm text-[#8a8580]">{formatVolume(Number(asset.volume_24h))}</div>
                  <div className="text-right hidden md:block col-span-2 font-mono text-sm text-[#8a8580]">{formatVolume(Number(asset.current_price) * Number(asset.total_supply))}</div>
                  <div className="text-right hidden md:block col-span-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${asset.status === 'ACTIVE' ? 'text-[#4ade80] bg-[#4ade80]/10' : 'text-[#d4af37] bg-[#d4af37]/10'}`}>
                      {asset.status}
                    </span>
                  </div>
              </div>
            ))}
            {!loading && filteredAssets.length === 0 && (
              <div className="text-center py-12 text-[#8a8580] font-mono text-sm">
                No assets found matching your criteria.
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
