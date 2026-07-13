import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import ActiveVisitBar from './ActiveVisitBar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        {/* Rides above every page, so a running visit stays visible app-wide. */}
        <ActiveVisitBar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
