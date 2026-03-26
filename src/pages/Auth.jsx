import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const toggleMode = (e) => {
    e.preventDefault();
    setIsLogin(!isLogin);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // On success, redirect to portfolio
        navigate('/portfolio');
      } else {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            }
          }
        });
        if (error) throw error;
        
        setSuccessMsg('Signup successful! Please check your email for a confirmation link.');
      }
    } catch (error) {
      setErrorMsg(error.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-md bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-8 shadow-2xl shadow-black relative overflow-hidden">
            
            {/* Decorative blur */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-center mb-8">
                <h1 className="font-serif italic text-3xl tracking-tight text-[#f0ebe0] mb-2">TraX</h1>
                <p className="text-sm text-[#8a8580]">{isLogin ? 'Sign in to your trading desk.' : 'Create your trading account.'}</p>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 text-[#f87171] text-xs rounded-lg animate-fade-in text-center">
                    {errorMsg}
                </div>
            )}
            {successMsg && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 text-[#4ade80] text-xs rounded-lg animate-fade-in text-center">
                    {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <button type="button" onClick={handleGoogleAuth} disabled={loading} className="w-full flex items-center justify-center space-x-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#f0ebe0] py-2.5 rounded-lg hover:bg-[#222] transition-colors text-sm disabled:opacity-50">
                    <iconify-icon icon="logos:google-icon"></iconify-icon>
                    <span>Continue with Google</span>
                </button>

                <div className="flex items-center py-2">
                    <div className="flex-1 border-t border-[#1a1a1a]"></div>
                    <span className="px-3 text-xs text-[#5a5650]">OR</span>
                    <div className="flex-1 border-t border-[#1a1a1a]"></div>
                </div>

                {/* Sign Up: Username field */}
                {!isLogin && (
                  <div className="space-y-1.5 animate-slide-in">
                      <label className="block text-xs text-[#8a8580]">Username</label>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ChadTrader99" 
                        required 
                        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37]" 
                      />
                  </div>
                )}

                <div className="space-y-1.5">
                    <label className="block text-xs text-[#8a8580]">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com" 
                      required 
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37]" 
                    />
                </div>
                
                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="block text-xs text-[#8a8580]">Password</label>
                        {isLogin && <a href="#" className="text-xs text-[#d4af37] hover:underline">Forgot?</a>}
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      required 
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#d4af37]" 
                    />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#d4af37] text-black font-medium py-3 rounded-lg hover:bg-[#e5c048] active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>
            </form>

            <div className="text-center mt-6 text-xs text-[#8a8580]">
                <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>{' '}
                <a href="#" onClick={toggleMode} className="text-[#d4af37] hover:underline">
                  {isLogin ? 'Sign up and get ₮10,000' : 'Sign in'}
                </a>
            </div>
        </div>
    </div>
  );
}
