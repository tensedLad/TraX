import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Market from './pages/Market';
import AssetDetail from './pages/AssetDetail';
import Portfolio from './pages/Portfolio';
import Leaderboard from './pages/Leaderboard';
import Propose from './pages/Propose';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import HowItWorks from './pages/HowItWorks';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Automatically scrolls window to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="market" element={<Market />} />
            <Route path="asset/:id" element={<AssetDetail />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="propose" element={<Propose />} />
            <Route path="auth" element={<Auth />} />
            <Route path="profile" element={<Profile />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
          </Route>
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
