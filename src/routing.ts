import { useSyncExternalStore } from 'react';

/** Pages of the app. Hash URLs so GitHub Pages never 404s on reload. */
export type Route = 'training' | 'studio';

export function routeFromHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return path === 'studio' ? 'studio' : 'training';
}

export function hashForRoute(route: Route): string {
  return route === 'studio' ? '#/studio' : '#/';
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => routeFromHash(window.location.hash));
}
