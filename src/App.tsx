import { useEffect } from 'react';
import { useLayoutStore } from './dashboard/layout';
import { TrainingPage } from './pages/TrainingPage';
import { StudioPage } from './pages/StudioPage';
import { hashForRoute, useRoute, type Route } from './routing';
import { startEngine } from './state/engine';
import { useMusicStore } from './state/store';

const TABS: { route: Route; label: string }[] = [
  { route: 'training', label: 'Entraînement' },
  { route: 'studio', label: 'Studio' },
];

export function App() {
  const status = useMusicStore((s) => s.status);
  const resetLayout = useLayoutStore((s) => s.reset);
  const route = useRoute();

  useEffect(() => startEngine(), []);

  return (
    <>
      <header className="topbar">
        <h1>Piano Tools</h1>
        <nav className="page-tabs" aria-label="Pages">
          {TABS.map((t) => (
            <a key={t.route} href={hashForRoute(t.route)} className={`page-tab ${route === t.route ? 'is-active' : ''}`} aria-current={route === t.route ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
        <span className="topbar-status">{status}</span>
        {route === 'training' && <button className="text-button" onClick={resetLayout}>Réinitialiser la disposition</button>}
      </header>
      {route === 'training' ? <TrainingPage /> : <StudioPage />}
      <footer className="footer">Made by Damien Rongier</footer>
    </>
  );
}
