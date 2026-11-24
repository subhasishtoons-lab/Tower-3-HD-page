import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  DatabaseBackup,
  Images,
  MapPin,
  Megaphone,
  MessageSquare,
  Plus,
  ReceiptIndianRupee,
  Users,
  Wrench,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import {
  DEFAULT_GALLERY_PHOTOS,
  NEARBY_DISTANCES,
  TOWER_3_LOGO_URL,
} from '../data/seedData';
import type { GalleryPhoto, ModuleId } from '../types';
import type { TowerStore } from '../store/useTowerStore';
import {
  formatINR,
  formatMonthLabel,
  summarizeMonthFinances,
} from '../utils/finance';

interface HomeDashboardProps {
  store: TowerStore;
  onNavigate: (id: ModuleId) => void;
}

export function HomeDashboard({ store, onNavigate }: HomeDashboardProps) {
  const { state } = store;
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);

  const namedCount = state.units.filter((u) => u.resident !== null).length;
  const galleryPhotos = state.galleryPhotos?.length
    ? state.galleryPhotos
    : DEFAULT_GALLERY_PHOTOS;
  const featuredPhoto = galleryPhotos[0];

  const availableMonths = Array.from(new Set(state.bills.map((b) => b.month))).sort().reverse();
  const activeMonth = availableMonths[0] || null;
  const financeSummary = activeMonth
    ? summarizeMonthFinances(state.bills, state.expenses, activeMonth)
    : null;

  const activeEmergencies = state.emergencies.filter((e) => e.status === 'active');
  const openMaintenance = state.maintenanceRequests.filter(
    (m) => m.status === 'open' || m.status === 'in_progress'
  );
  const pinnedOrRecentNotices = [...state.notices]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const nextMeeting = state.meetings
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-[#0B1F3A] text-white">
        <div className="grid items-stretch lg:grid-cols-12">
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="flex items-center gap-3.5">
                <img
                  src={TOWER_3_LOGO_URL}
                  alt="TOWER 3 HD emblem"
                  className="h-14 w-14 shrink-0 rounded-xl border border-white/15 bg-[#061326] object-cover"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium tracking-wide text-sky-300">
                    Oil India Limited Housing Colony · Duliajan, Assam 786602
                  </div>
                  <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-white text-balance sm:text-3xl">
                    TOWER 3 HD Community Portal
                  </h1>
                </div>
              </div>
              <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-slate-300">
                Company-allotted OIL India Limited residential quarters at New Horizontal Enclave
                (6 Floors · 24 Units: 049–072). This is not a private housing society — residents
                are transferable OIL employees and no fixed monthly charges apply.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('bills')}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400 whitespace-nowrap shrink-0"
              >
                <ReceiptIndianRupee className="h-4 w-4" />
                <span>
                  {activeMonth
                    ? `View ${formatMonthLabel(activeMonth)} Bills`
                    : 'Monthly Bills'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('notices')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                <Megaphone className="h-4 w-4" />
                <span>Notice Board</span>
              </button>
            </div>
          </div>

          <div className="relative hidden min-h-[220px] bg-slate-900 lg:col-span-5 lg:block">
            <img
              src={featuredPhoto.imageUrl}
              alt={featuredPhoto.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/85 via-[#0B1F3A]/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-xs text-slate-200">
              <div className="font-semibold text-white">{featuredPhoto.title}</div>
              <div className="text-slate-300">Tower 3 · New Horizontal Enclave · Units 049–072</div>
            </div>
          </div>
        </div>
      </section>

      {/* Honest Local Prototype Notice */}
      <section
        aria-label="Local prototype notice"
        className="rounded-xl border border-sky-200 bg-sky-50/70 px-5 py-3.5 text-sm text-slate-800"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-relaxed">
            <span className="font-semibold text-[#0B1F3A]">Local Development Prototype:</span> All
            records and Resident/Admin accounts are stored locally in this browser&apos;s{' '}
            <code className="font-mono text-xs text-sky-900">localStorage</code>. Data does not
            synchronize across different residents&apos; devices and is not backed by a cloud
            authentication server.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('backup')}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap shrink-0 sm:mt-0"
          >
            <DatabaseBackup className="h-3.5 w-3.5" />
            <span>Export JSON Backup</span>
          </button>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section aria-label="Tower 3 key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('residents')}
          className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-sky-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tower 3 Units</span>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            24 Units
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {namedCount} named · Units 049–072
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('bills')}
          className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-sky-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{activeMonth ? `${formatMonthLabel(activeMonth)} Bills` : 'Monthly Bills'}</span>
            <ReceiptIndianRupee className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {financeSummary ? `${financeSummary.paidCount}/24 Paid` : 'None Created'}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {financeSummary
              ? `${formatINR(financeSummary.totalCollected)} collected · Variable amount`
              : 'No fixed fee · Admin creates when needed'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('notices')}
          className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-sky-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Notices &amp; Alerts</span>
            <Megaphone className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {state.notices.length} {state.notices.length === 1 ? 'Notice' : 'Notices'}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {activeEmergencies.length > 0 ? (
              <span className="font-medium text-red-600">
                {activeEmergencies.length} active emergency alert
              </span>
            ) : (
              'No active emergency alerts'
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('maintenance')}
          className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-sky-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Maintenance Tracker</span>
            <Wrench className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {openMaintenance.length} Open
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {state.maintenanceRequests.length} total recorded requests
          </div>
        </button>
      </section>

      {/* Main 2-Column Operational Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Nearby Distances, Emergency Alerts, Recent Notices */}
        <section className="space-y-6 lg:col-span-7">
          {activeEmergencies.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Active Emergency Announcements</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('emergencies')}
                  className="text-xs font-semibold text-red-700 hover:text-red-900 whitespace-nowrap"
                >
                  Manage Alerts →
                </button>
              </div>
              <div className="mt-3 divide-y divide-red-200/80">
                {activeEmergencies.map((emg) => (
                  <div key={emg.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-red-700">
                      <span className="font-semibold uppercase tracking-wide">{emg.severity}</span>
                      <span aria-hidden="true">·</span>
                      <span>{emg.affectedUnits}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{emg.createdAt.slice(0, 10)}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{emg.title}</h3>
                    <p className="mt-1 text-sm text-slate-700">{emg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby OIL Duliajan Landmarks & Distance Column */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <MapPin className="h-4 w-4 text-sky-600" />
                <span>Nearby Landmarks &amp; Distance</span>
              </h2>
              <span className="text-xs font-medium text-slate-500">From Tower 3</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-2.5">Location</th>
                    <th className="px-5 py-2.5 text-right">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {NEARBY_DISTANCES.map((item) => (
                    <tr key={item.place} className="hover:bg-slate-50/70">
                      <td className="px-5 py-2.5 font-medium text-slate-900">{item.place}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-[#0B1F3A] tabular-nums">
                        {item.distance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Recent Notices</h2>
              <button
                type="button"
                onClick={() => onNavigate('notices')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap"
              >
                <span>Open Notice Board</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {pinnedOrRecentNotices.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-slate-600">No notices posted yet.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('notices')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Notice</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {pinnedOrRecentNotices.map((notice) => (
                  <div key={notice.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          notice.priority === 'emergency'
                            ? 'text-red-600'
                            : notice.priority === 'important'
                            ? 'text-sky-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {notice.priority === 'emergency'
                          ? 'Emergency'
                          : notice.priority === 'important'
                          ? 'Important'
                          : 'Normal'}
                      </span>
                      {notice.pinned && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-medium text-slate-700">Pinned</span>
                        </>
                      )}
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-500 tabular-nums">
                        {notice.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{notice.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{notice.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: Next Meeting, Quick Actions, Photo Gallery & Recent Activity */}
        <section className="space-y-6 lg:col-span-5">
          {/* Next Community Meeting */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Next Residents Meeting</h2>
              <button
                type="button"
                onClick={() => onNavigate('meetings')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap"
              >
                All Meetings →
              </button>
            </div>
            {nextMeeting ? (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs text-sky-700 font-medium">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">
                    {nextMeeting.date} at {nextMeeting.time}
                  </span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-slate-900">
                  {nextMeeting.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600">{nextMeeting.venue}</p>
                <div className="mt-3 text-xs text-slate-500">
                  {nextMeeting.agenda.length} agenda items scheduled · Convenor:{' '}
                  {nextMeeting.convenor}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No upcoming meetings scheduled right now.
              </p>
            )}
          </div>

          {/* Quick Module Links */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('maintenance')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50/50 hover:text-slate-900"
              >
                <Wrench className="h-4 w-4 shrink-0 text-sky-600" />
                <span>Log Complaint</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('discussions')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50/50 hover:text-slate-900"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-sky-600" />
                <span>Discussion Forum</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contacts')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50/50 hover:text-slate-900"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>Emergency Numbers</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50/50 hover:text-slate-900"
              >
                <Users className="h-4 w-4 shrink-0 text-sky-600" />
                <span>Floor Plan (049–072)</span>
              </button>
            </div>
          </div>

          {/* Tower 3 Photo Gallery Preview */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Images className="h-4 w-4 text-sky-600" />
                <span>Tower 3 Photo Gallery</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap"
              >
                View All ({galleryPhotos.length}) →
              </button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {galleryPhotos.slice(0, 4).map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxPhoto(photo)}
                  className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-900 text-left transition-colors hover:border-sky-400"
                >
                  <div className="aspect-[16/10] w-full overflow-hidden">
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="bg-white px-3 py-2.5">
                    <div className="truncate text-xs font-semibold text-slate-900">
                      {photo.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      {photo.date}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Community Activity */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
              <button
                type="button"
                onClick={() => onNavigate('activity')}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap"
              >
                Full Log →
              </button>
            </div>
            {state.activityLogs.length === 0 ? (
              <div className="px-5 py-5 text-xs text-slate-500">
                No recent activity recorded yet. New bills, notices, expenses, and resident updates
                will appear here automatically.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {state.activityLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{log.action}</span>
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {log.timestamp.slice(0, 10)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Lightbox Modal for Gallery Photo */}
      <Modal
        open={Boolean(lightboxPhoto)}
        onClose={() => setLightboxPhoto(null)}
        title={lightboxPhoto?.title || 'Tower 3 Photo'}
        subtitle={
          lightboxPhoto ? `${lightboxPhoto.date} · Uploaded by ${lightboxPhoto.uploadedBy}` : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {lightboxPhoto && (
          <div className="space-y-3">
            <img
              src={lightboxPhoto.imageUrl}
              alt={lightboxPhoto.title}
              className="max-h-[68vh] w-full rounded-lg bg-slate-950 object-contain"
            />
            {lightboxPhoto.caption && (
              <p className="text-sm leading-relaxed text-slate-700">{lightboxPhoto.caption}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
