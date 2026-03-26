import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Propose() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [assetName, setAssetName] = useState('');
  const [tickerSymbol, setTickerSymbol] = useState('');
  const [category, setCategory] = useState('Physical');
  const [description, setDescription] = useState('');
  const [ipoPrice, setIpoPrice] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  useEffect(() => {
    fetchProposals();
  }, [user]);

  const fetchProposals = async () => {
    const { data: proposalData } = await supabase
      .from('proposals')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('votes', { ascending: false });

    if (proposalData) setProposals(proposalData);

    if (user) {
      const { data: votesData } = await supabase
        .from('votes')
        .select('proposal_id')
        .eq('user_id', user.id);

      if (votesData) setUserVotes(votesData.map(v => v.proposal_id));
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setFormMsg({ type: 'error', text: 'Please sign in to propose.' }); return; }
    if (!assetName.trim() || !tickerSymbol.trim() || !ipoPrice || !totalSupply) {
      setFormMsg({ type: 'error', text: 'Please fill in all required fields.' }); return;
    }
    
    setSubmitting(true);
    setFormMsg(null);

    const { error } = await supabase.from('proposals').insert({
      proposer_id: user.id,
      asset_name: assetName,
      ticker: tickerSymbol.toUpperCase(),
      category,
      description,
      ipo_price: parseFloat(ipoPrice),
      total_supply: parseInt(totalSupply),
    });

    setSubmitting(false);

    if (error) {
      setFormMsg({ type: 'error', text: error.message });
    } else {
      setFormMsg({ type: 'success', text: 'Proposal submitted!' });
      setAssetName(''); setTickerSymbol(''); setDescription(''); setIpoPrice(''); setTotalSupply('');
      fetchProposals();
    }
  };

  const handleVote = async (proposalId) => {
    if (!user) { navigate('/auth'); return; }

    const { error } = await supabase.from('votes').insert({
      user_id: user.id,
      proposal_id: proposalId,
    });

    if (!error) {
      // Increment vote count
      await supabase.from('proposals').update({ votes: proposals.find(p => p.id === proposalId).votes + 1 }).eq('id', proposalId);
      setUserVotes([...userVotes, proposalId]);
      fetchProposals();
    }
  };

  const catBadge = (cat) => {
    switch(cat) {
      case 'Physical': return 'text-blue-400 bg-blue-500/10';
      case 'Commodity': return 'text-amber-500 bg-amber-500/10';
      case 'Meme Stock': return 'text-[#fb923c] bg-[#fb923c]/10';
      default: return 'text-[#8a8580] bg-[#8a8580]/10';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-fade-in">
        <div className="text-center space-y-2">
            <h1 className="font-serif text-4xl tracking-tight text-[#f0ebe0]">Propose an Asset</h1>
            <p className="text-[#8a8580] text-sm">Draft an IPO. If it gets 50 votes, it goes live.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 md:p-8 space-y-6 shadow-2xl shadow-black">
            {formMsg && (
              <div className={`p-3 text-xs rounded-lg text-center ${formMsg.type === 'error' ? 'bg-red-900/20 border border-red-900/50 text-[#f87171]' : 'bg-green-900/20 border border-green-900/50 text-[#4ade80]'}`}>
                {formMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="block text-xs text-[#8a8580]">Asset Name</label>
                    <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Stanley Cup" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37] transition-colors" />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs text-[#8a8580]">Ticker Symbol</label>
                    <input type="text" value={tickerSymbol} onChange={e => setTickerSymbol(e.target.value)} placeholder="STAN" maxLength="5" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#d4af37] font-mono uppercase rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37] transition-colors" />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-xs text-[#8a8580]">Category</label>
                <div className="flex p-1 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
                    {['Physical', 'Commodity', 'Meme Stock'].map(cat => (
                      <button type="button" key={cat} onClick={() => setCategory(cat)} className={`flex-1 py-2 text-sm rounded-md transition-all ${category === cat ? 'text-[#f0ebe0] bg-[#1a1a1a]' : 'text-[#8a8580] hover:text-[#f0ebe0]'}`}>{cat}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-xs text-[#8a8580]">Description</label>
                <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Why should this be traded?" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37] resize-none"></textarea>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="block text-xs text-[#8a8580]">Proposed IPO Price (₮)</label>
                    <input type="text" inputMode="decimal" value={ipoPrice} onChange={e => setIpoPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="10.00" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37] transition-colors" />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs text-[#8a8580]">Total Supply</label>
                    <input type="text" inputMode="numeric" value={totalSupply} onChange={e => setTotalSupply(e.target.value.replace(/[^0-9]/g, ''))} placeholder="100000" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] font-mono rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37] transition-colors" />
                </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-[#d4af37] text-black font-medium py-3 rounded-lg hover:bg-[#e5c048] active:scale-[0.98] transition-all mt-4 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
        </form>

        {/* Active Proposals */}
        <div className="pt-8 border-t border-[#1a1a1a] space-y-6">
            <h2 className="font-serif text-xl tracking-tight">Active Proposals</h2>
            {loading ? (
              <div className="text-center py-8 text-[#8a8580] font-mono text-sm animate-pulse">Loading...</div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-8 text-[#8a8580] text-sm">No active proposals. Be the first to propose!</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {proposals.map(p => {
                  const hasVoted = userVotes.includes(p.id);
                  const pct = Math.min(100, (p.votes / p.votes_needed) * 100);
                  return (
                    <div key={p.id} className={`bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 ${hasVoted ? 'opacity-80' : ''}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-mono text-lg text-[#d4af37]">{p.ticker}</h3>
                                <p className="text-xs text-[#8a8580]">{p.asset_name}</p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${catBadge(p.category)}`}>{p.category}</span>
                        </div>
                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-[#8a8580]">Votes</span>
                                <span className="font-mono text-[#f0ebe0]">{p.votes} / {p.votes_needed}</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                                <div className="h-full bg-[#d4af37] transition-all" style={{width: `${pct}%`}}></div>
                            </div>
                        </div>
                        {hasVoted ? (
                          <button className="w-full py-2 text-sm border border-[#4ade80] text-[#4ade80] bg-[#4ade80]/10 rounded flex justify-center items-center pointer-events-none">
                              <iconify-icon icon="solar:check-circle-linear" class="mr-2"></iconify-icon> Voted
                          </button>
                        ) : (
                          <button onClick={() => handleVote(p.id)} className="w-full py-2 text-sm border border-[#2a2a2a] text-[#f0ebe0] rounded hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
                              Vote
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
        </div>
    </div>
  );
}
