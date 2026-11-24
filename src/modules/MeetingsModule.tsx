import React, { useState } from 'react';
import { CalendarDays, FileText, MapPin, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { MeetingRecord, MeetingStatus } from '../types';

interface MeetingsModuleProps {
  store: TowerStore;
}

export function MeetingsModule({ store }: MeetingsModuleProps) {
  const { state, localRole, addMeeting, updateMeeting, deleteMeeting } = store;
  const isAdmin = localRole === 'admin';

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:30');
  const [venue, setVenue] = useState('Tower 3 Ground Floor Lobby, New Horizontal Enclave');
  const [convenor, setConvenor] = useState('Tower 3 Admin');
  const [agendaRaw, setAgendaRaw] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [minutesTarget, setMinutesTarget] = useState<MeetingRecord | null>(null);
  const [minutesStatus, setMinutesStatus] = useState<MeetingStatus>('completed');
  const [minutesText, setMinutesText] = useState('');
  const [decisionsRaw, setDecisionsRaw] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('18');

  const [deleteTarget, setDeleteTarget] = useState<MeetingRecord | null>(null);

  const sortedMeetings = [...state.meetings].sort((a, b) => b.date.localeCompare(a.date));

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 4) {
      setFormError('Meeting title must be at least 4 characters.');
      return;
    }
    const agenda = agendaRaw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (agenda.length === 0) {
      setFormError('Please enter at least one agenda item (one per line).');
      return;
    }

    addMeeting({
      title: title.trim(),
      date,
      time,
      venue: venue.trim() || 'Tower 3 Ground Floor Lobby',
      status: 'upcoming',
      agenda,
      convenor: convenor.trim() || 'Tower 3 Admin',
    });

    setTitle('');
    setAgendaRaw('');
    setFormError(null);
    setCreateOpen(false);
  };

  const openMinutesModal = (meeting: MeetingRecord) => {
    setMinutesTarget(meeting);
    setMinutesStatus(meeting.status === 'upcoming' ? 'completed' : meeting.status);
    setMinutesText(meeting.minutes || '');
    setDecisionsRaw((meeting.decisions || []).join('\n'));
    setAttendeeCount(String(meeting.attendeeUnitsCount ?? 18));
  };

  const handleSaveMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutesTarget) return;
    const decisions = decisionsRaw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedUnits = Math.min(24, Math.max(0, Number(attendeeCount) || 0));

    updateMeeting(minutesTarget.id, {
      status: minutesStatus,
      minutes: minutesText.trim(),
      decisions,
      attendeeUnitsCount: parsedUnits,
    });
    setMinutesTarget(null);
  };

  return (
    <div>
      <PageHeader
        title="Community Meetings"
        description="Schedule Tower 3 residents meetings, publish agendas, and archive official Minutes of Meeting (MoM) and shared expense approvals."
        action={
          isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Meeting</span>
            </button>
          ) : null
        }
      />

      {sortedMeetings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="No meetings scheduled yet"
          description="No meetings are pre-filled. When required, an Admin can schedule a Tower 3 residents meeting using the + button."
          action={
            isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                <Plus className="h-4 w-4" />
                <span>Schedule Meeting</span>
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {sortedMeetings.map((meeting) => (
            <article
              key={meeting.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-semibold uppercase tracking-wide ${
                        meeting.status === 'upcoming'
                          ? 'text-sky-700'
                          : meeting.status === 'completed'
                          ? 'text-emerald-700'
                          : 'text-red-600'
                      }`}
                    >
                      {meeting.status}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {meeting.date} at {meeting.time}
                    </span>
                    {meeting.attendeeUnitsCount !== undefined && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          {meeting.attendeeUnitsCount}/24 units attended
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-lg font-bold text-slate-900">{meeting.title}</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {meeting.venue} · Convenor: {meeting.convenor}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openMinutesModal(meeting)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 whitespace-nowrap"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{meeting.minutes ? 'Edit Minutes' : 'Record Minutes'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(meeting)}
                      aria-label={`Delete meeting ${meeting.title}`}
                      className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500">Agenda Items</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-700">
                    {meeting.agenda.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500">
                    Minutes &amp; Resolutions
                  </h3>
                  {meeting.minutes ? (
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      <p className="leading-relaxed">{meeting.minutes}</p>
                      {meeting.decisions && meeting.decisions.length > 0 && (
                        <ul className="list-disc space-y-1 pl-4 text-xs font-medium text-[#0B1F3A]">
                          {meeting.decisions.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Minutes will be recorded after the meeting concludes.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Schedule Residents Meeting"
        subtitle="Publish date, venue, and agenda for all Tower 3 families."
      >
        <form onSubmit={handleSchedule} className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="mtg-title" className="block text-xs font-semibold text-slate-700">
              Meeting Title *
            </label>
            <input
              id="mtg-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., December 2026 Monthly Tower 3 Meeting"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mtg-date" className="block text-xs font-semibold text-slate-700">
                Date *
              </label>
              <input
                id="mtg-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="mtg-time" className="block text-xs font-semibold text-slate-700">
                Time *
              </label>
              <input
                id="mtg-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mtg-venue" className="block text-xs font-semibold text-slate-700">
              Venue
            </label>
            <input
              id="mtg-venue"
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="mtg-convenor" className="block text-xs font-semibold text-slate-700">
              Convenor
            </label>
            <input
              id="mtg-convenor"
              type="text"
              value={convenor}
              onChange={(e) => setConvenor(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="mtg-agenda" className="block text-xs font-semibold text-slate-700">
              Agenda Items (One per line) *
            </label>
            <textarea
              id="mtg-agenda"
              rows={4}
              value={agendaRaw}
              onChange={(e) => setAgendaRaw(e.target.value)}
              placeholder={'Discuss common area upkeep\nReview building safety and lighting'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
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
              Schedule Meeting
            </button>
          </div>
        </form>
      </Modal>

      {/* Minutes Modal */}
      <Modal
        open={Boolean(minutesTarget)}
        onClose={() => setMinutesTarget(null)}
        title="Record Minutes of Meeting"
        subtitle={minutesTarget?.title}
      >
        <form onSubmit={handleSaveMinutes} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mom-status" className="block text-xs font-semibold text-slate-700">
                Meeting Status
              </label>
              <select
                id="mom-status"
                value={minutesStatus}
                onChange={(e) => setMinutesStatus(e.target.value as MeetingStatus)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label htmlFor="mom-attendees" className="block text-xs font-semibold text-slate-700">
                Attending Units (out of 24)
              </label>
              <input
                id="mom-attendees"
                type="number"
                min={0}
                max={24}
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="mom-summary" className="block text-xs font-semibold text-slate-700">
              Discussion Summary
            </label>
            <textarea
              id="mom-summary"
              rows={4}
              value={minutesText}
              onChange={(e) => setMinutesText(e.target.value)}
              placeholder="Summarize key discussions and resident consensus..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="mom-decisions" className="block text-xs font-semibold text-slate-700">
              Approved Decisions / Action Items (One per line)
            </label>
            <textarea
              id="mom-decisions"
              rows={3}
              value={decisionsRaw}
              onChange={(e) => setDecisionsRaw(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setMinutesTarget(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Save Minutes
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMeeting(deleteTarget.id);
        }}
        title="Delete Meeting Record"
        description={deleteTarget ? `Delete "${deleteTarget.title}" permanently?` : ''}
        confirmLabel="Delete Meeting"
      />
    </div>
  );
}
