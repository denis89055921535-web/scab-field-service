import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import Crews from '@/pages/Crews';
import CrewView from '@/pages/CrewView';
import Trips from '@/pages/Trips';
import TripForm from '@/pages/TripForm';
import Instructions from '@/pages/Instructions';
import Profile from '@/pages/Profile';
import AdminCrews from '@/pages/admin/AdminCrews';
import AdminTrips from '@/pages/admin/AdminTrips';
import AdminInstructions from '@/pages/admin/AdminInstructions';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminWarehouse from '@/pages/admin/AdminWarehouse';
import AdminIncidents from '@/pages/admin/AdminIncidents';
import Incidents from '@/pages/Incidents';
import Warehouse from '@/pages/Warehouse';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Crews />} />
        <Route path="/crew/:id" element={<CrewView />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:id" element={<TripForm />} />
        <Route path="/warehouse" element={<Warehouse />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/instructions" element={<Instructions />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminCrews />} />
        <Route path="/admin/trips" element={<AdminTrips />} />
        <Route path="/admin/instructions" element={<AdminInstructions />} />
        <Route path="/admin/warehouse" element={<AdminWarehouse />} />
        <Route path="/admin/incidents" element={<AdminIncidents />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => document.documentElement.classList.toggle('dark', e.matches);
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App