import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ProfileSkeleton } from '../components/Skeleton';

// Helper for time ago
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hr ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day ago`;
}

export default function Profile() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch Stats
      const { data: statsData } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('id', user.id)
        .single();
      if (statsData) setStats(statsData);

      // Fetch Holdings
      const { data: holdingsData } = await supabase
        .from('holdings')
        .select('*, assets(current_price)')
        .eq('user_id', user.id);
      
      if (holdingsData) {
         // Calculate percentages based on total portfolio value
         const totalVal = holdingsData.reduce((sum, h) => sum + (h.quantity * (h.assets?.current_price || 0)), 0);
         const processed = holdingsData.map(h => ({
            ticker: h.ticker,
            percentage: totalVal > 0 ? ((h.quantity * (h.assets?.current_price || 0)) / totalVal * 100).toFixed(1) : 0,
         })).sort((a,b) => b.percentage - a.percentage);
         setHoldings(processed);
      }

      // Fetch Recent Activity (Trades + Votes)
      // Since supabase JS client limits cross-table complex queries without RPC, 
      // we'll fetch trades and votes separately and merge them.
      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(5);

      const trades = (tradesData || []).map(t => ({
         action: t.side === 'buy' ? 'Bought' : 'Sold',
         target: t.ticker,
         time: t.executed_at
      }));

      // Combine and sort
      const combined = [...trades].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
      setActivities(combined);

      setLoading(false);
    };

    fetchData();
  }, [user, profile]);

  if (!user) return null;
  if (loading) return <ProfileSkeleton />;

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="max-w-4xl mx-auto w-full animate-fade-in pb-20 space-y-10 mt-6 md:mt-10">
      
      {/* 1. Header Card */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Avatar */}
          <div className="h-[90px] w-[90px] rounded-full border border-[#d4af37] flex items-center justify-center shrink-0">
            <span className="font-serif text-[26px] text-[#d4af37]">{profile?.avatar_initials || '??'}</span>
          </div>
          
          {/* Info */}
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-3xl font-serif text-[#f0ebe0] tracking-wide m-0 leading-none pb-2">{profile?.username || 'Trader'}</h1>
            <p className="font-mono text-xs text-[#5a5650]">Joined {joinDate}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-3">
               <span className="px-3 py-1 flex items-center gap-1.5 border border-[#d4af37]/20 rounded-md text-[10px] uppercase font-mono tracking-widest text-[#d4af37]">
                  <iconify-icon icon="solar:star-linear" class="text-sm"></iconify-icon> Whale
               </span>
               <span className="px-3 py-1 flex items-center gap-1.5 border border-[#3b82f6]/20 rounded-md text-[10px] uppercase font-mono tracking-widest text-[#3b82f6]">
                  <iconify-icon icon="solar:shield-check-linear" class="text-sm"></iconify-icon> Diamond Hands
               </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="text-center md:text-right flex flex-row md:flex-col gap-6 md:gap-4 pt-2 md:pt-0">
          <div>
             <div className="text-[10px] text-[#5a5650] uppercase tracking-widest font-mono mb-1.5">Public Net Worth</div>
             <div className="text-[22px] font-mono text-[#d4af37]">₮{Number(stats?.net_worth || profile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          </div>
          <div>
             <div className="text-[10px] text-[#5a5650] uppercase tracking-widest font-mono mb-1.5">Total Trades</div>
             <div className="text-[17px] font-mono text-[#f0ebe0]">{profile?.total_trades || 0}</div>
          </div>
        </div>
      </div>

      {/* 2. PUBLIC HOLDINGS */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono text-[#5a5650] uppercase tracking-widest font-semibold ml-1">Public Holdings</h2>
        {holdings.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {holdings.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 border border-[#1a1a1a] rounded-full text-[11px] font-mono bg-transparent">
                 <span className="text-[#d4af37]">{h.ticker}</span>
                 <span className="text-[#2a2a2a] leading-none mb-0.5">|</span>
                 <span className="text-[#f0ebe0]">{h.percentage}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#5a5650] font-mono ml-1">No public holdings yet.</p>
        )}
      </div>

      {/* 3. RECENT ACTIVITY */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono text-[#5a5650] uppercase tracking-widest font-semibold ml-1">Recent Activity</h2>
        <div className="bg-transparent border border-[#1a1a1a] rounded-xl flex flex-col">
          {activities.length > 0 ? activities.map((act, i) => (
            <div key={i} className="flex justify-between items-center px-6 py-5 border-b border-[#1a1a1a] last:border-b-0 group hover:bg-[#1a1a1a] transition-colors">
               <div className="flex items-center gap-2 font-mono text-xs font-medium">
                  <span className={act.action === 'Bought' ? 'text-[#4ade80]' : act.action === 'Sold' ? 'text-[#f87171]' : 'text-[#3b82f6]'}>
                     {act.action}
                  </span>
                  <span className="text-[#d4af37]">{act.target}</span>
               </div>
               <span className="text-xs text-[#5a5650] font-mono">{timeAgo(act.time)}</span>
            </div>
          )) : (
            <div className="px-6 py-5 text-xs text-[#5a5650] font-mono">No recent activity found. Make a trade!</div>
          )}
        </div>
      </div>

    </div>
  );
}
