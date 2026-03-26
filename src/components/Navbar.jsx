import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Fetch & Subscribe to Notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifs();

    const sub = supabase.channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [user]);

  // Handle clicking outside the notification dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  const getLinkClass = (path) => {
    return location.pathname === path 
      ? 'nav-link text-[#f0ebe0] transition-colors relative' 
      : 'nav-link text-[#8a8580] hover:text-[#f0ebe0] transition-colors relative';
  };

  const getMobileLinkClass = (path) => {
    const base = "text-left py-3 px-4 rounded-lg transition-colors text-sm font-medium";
    return location.pathname === path
      ? `${base} text-[#f0ebe0] bg-[#1a1a1a]`
      : `${base} text-[#8a8580] hover:text-[#f0ebe0] hover:bg-[#0f0f0f]`;
  };

  const handleSignOut = async () => {
    closeMobileMenu();
    await signOut();
    navigate('/');
  };

  const balance = profile?.balance ?? 0;
  const initials = profile?.avatar_initials ?? '??';

  return (
    <>
      <nav className="border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center cursor-pointer">
              <Link to="/" onClick={closeMobileMenu}>
                <span className="font-serif italic text-2xl tracking-tight text-[#f0ebe0]">TraX</span>
              </Link>
            </div>
            
            {/* Center: Links */}
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
              <Link to="/market" className={getLinkClass('/market')}>Market</Link>
              <Link to="/portfolio" className={getLinkClass('/portfolio')}>Portfolio</Link>
              <Link to="/leaderboard" className={getLinkClass('/leaderboard')}>Leaderboard</Link>
              <Link to="/propose" className={getLinkClass('/propose')}>Propose</Link>
            </div>

            {/* Right: Auth/Profile */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center bg-[#0f0f0f] border border-[#1a1a1a] rounded-full px-3 py-1 mr-2">
                    <iconify-icon icon="solar:wallet-linear" stroke-width="1.5" class="text-[#8a8580] mr-2 text-sm"></iconify-icon>
                    <span className="font-mono text-[#d4af37] text-sm">₮{Number(balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>

                  {/* Notification Bell */}
                  <div className="relative" ref={notifRef}>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="text-[#8a8580] hover:text-[#f0ebe0] transition-colors p-1 relative flex items-center justify-center"
                    >
                      <iconify-icon icon="solar:bell-linear" stroke-width="1.5" class="text-[22px]"></iconify-icon>
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[#f87171] border border-[#0a0a0a]"></span>
                      )}
                    </button>

                    {/* Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-80 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-fade-in origin-top-right">
                        <div className="flex justify-between items-center p-3 border-b border-[#1a1a1a] bg-[#0a0a0a]/50">
                          <span className="text-xs font-mono font-medium text-[#8a8580] uppercase tracking-wider">Notifications</span>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[10px] text-[#d4af37] border border-[#d4af37]/20 rounded px-2 hover:bg-[#d4af37]/10 transition-colors">Mark all read</button>
                          )}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map(notif => (
                              <div 
                                key={notif.id} 
                                onClick={() => markAsRead(notif.id)}
                                className={`p-4 border-b border-[#1a1a1a] last:border-b-0 cursor-default transition-colors ${notif.is_read ? 'opacity-60' : 'bg-[#1a1a1a]/40 hover:bg-[#1a1a1a]'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-[#d4af37]'}`}></div>
                                  <div className="flex-1 space-y-1">
                                    <h4 className={`text-xs font-mono uppercase tracking-wider ${notif.is_read ? 'text-[#8a8580]' : 'text-[#f0ebe0]'}`}>{notif.title}</h4>
                                    <p className="text-xs text-[#8a8580] font-sans leading-relaxed">{notif.message}</p>
                                    <p className="text-[9px] text-[#5a5650] font-mono pt-1">
                                       {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center text-xs text-[#5a5650] font-mono">No notifications yet.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link to="/profile" className="h-8 w-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#2a2a2a] hover:border-[#d4af37] transition-colors ml-2">
                    <span className="font-mono text-xs text-[#d4af37]">{initials}</span>
                  </Link>
                </>
              ) : (
                <Link to="/auth" className="bg-[#d4af37] text-black font-medium text-sm px-4 py-2 rounded-lg hover:bg-[#e5c048] transition-colors">
                  Sign In
                </Link>
              )}
              {/* Mobile Menu Button */}
              <button onClick={toggleMobileMenu} className="md:hidden text-[#8a8580] hover:text-[#f0ebe0] transition-colors p-1">
                <iconify-icon icon="solar:hamburger-menu-linear" stroke-width="1.5" class="text-2xl"></iconify-icon>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeMobileMenu}></div>
          <div className="fixed top-0 right-0 w-72 h-full bg-[#0a0a0a] border-l border-[#1a1a1a] z-50 flex flex-col p-6 pt-20 shadow-2xl animate-slide-in">
            <button onClick={closeMobileMenu} className="absolute top-5 right-5 text-[#8a8580] hover:text-[#f0ebe0] transition-colors">
              <iconify-icon icon="solar:close-circle-linear" class="text-2xl"></iconify-icon>
            </button>
            <div className="flex flex-col space-y-1">
              <Link to="/" onClick={closeMobileMenu} className={getMobileLinkClass('/')}>Home</Link>
              <Link to="/market" onClick={closeMobileMenu} className={getMobileLinkClass('/market')}>Market</Link>
              <Link to="/portfolio" onClick={closeMobileMenu} className={getMobileLinkClass('/portfolio')}>Portfolio</Link>
              <Link to="/leaderboard" onClick={closeMobileMenu} className={getMobileLinkClass('/leaderboard')}>Leaderboard</Link>
              <Link to="/propose" onClick={closeMobileMenu} className={getMobileLinkClass('/propose')}>Propose</Link>
              {user && <Link to="/profile" onClick={closeMobileMenu} className={getMobileLinkClass('/profile')}>Profile</Link>}
            </div>
            <div className="mt-auto pt-6 border-t border-[#1a1a1a]">
              {user ? (
                <>
                  <div className="flex items-center bg-[#0f0f0f] border border-[#1a1a1a] rounded-full px-3 py-2 mb-4">
                    <iconify-icon icon="solar:wallet-linear" stroke-width="1.5" class="text-[#8a8580] mr-2 text-sm"></iconify-icon>
                    <span className="font-mono text-[#d4af37] text-sm">₮{Number(balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                  <button onClick={handleSignOut} className="block text-center w-full border border-[#f87171]/50 text-[#f87171] font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-[#f87171]/10 transition-colors">Sign Out</button>
                </>
              ) : (
                <Link to="/auth" onClick={closeMobileMenu} className="block text-center w-full bg-[#d4af37] text-black font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-[#e5c048] transition-colors">Sign In</Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
