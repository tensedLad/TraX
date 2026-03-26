import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LeaderboardSkeleton } from '../components/Skeleton';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [rektList, setRektList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Top 20 for Rich List
      const { data: rich } = await supabase
        .from('leaderboard')
        .select('*')
        .order('net_worth', { ascending: false })
        .limit(20);

      // Bottom 3 for Rekt Board (must be below starting balance 10k)
      const { data: rekt } = await supabase
        .from('leaderboard')
        .select('*')
        .lt('net_worth', 10000)
        .order('net_worth', { ascending: true })
        .limit(3);

      if (rich) setLeaders(rich);
      if (rekt) setRektList(rekt);
      
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const formatNetWorth = (val) => {
    const n = Number(val);
    if (n >= 1000000) return '₮' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '₮' + (n / 1000).toFixed(0) + 'K';
    return '₮' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-12 animate-fade-in">
        <div className="text-center space-y-2">
            <h1 className="font-serif text-4xl tracking-tight text-[#f0ebe0]">The Board</h1>
            <p className="text-[#8a8580] text-sm">Where reputations are forged and ruined.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Rich List */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="font-serif text-xl tracking-tight flex items-center">
                    <iconify-icon icon="solar:crown-linear" class="text-[#d4af37] mr-2"></iconify-icon> Rich List
                </h2>
                {loading ? (
                  <LeaderboardSkeleton />
                ) : leaders.length === 0 ? (
                  <div className="text-center py-8 text-[#8a8580] text-sm">No traders yet. Be the first to sign up!</div>
                ) : (
                  <div className="space-y-2">
                    {leaders.map((leader, i) => (
                      <div key={leader.id} className={`flex items-center p-3 bg-[#0f0f0f] border rounded-xl transition-colors ${i === 0 ? 'border-[#d4af37]/50 relative overflow-hidden group' : 'border-[#1a1a1a] hover:bg-[#151515]'}`}>
                          {i === 0 && <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                          <div className={`font-mono w-8 text-center mr-3 ${i === 0 ? 'text-2xl text-[#d4af37]' : 'text-xl text-[#8a8580]'}`}>{i + 1}</div>
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-mono text-xs mr-3 z-10 ${i === 0 ? 'bg-[#1a1a1a] border border-[#d4af37] text-[#d4af37]' : 'bg-[#1a1a1a]'}`}>
                            {leader.avatar_initials}
                          </div>
                          <div className="flex-1 z-10">
                              <div className="text-sm font-medium">{leader.username}</div>
                              <div className="font-mono text-xs text-[#8a8580]">{leader.total_trades} trades</div>
                          </div>
                          <div className="font-mono text-sm z-10">{formatNetWorth(leader.net_worth)}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Rekt Board */}
            <div className="space-y-4">
                <div>
                    <h2 className="font-serif text-xl tracking-tight text-[#f87171] flex items-center">
                        <iconify-icon icon="solar:skull-linear" class="mr-2"></iconify-icon> Rekt Board
                    </h2>
                    <p className="text-sm text-[#8a8580] mt-1 italic">"They believed. The market didn't."</p>
                </div>
                <div className="space-y-2">
                    {loading ? (
                      <LeaderboardSkeleton />
                    ) : rektList.length === 0 ? (
                      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 text-center">
                        <iconify-icon icon="solar:shield-check-linear" class="text-3xl text-[#4ade80] mb-2"></iconify-icon>
                        <p className="text-sm text-[#8a8580]">No one has been rekt yet.</p>
                        <p className="text-xs text-[#5a5650] mt-1">Losses will appear here when traders go below ₮10,000.</p>
                      </div>
                    ) : (
                      rektList.map((user, i) => (
                        <div key={user.id} className="flex items-center p-3 bg-red-900/10 border border-red-900/30 rounded-xl">
                            <div className="h-10 w-10 rounded-full bg-red-950 flex items-center justify-center font-mono text-[#f87171] text-xs mr-3">{user.avatar_initials}</div>
                            <div className="flex-1">
                                <div className="text-sm font-medium text-[#f87171]">{user.username}</div>
                                <div className="font-mono text-xs text-[#8a8580]">{user.total_trades} trades</div>
                            </div>
                            <div className="font-mono text-sm text-[#f87171]">-₮{(10000 - Number(user.net_worth)).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                        </div>
                      ))
                    )}
                </div>
                <p className="text-xs text-[#5a5650] text-center italic">Shows traders who dropped below starting balance.</p>
            </div>

        </div>
    </div>
  );
}
