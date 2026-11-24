import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  History,
  Pencil,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { UnitInfo } from '../types';
import { formatINR, formatMonthLabel } from '../utils/finance';
import {
  ALL_UNIT_NUMBERS,
  TOWER_FLOORS,
  validateResidentInput,
  type ResidentInput,
} from '../utils/residents';

type FormMode = 'add' | 'edit' | 'replace';

const EMPTY_FORM: ResidentInput = {
  unitNumber: '049',
  fullName: '',
  oilEmployeeId: '',
  department: '',
  phone: '',
  familyMembers: 1,
  vehicleNumbers: '',
  moveInDate: new Date().toISOString().slice(0, 10),
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
};

interface ResidentManagementProps {
  store: TowerStore;
  initialSelectedUnit?: string | null;
}

export function ResidentManagement({ store, initialSelectedUnit }: ResidentManagementProps) {
  const { state, localRole, addResident, editResident, replaceResident, removeResident } = store;

  const [search, setSearch] = useState(initialSelectedUnit || '');
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [formData, setFormData] = useState<ResidentInput>(EMPTY_FORM);
  const [transferReason, setTransferReason] = useState('');
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<UnitInfo | null>(null);
  const [deleteReason, setDeleteReason] = useState('Resident transferred / Name removed');
  const [deleteDate, setDeleteDate] = useState(new Date().toISOString().slice(0, 10));

  const [historyUnit, setHistoryUnit] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isAdmin = localRole === 'admin';

  const unnamedUnits = useMemo(
    () => state.units.filter((u) => u.resident === null).map((u) => u.unitNumber),
    [state.units]
  );

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.units.filter((u) => {
      if (floorFilter !== 'all' && u.floor !== floorFilter) return false;
      if (!q) return true;
      return (
        u.unitNumber.toLowerCase().includes(q) ||
        (u.resident?.fullName.toLowerCase().includes(q) ?? false) ||
        (u.resident?.oilEmployeeId.toLowerCase().includes(q) ?? false) ||
        (u.resident?.department.toLowerCase().includes(q) ?? false) ||
        (u.resident?.phone.toLowerCase().includes(q) ?? false)
      );
    });
  }, [state.units, floorFilter, search]);

  const openAddModal = (unitNumber?: string) => {
    const defaultUnit = unitNumber || unnamedUnits[0] || ALL_UNIT_NUMBERS[0];
    setFormMode('add');
    setFormData({
      ...EMPTY_FORM,
      unitNumber: defaultUnit,
      moveInDate: new Date().toISOString().slice(0, 10),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (unit: UnitInfo) => {
    if (!unit.resident) return;
    setFormMode('edit');
    setFormData({
      unitNumber: unit.unitNumber,
      fullName: unit.resident.fullName,
      oilEmployeeId: unit.resident.oilEmployeeId,
      department: unit.resident.department,
      phone: unit.resident.phone,
      familyMembers: unit.resident.familyMembers,
      vehicleNumbers: unit.resident.vehicleNumbers,
      moveInDate: unit.resident.moveInDate,
      emergencyContactName: unit.resident.emergencyContactName,
      emergencyContactPhone: unit.resident.emergencyContactPhone,
      notes: unit.resident.notes || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openReplaceModal = (unit: UnitInfo) => {
    setFormMode('replace');
    setFormData({
      ...EMPTY_FORM,
      unitNumber: unit.unitNumber,
      moveInDate: new Date().toISOString().slice(0, 10),
    });
    setTransferReason('Resident Transfer / Re-allotment');
    setMoveOutDate(new Date().toISOString().slice(0, 10));
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateResidentInput(formData);
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    if (formMode === 'replace' && !transferReason.trim()) {
      setFormError('Please specify a transfer/replacement reason for the archive.');
      return;
    }

    try {
      if (formMode === 'add') {
        addResident(formData);
        setStatusMessage(`Added ${formData.fullName} to Unit ${formData.unitNumber}.`);
      } else if (formMode === 'edit') {
        editResident(formData);
        setStatusMessage(
          `Updated details for Unit ${formData.unitNumber}. Historical billing records remain intact.`
        );
      } else {
        replaceResident(formData, transferReason, moveOutDate);
        setStatusMessage(
          `Replaced resident for Unit ${formData.unitNumber} with ${formData.fullName}. Previous resident archived and historical billing preserved.`
        );
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save resident record.');
    }
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    removeResident(
      deleteTarget.unitNumber,
      deleteReason.trim() || 'Resident name removed',
      deleteDate
    );
    setStatusMessage(
      `Deleted resident name from Unit ${deleteTarget.unitNumber}. Past billing records and transfer history remain preserved.`
    );
    setDeleteTarget(null);
  };

  const inspectedUnit = historyUnit
    ? state.units.find((u) => u.unitNumber === historyUnit) ?? null
    : null;
  const inspectedTransfers = historyUnit
    ? state.residentHistory.filter((h) => h.unitNumber === historyUnit)
    : [];
  const inspectedBills = historyUnit
    ? state.bills
        .filter((b) => b.unitNumber === historyUnit)
        .sort((a, b) => b.month.localeCompare(a.month))
    : [];

  const namedCount = state.units.filter((u) => u.resident !== null).length;

  return (
    <div>
      <PageHeader
        title="Resident Management"
        description="Manage resident names and details across all 24 Tower 3 units (049–072, Floors 1–6). Admins can add, edit, replace, or delete names while preserving all historical billing records."
        action={
          isAdmin && unnamedUnits.length > 0 ? (
            <button
              type="button"
              onClick={() => openAddModal(unnamedUnits[0])}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Resident Name</span>
            </button>
          ) : null
        }
      />

      {!isAdmin && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          You are currently in <span className="font-semibold">Resident View</span>. Switch to{' '}
          <span className="font-semibold">Admin Mode</span> in the top bar to add, edit, replace,
          or delete resident names.
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit (049–072), resident name, OIL ID, department..."
            aria-label="Search residents and units"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {namedCount} / 24 units named
          </span>
          <select
            aria-label="Filter by floor"
            value={floorFilter}
            onChange={(e) =>
              setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-600 focus:outline-none"
          >
            <option value="all">All 6 Floors</option>
            {TOWER_FLOORS.map((f) => (
              <option key={f.floor} value={f.floor}>
                Floor {f.floor} ({f.units[0]}–{f.units[3]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Units & Residents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">Unit / Floor</th>
                <th className="px-4 py-3">Resident Name</th>
                <th className="px-4 py-3">Department / ID</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUnits.map((unit) => (
                <tr key={unit.unitNumber} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 align-top whitespace-nowrap">
                    <div className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                      Unit {unit.unitNumber}
                    </div>
                    <div className="text-xs text-slate-500">Floor {unit.floor}</div>
                  </td>

                  <td className="px-4 py-3.5 align-top">
                    {unit.resident ? (
                      <div>
                        <div className="font-semibold text-slate-900">{unit.resident.fullName}</div>
                        {unit.resident.moveInDate && (
                          <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                            Since {unit.resident.moveInDate}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 align-top text-slate-700">
                    {unit.resident &&
                    (unit.resident.department ||
                      unit.resident.oilEmployeeId ||
                      unit.resident.vehicleNumbers) ? (
                      <div>
                        <div>{unit.resident.department || '—'}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500">
                          {[unit.resident.oilEmployeeId, unit.resident.vehicleNumbers]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 align-top whitespace-nowrap">
                    {unit.resident?.phone ? (
                      <div className="font-mono text-xs text-slate-700 tabular-nums">
                        {unit.resident.phone}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHistoryUnit(unit.unitNumber)}
                        aria-label={`View history for Unit ${unit.unitNumber}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>History</span>
                      </button>

                      {isAdmin && unit.resident && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(unit)}
                            aria-label={`Edit resident in Unit ${unit.unitNumber}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openReplaceModal(unit)}
                            aria-label={`Replace resident in Unit ${unit.unitNumber}`}
                            className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            <span>Replace</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(unit);
                              setDeleteReason('Resident transferred / Name removed');
                              setDeleteDate(new Date().toISOString().slice(0, 10));
                            }}
                            aria-label={`Delete resident name from Unit ${unit.unitNumber}`}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}

                      {isAdmin && !unit.resident && (
                        <button
                          type="button"
                          onClick={() => openAddModal(unit.unitNumber)}
                          aria-label={`Add resident name to Unit ${unit.unitNumber}`}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Add Name</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Archive Summary */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Archived Resident Transfers ({state.residentHistory.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Replaced or removed resident names are archived here and preserved on their historical
            monthly bills.
          </p>
        </div>
        {state.residentHistory.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No resident transfers recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {state.residentHistory.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Unit {rec.unitNumber} · {rec.fullName}{' '}
                    {rec.oilEmployeeId && (
                      <span className="font-mono text-xs font-normal text-slate-500">
                        ({rec.oilEmployeeId})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {rec.department ? `${rec.department} · ` : ''}Reason: {rec.reason}
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {rec.moveInDate} → {rec.moveOutDate}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add / Edit / Replace Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          formMode === 'add'
            ? `Add Resident Name — Unit ${formData.unitNumber}`
            : formMode === 'edit'
            ? `Edit Resident — Unit ${formData.unitNumber}`
            : `Replace Resident (Transfer) — Unit ${formData.unitNumber}`
        }
        subtitle={
          formMode === 'replace'
            ? 'The previous resident name will be archived in transfer history. All historical bills remain preserved.'
            : 'Only Resident Full Name is required; other details are optional.'
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          {formMode === 'replace' && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3.5 space-y-3">
              <div className="text-xs font-semibold text-[#0B1F3A]">
                Outgoing Resident Handover Details
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="res-moveout-date"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Outgoing Date
                  </label>
                  <input
                    id="res-moveout-date"
                    type="date"
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="res-transfer-reason"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Transfer / Replacement Reason *
                  </label>
                  <input
                    id="res-transfer-reason"
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="e.g., Transferred to OIL Guwahati"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="res-unit" className="block text-xs font-semibold text-slate-700">
                Unit Number *
              </label>
              <select
                id="res-unit"
                value={formData.unitNumber}
                disabled={formMode !== 'add'}
                onChange={(e) => setFormData((prev) => ({ ...prev, unitNumber: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
              >
                {(formMode === 'add' ? unnamedUnits : ALL_UNIT_NUMBERS).map((u) => (
                  <option key={u} value={u}>
                    Unit {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="res-name" className="block text-xs font-semibold text-slate-700">
                {formMode === 'replace' ? 'Incoming Resident Full Name *' : 'Resident Full Name *'}
              </label>
              <input
                id="res-name"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter resident name"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="res-empid" className="block text-xs font-semibold text-slate-700">
                OIL Employee ID (Optional)
              </label>
              <input
                id="res-empid"
                type="text"
                value={formData.oilEmployeeId}
                onChange={(e) => setFormData((prev) => ({ ...prev, oilEmployeeId: e.target.value }))}
                placeholder="e.g., OIL-PRD-4812"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="res-dept" className="block text-xs font-semibold text-slate-700">
                OIL Department (Optional)
              </label>
              <input
                id="res-dept"
                type="text"
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Drilling Services"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="res-phone" className="block text-xs font-semibold text-slate-700">
                Mobile Number (Optional)
              </label>
              <input
                id="res-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 94350 XXXXX"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="res-members" className="block text-xs font-semibold text-slate-700">
                Family Members (Optional)
              </label>
              <input
                id="res-members"
                type="number"
                min={1}
                max={15}
                value={formData.familyMembers}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, familyMembers: Number(e.target.value) || 1 }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="res-movein" className="block text-xs font-semibold text-slate-700">
                Move-In Date (Optional)
              </label>
              <input
                id="res-movein"
                type="date"
                value={formData.moveInDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, moveInDate: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="res-vehicle" className="block text-xs font-semibold text-slate-700">
                Vehicle Registration (Optional)
              </label>
              <input
                id="res-vehicle"
                type="text"
                value={formData.vehicleNumbers}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, vehicleNumbers: e.target.value }))
                }
                placeholder="AS-06-XX-1234"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              {formMode === 'add'
                ? 'Save Resident Name'
                : formMode === 'edit'
                ? 'Save Changes'
                : 'Confirm Resident Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Resident Name Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Delete Resident Name — Unit ${deleteTarget.unitNumber}` : ''}
        subtitle="The resident name will be cleared and archived in transfer history. All historical bills remain preserved."
        maxWidthClass="max-w-md"
      >
        {deleteTarget && deleteTarget.resident && (
          <form onSubmit={handleConfirmDelete} className="space-y-4">
            <p className="text-sm text-slate-700">
              Remove <span className="font-semibold">{deleteTarget.resident.fullName}</span> from
              Unit {deleteTarget.unitNumber} and leave the unit name blank?
            </p>
            <div>
              <label htmlFor="delete-date" className="block text-xs font-semibold text-slate-700">
                Date
              </label>
              <input
                id="delete-date"
                type="date"
                value={deleteDate}
                onChange={(e) => setDeleteDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="delete-reason" className="block text-xs font-semibold text-slate-700">
                Note / Reason (Optional)
              </label>
              <input
                id="delete-reason"
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Name
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Unit Historical Billing & Transfer Ledger Modal */}
      <Modal
        open={Boolean(historyUnit)}
        onClose={() => setHistoryUnit(null)}
        title={inspectedUnit ? `Unit ${inspectedUnit.unitNumber} — Resident & Billing History` : ''}
        subtitle={
          inspectedUnit
            ? `Floor ${inspectedUnit.floor} · Current: ${
                inspectedUnit.resident ? inspectedUnit.resident.fullName : '—'
              }`
            : ''
        }
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Historical Billing Ledger ({inspectedBills.length})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Each bill keeps the exact resident name snapshot from the billing period, unaffected
              by later edits or transfers.
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Resident Snapshot</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inspectedBills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="px-3 py-2 font-mono">{formatMonthLabel(bill.month)}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {bill.residentNameSnapshot || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatINR(bill.totalAmount)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`font-semibold ${
                            bill.status === 'paid' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {bill.status === 'paid' ? `Paid (${bill.paidAt})` : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {inspectedBills.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No bills generated for this unit yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Past Resident Transfers ({inspectedTransfers.length})
            </h3>
            {inspectedTransfers.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No previous transfers archived for Unit {historyUnit}.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                {inspectedTransfers.map((trf) => (
                  <li key={trf.id} className="px-3.5 py-2.5 text-xs">
                    <div className="font-semibold text-slate-900">
                      {trf.fullName} {trf.oilEmployeeId ? `(${trf.oilEmployeeId})` : ''}
                    </div>
                    <div className="mt-0.5 text-slate-600">
                      {trf.moveInDate} to {trf.moveOutDate} · {trf.reason}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
