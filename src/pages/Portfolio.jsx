import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PortfolioSkeleton } from '../components/Skeleton';

export default function Portfolio() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      // Fetch holdings with asset details
      const { data: holdingsData } = await supabase
        .from('holdings')
        .select('*, assets(*)')
        .eq('user_id', user.id);

      if (holdingsData) setHoldings(holdingsData);

      // Fetch pending orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (ordersData) setOrders(ordersData);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <iconify-icon icon="solar:lock-linear" class="text-4xl text-[#8a8580] mb-4"></iconify-icon>
        <h2 className="font-serif text-2xl text-[#f0ebe0] mb-2">Sign in to view your portfolio</h2>
        <p className="text-[#8a8580] text-sm mb-6">Track your holdings, orders, and performance.</p>
        <button onClick={() => navigate('/auth')} className="bg-[#d4af37] text-black font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-[#e5c048] transition-colors">Sign In</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <h1 className="font-serif text-3xl tracking-tight text-[#f0ebe0]">My Portfolio</h1>
        <PortfolioSkeleton />
      </div>
    );
  }

  const balance = Number(profile?.balance ?? 0);
  const totalTrades = profile?.total_trades ?? 0;

  // Calculate portfolio value
  const portfolioValue = holdings.reduce((sum, h) => {
    const currentPrice = Number(h.assets?.current_price ?? 0);
    return sum + Number(h.quantity) * currentPrice;
  }, 0);
  const totalValue = balance + portfolioValue;
  const totalPnL = holdings.reduce((sum, h) => {
    const currentPrice = Number(h.assets?.current_price ?? 0);
    const avgPrice = Number(h.avg_buy_price);
    return sum + (currentPrice - avgPrice) * Number(h.quantity);
  }, 0);

  return (
    <div className="space-y-8 animate-fade-in">
        <h1 className="font-serif text-3xl tracking-tight text-[#f0ebe0]">My Portfolio</h1>
        
        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-xl">
                <div className="text-xs text-[#8a8580] mb-1">Total Value</div>
                <div className="font-mono text-2xl text-[#f0ebe0]">₮{totalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-xl">
                <div className="text-xs text-[#8a8580] mb-1">Total P&L</div>
                <div className={`font-mono text-2xl ${totalPnL >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                  {totalPnL >= 0 ? '+' : ''}₮{totalPnL.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
            </div>
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-xl">
                <div className="text-xs text-[#8a8580] mb-1">Available Balance</div>
                <div className="font-mono text-2xl text-[#f0ebe0]">₮{balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-xl">
                <div className="text-xs text-[#8a8580] mb-1">Total Trades</div>
                <div className="font-mono text-2xl text-[#f0ebe0]">{totalTrades}</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Holdings Table */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="font-serif text-xl tracking-tight border-b border-[#1a1a1a] pb-2">Holdings</h2>
                {holdings.length === 0 ? (
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-8 text-center">
                    <p className="text-[#8a8580] text-sm">No holdings yet. Start trading on the <button onClick={() => navigate('/market')} className="text-[#d4af37] hover:underline">Market</button> page!</p>
                  </div>
                ) : (
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-[#8a8580] uppercase border-b border-[#1a1a1a]">
                                <th className="p-4 font-medium">Asset</th>
                                <th className="p-4 font-medium text-right">Shares</th>
                                <th className="p-4 font-medium text-right">Avg Price</th>
                                <th className="p-4 font-medium text-right">Current Price</th>
                                <th className="p-4 font-medium text-right">P&L</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {holdings.map(h => {
                              const currentPrice = Number(h.assets?.current_price ?? 0);
                              const avgPrice = Number(h.avg_buy_price);
                              const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice * 100) : 0;
                              return (
                                <tr key={h.id} onClick={() => navigate(`/asset/${h.ticker}`)} className="border-b border-[#1a1a1a] hover:bg-[#151515] transition-colors cursor-pointer">
                                    <td className="p-4"><span className="font-mono text-[#d4af37]">{h.ticker}</span></td>
                                    <td className="p-4 text-right font-mono">{Number(h.quantity).toFixed(0)}</td>
                                    <td className="p-4 text-right font-mono text-[#8a8580]">{avgPrice.toFixed(2)}</td>
                                    <td className="p-4 text-right font-mono">{currentPrice.toFixed(2)}</td>
                                    <td className={`p-4 text-right font-mono ${pnlPct >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                        </tbody>
                    </table>
                  </div>
                )}
            </div>

            {/* Open Orders Sidebar */}
            <div className="lg:col-span-1 space-y-4">
                <h2 className="font-serif text-xl tracking-tight border-b border-[#1a1a1a] pb-2">Open Orders</h2>
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-2 space-y-2">
                    {orders.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[#5a5650]">No open orders.</div>
                    ) : (
                      orders.map(o => (
                        <div key={o.id} className="p-3 border border-[#1a1a1a] rounded-lg bg-[#0a0a0a] relative group">
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const { data } = await supabase.rpc('cancel_order', { p_user_id: user.id, p_order_id: o.id });
                                    if (data && data.success) {
                                      setOrders(prev => prev.filter(order => order.id !== o.id));
                                    }
                                }}
                                className="absolute top-2 right-2 text-[#8a8580] hover:text-[#f87171] opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Cancel Order"
                            >
                                <iconify-icon icon="solar:close-circle-bold" class="text-xl"></iconify-icon>
                            </button>
                            <div className="flex justify-between items-start mb-2 pr-6">
                                <div>
                                    <span className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded ${o.side === 'sell' ? 'text-[#f87171] bg-[#f87171]/10' : 'text-[#4ade80] bg-[#4ade80]/10'}`}>{o.order_type} {o.side}</span>
                                    <span className="font-mono text-sm ml-2 text-[#d4af37]">{o.ticker}</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-[#8a8580] font-mono">
                                <span>Qty: {Number(o.quantity).toFixed(0)}</span>
                                <span>Price: {Number(o.price).toFixed(2)}</span>
                            </div>
                        </div>
                      ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
