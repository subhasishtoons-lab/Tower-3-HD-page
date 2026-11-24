import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ClipboardList,
  DatabaseBackup,
  FileSpreadsheet,
  History,
  Home,
  Info,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PhoneCall,
  ReceiptIndianRupee,
  ShieldCheck,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { TOWER_3_LOGO_URL } from '../../data/seedData';
import type { AuthSession, ModuleId } from '../../types';

export interface NavItemConfig {
  id: ModuleId;
  label: string;
  group: 'Overview' | 'Residents & Finance' | 'Community' | 'Operations' | 'Administration';
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home Dashboard', group: 'Overview', icon: Home },
  { id: 'residents', label: 'Resident Management', group: 'Residents & Finance', icon: Users },
  { id: 'bills', label: 'Monthly Bills', group: 'Residents & Finance', icon: ReceiptIndianRupee },
  { id: 'expenses', label: 'Expenses', group: 'Residents & Finance', icon: FileSpreadsheet },
  { id: 'notices', label: 'Digital Notice Board', group: 'Community', icon: Megaphone },
  { id: 'emergencies', label: 'Emergency Alerts', group: 'Community', icon: AlertTriangle },
  { id: 'discussions', label: 'Discussion Forum', group: 'Community', icon: MessageSquare },
  { id: 'meetings', label: 'Meetings', group: 'Community', icon: CalendarDays },
  { id: 'maintenance', label: 'Maintenance Tracker', group: 'Operations', icon: Wrench },
  { id: 'contacts', label: 'Emergency Contacts', group: 'Operations', icon: PhoneCall },
  { id: 'activity', label: 'Activity History', group: 'Operations', icon: History },
  { id: 'admin', label: 'Admin Dashboard', group: 'Administration', icon: ShieldCheck },
  { id: 'about', label: 'About Tower 3', group: 'Administration', icon: Building2 },
  { id: 'backup', label: 'Backup & Restore', group: 'Administration', icon: DatabaseBackup },
];

const NAV_GROUPS: NavItemConfig['group'][] = [
  'Overview',
  'Residents & Finance',
  'Community',
  'Operations',
  'Administration',
];

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  currentUser: AuthSession;
  onLogout: () => void;
  activeEmergenciesCount: number;
  openMaintenanceCount: number;
  storageError: string | null;
  children: React.ReactNode;
}

export function AppShell({
  activeModule,
  onSelectModule,
  currentUser,
  onLogout,
  activeEmergenciesCount,
  openMaintenanceCount,
  storageError,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.id !== 'admin' || currentUser.role === 'admin'
  );

  const currentItem = NAV_ITEMS.find((item) => item.id === activeModule) ?? NAV_ITEMS[0];

  const handleNavigate = (id: ModuleId) => {
    onSelectModule(id);
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-[#0B1F3A] text-slate-100">
      {/* Tower 3 HD Brand Lockup */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => handleNavigate('home')}
          className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <img
            src={TOWER_3_LOGO_URL}
            alt="TOWER 3 HD official logo"
            className="h-10 w-10 shrink-0 rounded-lg border border-white/15 bg-[#061326] object-cover"
          />
          <div className="min-w-0">
            <div className="font-display text-sm font-bold tracking-tight text-white whitespace-nowrap">
              TOWER 3 HD
            </div>
            <div className="text-[11px] text-sky-200/80 truncate">
              OIL Housing · Duliajan
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav aria-label="Main modules" className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {NAV_GROUPS.map((groupName) => {
          const items = visibleNavItems.filter((item) => item.group === groupName);
          if (items.length === 0) return null;
          return (
            <div key={groupName}>
              <div className="mb-1 px-2.5 text-[11px] font-medium tracking-wide text-slate-400">
                {groupName}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  const count =
                    item.id === 'emergencies' && activeEmergenciesCount > 0
                      ? activeEmergenciesCount
                      : item.id === 'maintenance' && openMaintenanceCount > 0
                      ? openMaintenanceCount
                      : null;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleNavigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-300 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive
                                ? 'text-white'
                                : item.id === 'emergencies' && activeEmergenciesCount > 0
                                ? 'text-red-400'
                                : 'text-sky-300/80'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {count !== null && (
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              item.id === 'emergencies'
                                ? isActive
                                  ? 'text-white'
                                  : 'text-red-400'
                                : isActive
                                ? 'text-sky-100'
                                : 'text-sky-300'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Honest Local Prototype Footer */}
      <div className="border-t border-white/10 px-4 py-3.5 text-xs text-slate-300/90">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
          <p className="leading-snug text-[11px] text-slate-300">
            Local Browser Prototype · Stored in localStorage on this device only. No cloud sync or multi-user authentication.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:border-r lg:border-slate-800">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-1 flex-col shadow-2xl">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Clean 3-Zone Top Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 sm:gap-4 border-b border-slate-200 bg-white px-3 sm:px-6 lg:px-8">
          {/* Zone 1: Menu Trigger (Mobile) + Breadcrumb */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden font-display font-bold text-[#0B1F3A] whitespace-nowrap sm:inline">
                TOWER 3 HD
              </span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-slate-800">{currentItem.label}</span>
            </div>
          </div>

          {/* Zone 2: Quiet Local Prototype Context */}
          <div className="hidden items-center gap-2 text-xs text-slate-500 xl:flex whitespace-nowrap">
            <span>New Horizontal Enclave · Units 049–072</span>
            <span aria-hidden="true">·</span>
            <span>Local Prototype (Browser Storage)</span>
          </div>

          {/* Zone 3: Signed-In User Account & Sign Out */}
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#0B1F3A]" />
              ) : (
                <User className="h-4 w-4 shrink-0 text-sky-600" />
              )}
              <div className="min-w-0 leading-tight">
                <div className="max-w-[110px] truncate text-xs font-semibold text-slate-900 sm:max-w-[160px]">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                  {currentUser.role === 'admin'
                    ? currentUser.isPrimaryAdmin
                      ? currentUser.designation
                        ? `1st Admin · ${currentUser.designation}`
                        : '1st Admin'
                      : currentUser.designation || 'Admin'
                    : `Resident · Unit ${currentUser.unitNumber}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Active Emergency Strip (if active emergencies exist and not currently on Emergencies page) */}
        {activeEmergenciesCount > 0 && activeModule !== 'emergencies' && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-sm text-red-900">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>
                  {activeEmergenciesCount} active emergency{' '}
                  {activeEmergenciesCount === 1 ? 'announcement' : 'announcements'} for Tower 3
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleNavigate('emergencies')}
                className="text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 whitespace-nowrap shrink-0"
              >
                View Emergency Alerts
              </button>
            </div>
          </div>
        )}

        {/* Storage Quota Warning */}
        {storageError && (
          <div className="border-b border-red-200 bg-red-600 px-4 py-2 text-xs font-medium text-white sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <span>{storageError}</span>
              <button
                type="button"
                onClick={() => handleNavigate('backup')}
                className="underline whitespace-nowrap shrink-0"
              >
                Open Backup &amp; Restore
              </button>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Clean Minimal Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              TOWER 3 HD · New Horizontal Enclave, Oil Housing Area, OIL India Ltd., Duliajan, Assam 786602
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleNavigate('about')}
                className="hover:text-slate-900 whitespace-nowrap"
              >
                About Tower 3
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('backup')}
                className="flex items-center gap-1 hover:text-slate-900 whitespace-nowrap"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Backup &amp; Restore</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
