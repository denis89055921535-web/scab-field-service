/**
 * Renders tab pages lazily (mounts on first visit) but keeps them mounted after.
 * This preserves scroll position, filter state, and query cache between tab switches.
 */
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Crews from '@/pages/Crews';
import Trips from '@/pages/Trips';
import Warehouse from '@/pages/Warehouse';
import Incidents from '@/pages/Incidents';
import Profile from '@/pages/Profile';

const TAB_ROUTES = [
  { path: '/', Component: Crews },
  { path: '/trips', Component: Trips },
  { path: '/warehouse', Component: Warehouse },
  { path: '/incidents', Component: Incidents },
  { path: '/profile', Component: Profile },
];

export default function TabKeepAlive({ partner }) {
  const { pathname } = useLocation();
  const visitedRef = useRef(new Set([pathname]));
  visitedRef.current.add(pathname);

  return (
    <>
      {TAB_ROUTES.map(({ path, Component }) => {
        if (!visitedRef.current.has(path)) return null;
        return (
          <div key={path} style={{ display: pathname === path ? 'block' : 'none' }}>
            {path === '/' ? <Component partner={partner} /> : <Component />}
          </div>
        );
      })}
    </>
  );
}