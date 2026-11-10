import { useEffect } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider, useStore } from './data/store';
import { Icon, Mark } from './components/ui';
import { todayTasks } from './lib/logic';
import Auth from './pages/Auth';
import Welcome from './pages/Welcome';
import Today from './pages/Today';
import Morning from './pages/Morning';
import Board from './pages/Board';
import Dump from './pages/Dump';
import Load from './pages/Load';
import Focus from './pages/Focus';
import Habits from './pages/Habits';
import HabitForm from './pages/HabitForm';
import HabitDetail from './pages/HabitDetail';
import Closing from './pages/Closing';
import Month from './pages/Month';
import Settings from './pages/Settings';
import Wallpaper from './pages/Wallpaper';
import { useWallpaperSync } from './data/useWallpaperSync';

const NAV = [
  { to: '/', icon: 'today', label: 'Today' },
  { to: '/board', icon: 'board', label: 'Board' },
  { to: '/habits', icon: 'habits', label: 'Habits' },
  { to: '/load', icon: 'load', label: 'Load' },
  { to: '/closing', icon: 'closing', label: 'Closing' },
];

function useTheme() {
  const { db } = useStore();
  const theme = db.profile.theme;
  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#1B1417' : '#FDF5F3');
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function Shell() {
  const store = useStore();
  const { db, status, toast } = store;
  useTheme();
  useWallpaperSync();

  if (status === 'loading') return <div className="empty muted" style={{ paddingTop: 120 }}>Loading your week…</div>;
  if (status === 'error')
    return (
      <div className="page">
        <div className="banner">Could not load your data: {store.error}</div>
      </div>
    );
  if (status === 'signed-out') return <Auth />;
  if (!db.profile.onboarded) return <Welcome />;

  const openToday = todayTasks(db).filter((t) => t.status === 'open').length;
  const badge = (to: string) => (to === '/' && openToday ? openToday : 0);

  return (
    <div className="shell">
      <aside className="side" aria-label="Main">
        <div className="brand">
          <span className="brand-tile">
            <Mark size={23} />
          </span>
          tessera
        </div>
        {[...NAV, { to: '/month', icon: 'month', label: 'Month' }, { to: '/wallpaper', icon: 'sun', label: 'Wallpaper' }].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}>
            <Icon name={n.icon} />
            {n.label}
            {badge(n.to) > 0 && (
              <span className="chip max" style={{ marginLeft: 'auto', height: 22 }}>
                {badge(n.to)}
              </span>
            )}
          </NavLink>
        ))}
        <div className="grow" />
        <NavLink to="/settings" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}>
          <Icon name="settings" />
          Settings
        </NavLink>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/morning" element={<Morning />} />
          <Route path="/board" element={<Board />} />
          <Route path="/dump" element={<Dump />} />
          <Route path="/load" element={<Load />} />
          <Route path="/focus/:id" element={<Focus />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/habits/new" element={<HabitForm />} />
          <Route path="/habits/:id" element={<HabitDetail />} />
          <Route path="/habits/:id/edit" element={<HabitForm />} />
          <Route path="/closing" element={<Closing />} />
          <Route path="/month" element={<Month />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/wallpaper" element={<Wallpaper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {[...NAV, { to: '/settings', icon: 'settings', label: 'More' }].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Shell />
      </BrowserRouter>
    </StoreProvider>
  );
}
