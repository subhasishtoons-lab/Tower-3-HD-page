import React, { useState } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { AboutTower3 } from './modules/AboutTower3';
import { ActivityHistory } from './modules/ActivityHistory';
import { AdminDashboard } from './modules/AdminDashboard';
import { AuthScreen } from './modules/AuthScreen';
import { BackupRestore } from './modules/BackupRestore';
import { DiscussionForum } from './modules/DiscussionForum';
import { EmergencyAnnouncements } from './modules/EmergencyAnnouncements';
import { EmergencyContacts } from './modules/EmergencyContacts';
import { ExpensesModule } from './modules/ExpensesModule';
import { HomeDashboard } from './modules/HomeDashboard';
import { MaintenanceTracker } from './modules/MaintenanceTracker';
import { MeetingsModule } from './modules/MeetingsModule';
import { MonthlyBills } from './modules/MonthlyBills';
import { NoticeBoard } from './modules/NoticeBoard';
import { ResidentManagement } from './modules/ResidentManagement';
import { useAuthStore } from './store/useAuthStore';
import { useTowerStore } from './store/useTowerStore';
import type { ModuleId } from './types';

export default function App() {
  const auth = useAuthStore();
  const store = useTowerStore(auth.session);
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [selectedUnitForResidents, setSelectedUnitForResidents] = useState<string | null>(null);

  const handleLogout = () => {
    auth.logout();
    setActiveModule('home');
    setSelectedUnitForResidents(null);
  };

  if (!auth.session) {
    return (
      <AuthScreen
        auth={auth}
        onResidentSignedUp={store.ensureResidentNameForUnit}
      />
    );
  }

  const activeEmergenciesCount = store.state.emergencies.filter(
    (e) => e.status === 'active'
  ).length;
  const openMaintenanceCount = store.state.maintenanceRequests.filter(
    (m) => m.status === 'open' || m.status === 'in_progress'
  ).length;

  const handleSelectModule = (id: ModuleId) => {
    if (id !== 'residents') {
      setSelectedUnitForResidents(null);
    }
    setActiveModule(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectUnitFromAbout = (unitNumber: string) => {
    setSelectedUnitForResidents(unitNumber);
    setActiveModule('residents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'home':
        return <HomeDashboard store={store} onNavigate={handleSelectModule} />;
      case 'residents':
        return (
          <ResidentManagement
            key={selectedUnitForResidents || 'all'}
            store={store}
            initialSelectedUnit={selectedUnitForResidents}
          />
        );
      case 'bills':
        return <MonthlyBills store={store} />;
      case 'expenses':
        return <ExpensesModule store={store} />;
      case 'notices':
        return <NoticeBoard store={store} />;
      case 'emergencies':
        return <EmergencyAnnouncements store={store} />;
      case 'discussions':
        return <DiscussionForum store={store} />;
      case 'maintenance':
        return <MaintenanceTracker store={store} />;
      case 'meetings':
        return <MeetingsModule store={store} />;
      case 'contacts':
        return <EmergencyContacts store={store} />;
      case 'activity':
        return <ActivityHistory store={store} />;
      case 'admin':
        if (auth.session?.role !== 'admin') {
          return (
            <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-[#0B1F3A]">
                <Lock className="h-6 w-6" />
              </div>
              <h1 className="mt-4 font-display text-xl font-bold text-slate-900">
                Admin Access Required
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                You are currently signed in as a Resident. Sign out and log in with a Tower 3 Admin
                account to open the Admin Dashboard.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#132d52]"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out &amp; Switch Account</span>
              </button>
            </div>
          );
        }
        return (
          <AdminDashboard
            store={store}
            auth={auth}
            onNavigate={handleSelectModule}
            onLogout={handleLogout}
          />
        );
      case 'about':
        return <AboutTower3 store={store} onInspectUnit={handleInspectUnitFromAbout} />;
      case 'backup':
        return <BackupRestore store={store} />;
    }
  };

  return (
    <AppShell
      activeModule={activeModule}
      onSelectModule={handleSelectModule}
      currentUser={auth.session}
      onLogout={handleLogout}
      activeEmergenciesCount={activeEmergenciesCount}
      openMaintenanceCount={openMaintenanceCount}
      storageError={store.storageError}
    >
      {renderModule()}
    </AppShell>
  );
}
