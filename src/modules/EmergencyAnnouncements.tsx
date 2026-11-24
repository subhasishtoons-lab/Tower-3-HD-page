import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { EmergencyAnnouncement, EmergencySeverity } from '../types';

interface EmergencyAnnouncementsProps {
  store: TowerStore;
}

export function EmergencyAnnouncements({ store }: EmergencyAnnouncementsProps) {
  const { state, localRole, addEmergency, resolveEmergency, deleteEmergency } = store;
  const isAdmin = localRole === 'admin';

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<EmergencySeverity>('high');
  const [affectedUnits, setAffectedUnits] = useState('All 24 Units (049–072)');
  const [actionRequired, setActionRequired] = useState('');
  const [issuedBy, setIssuedBy] = useState('Tower 3 Admin');
  const [alsoPostNotice, setAlsoPostNotice] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resolvingItem, setResolvingItem] = useState<EmergencyAnnouncement | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<EmergencyAnnouncement | null>(null);

  const activeAlerts = state.emergencies.filter((e) => e.status === 'active');
  const resolvedAlerts = state.emergencies.filter((e) => e.status === 'resolved');

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 4) {
      setError('Emergency headline must be at least 4 characters.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please describe the emergency clearly (at least 10 characters).');
      return;
    }
    addEmergency({
      title,
      message,
      severity,
      affectedUnits,
      actionRequired,
      issuedBy,
      alsoPostNotice,
    });
    setTitle('');
    setMessage('');
    setActionRequired('');
    setError(null);
    setModalOpen(false);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;
    resolveEmergency(resolvingItem.id, resolutionNote);
    setResolvingItem(null);
    setResolutionNote('');
  };

  return (
    <div>
      <PageHeader
        title="Emergency Announcements"
        description="Urgent safety, utility, lift, and security alerts for Tower 3 residents. Active emergencies also display at the top of the portal."
        action={
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Emergency Alert</span>
          </button>
        }
      />

      {/* Active Alerts Section */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">
          Active Alerts ({activeAlerts.length})
        </h2>

        {activeAlerts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            title="No active emergency alerts"
            description="No emergency alerts are pre-filled. Use the + Create Emergency Alert button whenever residents need an urgent update."
            action={
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
                <span>Create Emergency Alert</span>
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-red-200 bg-red-50/60 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                      <span className="font-bold uppercase tracking-wide">
                        {alert.severity} · Active
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{alert.affectedUnits}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{alert.createdAt.slice(0, 10)}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">{alert.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{alert.message}</p>
                    {alert.actionRequired && (
                      <div className="mt-3 rounded-lg border border-red-200/80 bg-white/80 px-3.5 py-2.5 text-xs text-slate-800">
                        <span className="font-semibold text-red-800">Action Required:</span>{' '}
                        {alert.actionRequired}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-slate-600">Issued by: {alert.issuedBy}</div>
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingItem(alert);
                          setResolutionNote('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#132d52] whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(alert)}
                        aria-label={`Delete alert ${alert.title}`}
                        className="rounded-lg border border-red-200 bg-white p-2 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved / Archived Alerts */}
      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">
          Resolved Emergency History ({resolvedAlerts.length})
        </h2>
        {resolvedAlerts.length === 0 ? (
          <p className="text-sm text-slate-500">No archived emergency records yet.</p>
        ) : (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {resolvedAlerts.map((alert) => (
              <div key={alert.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700">Resolved</span>
                    <span aria-hidden="true">·</span>
                    <span>{alert.affectedUnits}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Issued {alert.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  {alert.resolvedAt && (
                    <span className="font-mono tabular-nums">
                      Closed {alert.resolvedAt.slice(0, 10)}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-base font-semibold text-slate-900">{alert.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                {alert.resolutionNote && (
                  <p className="mt-2 text-xs text-emerald-800">
                    <span className="font-semibold">Resolution:</span> {alert.resolutionNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Broadcast Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Broadcast Emergency Announcement"
        subtitle="Displayed in red at the top of TOWER 3 HD until marked resolved."
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="emg-title" className="block text-xs font-semibold text-slate-700">
              Emergency Headline *
            </label>
            <input
              id="emg-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Passenger Lift Under Emergency Repair"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="emg-severity" className="block text-xs font-semibold text-slate-700">
                Severity Level
              </label>
              <select
                id="emg-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as EmergencySeverity)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="critical">Critical (Immediate Safety)</option>
                <option value="high">High (Essential Utility / Lift)</option>
                <option value="advisory">Advisory (Precautionary)</option>
              </select>
            </div>
            <div>
              <label htmlFor="emg-units" className="block text-xs font-semibold text-slate-700">
                Affected Units
              </label>
              <input
                id="emg-units"
                type="text"
                value={affectedUnits}
                onChange={(e) => setAffectedUnits(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="emg-msg" className="block text-xs font-semibold text-slate-700">
              Situation Details *
            </label>
            <textarea
              id="emg-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide clear facts, timings, and contact details..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="emg-action" className="block text-xs font-semibold text-slate-700">
              Resident Action Required
            </label>
            <input
              id="emg-action"
              type="text"
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              placeholder="e.g., Use main staircase until OIL Electrical clearance."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="emg-issuer" className="block text-xs font-semibold text-slate-700">
              Issued By
            </label>
            <input
              id="emg-issuer"
              type="text"
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={alsoPostNotice}
              onChange={(e) => setAlsoPostNotice(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600"
            />
            <span>Also pin as an Emergency Notice on the Digital Notice Board</span>
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Broadcast Alert
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        open={Boolean(resolvingItem)}
        onClose={() => setResolvingItem(null)}
        title="Resolve Emergency Announcement"
        subtitle={resolvingItem?.title}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmResolve} className="space-y-4">
          <div>
            <label htmlFor="emg-resolve-note" className="block text-xs font-semibold text-slate-700">
              Resolution Summary
            </label>
            <textarea
              id="emg-resolve-note"
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g., Water supply restored and tank valve opened at 1:10 PM."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setResolvingItem(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132d52]"
            >
              Mark Resolved
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteEmergency(deleteTarget.id);
        }}
        title="Delete Emergency Record"
        description={deleteTarget ? `Remove "${deleteTarget.title}" from the alerts log?` : ''}
        confirmLabel="Delete Alert"
      />
    </div>
  );
}
