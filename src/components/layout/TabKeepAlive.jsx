/**
 * Renders all tab pages simultaneously but hides inactive ones with `display:none`.
 * This preserves scroll position, filter state, and query cache between tab switches.
 */
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

export default function TabKeepAlive() {
  const { pathname } = useLocation();

  return (
    <>
      {TAB_ROUTES.map(({ path, Component }) => (
        <div key={path} style={{ display: pathname === path ? 'block' : 'none' }}>
          <Component />
        </div>
      ))}
    </>
  );
}