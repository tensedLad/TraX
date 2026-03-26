import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Ticker() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase
        .from('assets')
        .select('ticker, current_price, change_24h')
        .order('volume_24h', { ascending: false });
      if (data) setAssets(data);
    };
    fetchAssets();

    // Realtime updates
    const channel = supabase
      .channel('ticker-prices')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        setAssets(prev => prev.map(a => a.ticker === payload.new.ticker ? { ...a, ...payload.new } : a));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (assets.length === 0) return null;

  // Double the items for seamless loop
  const items = [...assets, ...assets];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-t border-[#1a1a1a] overflow-hidden">
      <div className="flex animate-ticker whitespace-nowrap py-2">
        {items.map((asset, i) => {
          const change = Number(asset.change_24h);
          const isUp = change >= 0;
          return (
            <span key={`${asset.ticker}-${i}`} className="inline-flex items-center mx-5 text-xs font-mono">
              <span className="text-[#8a8580] mr-1.5">{asset.ticker}</span>
              <span className="text-[#f0ebe0] mr-1.5">₮{Number(asset.current_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={isUp ? 'text-[#4ade80]' : 'text-[#f87171]'}>{isUp ? '+' : ''}{change.toFixed(1)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
