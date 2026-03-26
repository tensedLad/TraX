import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Market from './pages/Market';
import AssetDetail from './pages/AssetDetail';
import Portfolio from './pages/Portfolio';
import Leaderboard from './pages/Leaderboard';
import Propose from './pages/Propose';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

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
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
