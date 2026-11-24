import React, { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { ActivityCategory } from '../types';

const CATEGORY_OPTIONS: Array<{ value: 'all' | ActivityCategory; label: string }> = [
  { value: 'all', label: 'All Activity' },
  { value: 'resident', label: 'Residents' },
  { value: 'billing', label: 'Billing' },
  { value: 'expense', label: 'Expenses' },
  { value: 'notice', label: 'Notices' },
  { value: 'emergency', label: 'Emergencies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'discussion', label: 'Discussions' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'backup', label: 'Backup' },
];

interface ActivityHistoryProps {
  store: TowerStore;
}

export function ActivityHistory({ store }: ActivityHistoryProps) {
  const { state } = store;
  const [category, setCategory] = useState<'all' | ActivityCategory>('all');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.activityLogs.filter((log) => {
      if (category !== 'all' && log.category !== category) return false;
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        (log.unitNumber?.includes(q) ?? false)
      );
    });
  }, [state.activityLogs, category, search]);

  return (
    <div>
      <PageHeader
        title="Resident Activity History"
        description="Chronological audit trail of resident transfers, monthly bill collections, expense approvals, notices, maintenance status changes, and backups."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="act-cat" className="text-xs font-semibold text-slate-600">
            Category:
          </label>
          <select
            id="act-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as 'all' | ActivityCategory)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Showing {filteredLogs.length} of {state.activityLogs.length} entries
          </span>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by unit, action, or person..."
            aria-label="Search activity history"
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="No matching activity entries"
          description="Try clearing your search term or selecting All Activity."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action &amp; Details</th>
                  <th className="px-4 py-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 align-top font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold capitalize ${
                          log.category === 'emergency'
                            ? 'text-red-600'
                            : log.category === 'billing' || log.category === 'expense'
                            ? 'text-sky-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {log.category}
                      </span>
                      {log.unitNumber && (
                        <div className="font-mono text-[11px] text-slate-500">
                          Unit {log.unitNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-900">{log.action}</div>
                      <div className="mt-0.5 text-xs text-slate-600">{log.details}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600 whitespace-nowrap">
                      {log.actor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
