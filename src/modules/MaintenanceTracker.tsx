import React, { useMemo, useState } from 'react';
import { Camera, ImageIcon, Plus, Trash2, Wrench } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { MaintenancePriority, MaintenanceRequest, MaintenanceStatus } from '../types';
import { ALL_UNIT_NUMBERS } from '../utils/residents';

const CATEGORIES: MaintenanceRequest['category'][] = [
  'Plumbing',
  'Lift',
  'Common Lighting',
  'Sanitation',
  'Security',
  'Civil / Seepage',
  'Other',
];

/** Compresses uploaded photos client-side to keep localStorage fast and compact. */
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxDim = 720;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface MaintenanceTrackerProps {
  store: TowerStore;
}

export function MaintenanceTracker({ store }: MaintenanceTrackerProps) {
  const {
    state,
    localRole,
    addMaintenanceRequest,
    updateMaintenanceStatus,
    deleteMaintenanceRequest,
  } = store;
  const isAdmin = localRole === 'admin';

  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | MaintenancePriority>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [unitNumber, setUnitNumber] = useState('049');
  const [reportedBy, setReportedBy] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MaintenanceRequest['category']>('Plumbing');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoName, setPhotoName] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const [updatingItem, setUpdatingItem] = useState<MaintenanceRequest | null>(null);
  const [nextStatus, setNextStatus] = useState<MaintenanceStatus>('in_progress');
  const [assignedTo, setAssignedTo] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return state.maintenanceRequests
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => (priorityFilter === 'all' ? true : r.priority === priorityFilter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.maintenanceRequests, statusFilter, priorityFilter]);

  const getResidentName = (unitNum: string) =>
    state.units.find((u) => u.unitNumber === unitNum)?.resident?.fullName || '';

  const openCreateModal = () => {
    setUnitNumber('049');
    setReportedBy(getResidentName('049'));
    setTitle('');
    setCategory('Plumbing');
    setPriority('medium');
    setDescription('');
    setPhotoDataUrl(undefined);
    setPhotoName(undefined);
    setFormError(null);
    setCreateOpen(true);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setFormError('Photograph must be smaller than 6 MB.');
      return;
    }
    try {
      const compressed = await compressImageToDataUrl(file);
      setPhotoDataUrl(compressed);
      setPhotoName(file.name);
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 4) {
      setFormError('Please enter a short issue title (at least 4 characters).');
      return;
    }
    if (!reportedBy.trim()) {
      setFormError('Please enter the resident name reporting this issue.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please describe the maintenance complaint (at least 10 characters).');
      return;
    }

    addMaintenanceRequest({
      unitNumber,
      reportedBy,
      title,
      category,
      description,
      priority,
      photoDataUrl,
      photoName,
    });
    setCreateOpen(false);
  };

  const openStatusModal = (item: MaintenanceRequest) => {
    setUpdatingItem(item);
    setNextStatus(item.status);
    setAssignedTo(item.assignedTo || '');
    setResolutionNote(item.resolutionNote || '');
  };

  const handleConfirmStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingItem) return;
    updateMaintenanceStatus(updatingItem.id, nextStatus, assignedTo.trim(), resolutionNote.trim());
    setUpdatingItem(null);
  };

  const statusLabel = (s: MaintenanceStatus) =>
    s === 'open'
      ? 'Open'
      : s === 'in_progress'
      ? 'In Progress'
      : s === 'resolved'
      ? 'Resolved'
      : 'Closed';

  return (
    <div>
      <PageHeader
        title="Maintenance Request Tracker"
        description="Log building or common-area complaints with descriptions, photographs, priority levels, and live resolution status."
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Submit Request</span>
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'all' ? `All (${state.maintenanceRequests.length})` : statusLabel(st)}
            </button>
          ))}
        </div>

        <select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | MaintenancePriority)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-5 w-5" />}
          title="No maintenance requests recorded yet"
          description="No complaints are pre-filled. Use the + Submit Request button whenever a corridor lighting, plumbing, lift, or civil issue needs tracking."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Request</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-[#0B1F3A] tabular-nums">
                      Unit {req.unitNumber}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-600">{req.category}</span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={`font-semibold uppercase tracking-wide ${
                        req.priority === 'urgent' || req.priority === 'high'
                          ? 'text-red-600'
                          : req.priority === 'medium'
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {req.priority} Priority
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={`font-semibold ${
                        req.status === 'resolved' || req.status === 'closed'
                          ? 'text-emerald-700'
                          : req.status === 'in_progress'
                          ? 'text-sky-700'
                          : 'text-red-600'
                      }`}
                    >
                      {statusLabel(req.status)}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-bold text-slate-900">{req.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{req.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Reported by: {req.reportedBy}</span>
                    <span className="font-mono tabular-nums">Logged: {req.createdAt.slice(0, 10)}</span>
                    {req.assignedTo && <span>Assigned: {req.assignedTo}</span>}
                  </div>

                  {req.resolutionNote && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Status Update:</span>{' '}
                      {req.resolutionNote}
                    </div>
                  )}
                </div>

                {/* Right Thumbnail & Actions */}
                <div className="flex shrink-0 flex-row items-center gap-3 md:flex-col md:items-end">
                  {req.photoDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhoto({ url: req.photoDataUrl!, title: req.title })
                      }
                      aria-label={`View attached photograph for ${req.title}`}
                      className="group relative h-20 w-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={req.photoDataUrl}
                        alt={`Maintenance issue photo: ${req.title}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openStatusModal(req)}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 whitespace-nowrap"
                    >
                      Update Status
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(req)}
                        aria-label={`Delete request ${req.title}`}
                        className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Maintenance Request Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Submit Maintenance Complaint"
        subtitle="Attach a photograph if helpful; images are automatically compressed for local browser storage."
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mnt-unit" className="block text-xs font-semibold text-slate-700">
                Unit Number
              </label>
              <select
                id="mnt-unit"
                value={unitNumber}
                onChange={(e) => {
                  setUnitNumber(e.target.value);
                  setReportedBy(getResidentName(e.target.value));
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {ALL_UNIT_NUMBERS.map((u) => (
                  <option key={u} value={u}>
                    Unit {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mnt-reporter" className="block text-xs font-semibold text-slate-700">
                Reported By *
              </label>
              <input
                id="mnt-reporter"
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mnt-title" className="block text-xs font-semibold text-slate-700">
              Issue Title *
            </label>
            <input
              id="mnt-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Floor 3 Staircase Landing Switch Faulty"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mnt-cat" className="block text-xs font-semibold text-slate-700">
                Category
              </label>
              <select
                id="mnt-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as MaintenanceRequest['category'])}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mnt-priority" className="block text-xs font-semibold text-slate-700">
                Priority Level
              </label>
              <select
                id="mnt-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="mnt-desc" className="block text-xs font-semibold text-slate-700">
              Detailed Description *
            </label>
            <textarea
              id="mnt-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe exact floor/shaft location and severity..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="mnt-photo" className="block text-xs font-semibold text-slate-700">
              Attach Photograph (Optional)
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <label
                htmlFor="mnt-photo"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Camera className="h-4 w-4 text-sky-600" />
                <span>{photoName ? 'Replace Photo' : 'Choose Image'}</span>
              </label>
              <input
                id="mnt-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="sr-only"
              />
              {photoName && (
                <span className="flex items-center gap-1 text-xs text-slate-600 truncate">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                  {photoName}
                </span>
              )}
            </div>
            {photoDataUrl && (
              <div className="mt-2.5 flex items-center gap-3">
                <img
                  src={photoDataUrl}
                  alt="Selected complaint preview"
                  className="h-20 w-28 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDataUrl(undefined);
                    setPhotoName(undefined);
                  }}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Submit Complaint
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        open={Boolean(updatingItem)}
        onClose={() => setUpdatingItem(null)}
        title="Update Maintenance Status"
        subtitle={updatingItem ? `Unit ${updatingItem.unitNumber} · ${updatingItem.title}` : ''}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmStatusUpdate} className="space-y-4">
          <div>
            <label htmlFor="mnt-next-status" className="block text-xs font-semibold text-slate-700">
              Status
            </label>
            <select
              id="mnt-next-status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as MaintenanceStatus)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label htmlFor="mnt-assigned" className="block text-xs font-semibold text-slate-700">
              Assigned Technician / Wing
            </label>
            <input
              id="mnt-assigned"
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g., OIL Township Civil Wing"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="mnt-remark" className="block text-xs font-semibold text-slate-700">
              Resolution / Progress Remark
            </label>
            <textarea
              id="mnt-remark"
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Record technician visit details or fix summary..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setUpdatingItem(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Save Update
            </button>
          </div>
        </form>
      </Modal>

      {/* Photo Lightbox */}
      <Modal
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        title={previewPhoto?.title || 'Attached Photograph'}
        maxWidthClass="max-w-2xl"
      >
        {previewPhoto && (
          <img
            src={previewPhoto.url}
            alt={previewPhoto.title}
            className="max-h-[70vh] w-full rounded-lg object-contain bg-slate-100"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMaintenanceRequest(deleteTarget.id);
        }}
        title="Delete Maintenance Request"
        description={deleteTarget ? `Remove complaint "${deleteTarget.title}" permanently?` : ''}
        confirmLabel="Delete Request"
      />
    </div>
  );
}
