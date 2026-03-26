import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Ticker from './Ticker';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col text-[#f0ebe0] bg-[#0a0a0a] pb-10">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <Ticker />
    </div>
  );
}
