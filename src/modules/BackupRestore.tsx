import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileJson,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import {
  estimateStorageBytes,
  validateBackupJson,
  type BackupValidationResult,
} from '../utils/backup';

interface BackupRestoreProps {
  store: TowerStore;
}

export function BackupRestore({ store }: BackupRestoreProps) {
  const { state, createExportBackup, restoreFromBackup, resetToSeedData } = store;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupValidationResult | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const storageBytes = useMemo(() => estimateStorageBytes(state), [state]);
  const storageKB = (storageBytes / 1024).toFixed(1);

  const handleExportJson = () => {
    const payload = createExportBackup();
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStamp = payload.exportedAt.slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tower3-hd-backup-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg(`Backup exported successfully as tower3-hd-backup-${dateStamp}.json.`);
    setImportError(null);
  };

  const processIncomingJson = (raw: string) => {
    const validation = validateBackupJson(raw);
    if (!validation.valid) {
      setImportError(validation.error || 'Backup file validation failed.');
      setPendingRestore(null);
      return;
    }
    setImportError(null);
    setPendingRestore(validation);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      processIncomingJson(String(reader.result || ''));
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected JSON file.');
    };
    reader.readAsText(file);
    // Reset input so selecting the same file again still triggers onChange
    e.target.value = '';
  };

  const handlePasteRestore = (e: React.FormEvent) => {
    e.preventDefault();
    processIncomingJson(pastedJson);
  };

  const handleConfirmOverwrite = () => {
    if (!pendingRestore?.envelope) return;
    restoreFromBackup(pendingRestore.envelope.data);
    setStatusMsg(
      `Restored TOWER 3 HD backup from ${pendingRestore.summary?.exportedAt.slice(0, 19).replace('T', ' ')}. All local browser data has been updated.`
    );
    setPastedJson('');
    setPendingRestore(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup and Restore"
        description="Export all Tower 3 community records to a portable JSON file or restore from a previous backup. Essential for safeguarding local browser storage."
      />

      {statusMsg && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Backup Status Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Last Backup Date</div>
          <div className="mt-1.5 font-mono text-base font-bold text-[#0B1F3A] tabular-nums">
            {state.lastBackupAt
              ? new Date(state.lastBackupAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Never backed up yet'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Updated automatically on every JSON export
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Local Storage Usage</div>
          <div className="mt-1.5 font-mono text-base font-bold text-slate-900 tabular-nums">
            {storageKB} KB
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Stored in this browser&apos;s localStorage only
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Records in Snapshot</div>
          <div className="mt-1.5 font-mono text-base font-bold text-slate-900 tabular-nums">
            {state.bills.length} Bills · {state.expenses.length} Expenses
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            24 Units · {state.notices.length} Notices · {state.maintenanceRequests.length} Tickets
          </div>
        </div>
      </div>

      {/* Export & Import Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Export JSON */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FileJson className="h-5 w-5 text-sky-600" />
              <h2>Export Community Backup (JSON)</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Downloads a complete, human-readable JSON file containing all 24 units, resident
              transfer archives, monthly maintenance bills, expenses, notices, emergencies,
              discussions, maintenance complaints, meetings, contacts, and activity logs.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Recommended: Export after updating records and keep a copy with a Tower 3 Admin for
              safekeeping.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#132d52]"
            >
              <Download className="h-4 w-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>
        </section>

        {/* Import JSON */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <DatabaseBackup className="h-5 w-5 text-sky-600" />
            <h2>Restore from JSON Backup</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Upload a previously exported <code className="font-mono text-xs">tower3-hd-backup-*.json</code>{' '}
            file or paste JSON below. Every file is validated before asking for overwrite
            confirmation.
          </p>

          {importError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {importError}
            </div>
          )}

          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              aria-label="Select TOWER 3 HD backup JSON file"
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 hover:bg-sky-100"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Backup JSON File</span>
            </button>
          </div>

          <form onSubmit={handlePasteRestore} className="mt-4 space-y-2.5 border-t border-slate-200 pt-4">
            <label htmlFor="paste-json" className="block text-xs font-semibold text-slate-700">
              Or Paste Backup JSON Directly
            </label>
            <textarea
              id="paste-json"
              rows={4}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='{"app": "TOWER 3 HD", "schemaVersion": 1, ...}'
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-800"
            />
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              Validate &amp; Restore Pasted JSON
            </button>
          </form>
        </section>
      </div>

      {/* Reset Local Data */}
      <section className="rounded-xl border border-red-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Reset Local Prototype Data</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Clear local entries and restore the clean Tower 3 starting state in this browser. Does
              not affect previously downloaded JSON backup files.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Default Data</span>
          </button>
        </div>
      </section>

      {/* Overwrite Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingRestore?.valid)}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleConfirmOverwrite}
        title="Confirm Backup Overwrite"
        description="Restoring this backup will overwrite all current TOWER 3 HD records stored in this browser. Please verify the backup summary before proceeding."
        confirmLabel="Overwrite & Restore Backup"
        tone="danger"
        details={
          pendingRestore?.summary && (
            <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
              <dt className="text-slate-500">Exported At:</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {pendingRestore.summary.exportedAt.slice(0, 19).replace('T', ' ')}
              </dd>
              <dt className="text-slate-500">Named Units:</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {pendingRestore.summary.namedUnits} / 24
              </dd>
              <dt className="text-slate-500">Monthly Bills:</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {pendingRestore.summary.billsCount}
              </dd>
              <dt className="text-slate-500">Expenses:</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {pendingRestore.summary.expensesCount}
              </dd>
              <dt className="text-slate-500">Notices:</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {pendingRestore.summary.noticesCount}
              </dd>
              <dt className="text-slate-500">Maintenance Tickets:</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {pendingRestore.summary.maintenanceCount}
              </dd>
            </dl>
          )
        }
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetToSeedData();
          setStatusMsg('Local browser data reset to the clean TOWER 3 HD starting state.');
        }}
        title="Reset Local Portal Data?"
        description="All local edits, notices, bills, expenses, and resident entries in this browser will be cleared back to the clean starting state."
        confirmLabel="Confirm Reset"
      />
    </div>
  );
}
