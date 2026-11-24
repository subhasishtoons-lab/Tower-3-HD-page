import React, { useMemo, useState } from 'react';
import { Megaphone, Pencil, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { NoticeItem, NoticePriority } from '../types';

interface NoticeBoardProps {
  store: TowerStore;
}

export function NoticeBoard({ store }: NoticeBoardProps) {
  const { state, localRole, addNotice, updateNotice, deleteNotice } = store;
  const isAdmin = localRole === 'admin';

  const [priorityFilter, setPriorityFilter] = useState<'all' | NoticePriority>('all');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const [author, setAuthor] = useState('Tower 3 Admin');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<NoticeItem | null>(null);

  const filteredNotices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.notices]
      .filter((n) => (priorityFilter === 'all' ? true : n.priority === priorityFilter))
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.author.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  }, [state.notices, priorityFilter, search]);

  const openAddModal = () => {
    setEditingNotice(null);
    setTitle('');
    setContent('');
    setPriority('normal');
    setAuthor('Tower 3 Admin');
    setPinned(false);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (notice: NoticeItem) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setPriority(notice.priority);
    setAuthor(notice.author);
    setPinned(notice.pinned);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 4) {
      setError('Notice title must be at least 4 characters.');
      return;
    }
    if (!content.trim() || content.trim().length < 10) {
      setError('Notice description must be at least 10 characters.');
      return;
    }
    if (!author.trim()) {
      setError('Please enter the issuing authority or author name.');
      return;
    }

    if (editingNotice) {
      updateNotice(editingNotice.id, {
        title: title.trim(),
        content: content.trim(),
        priority,
        author: author.trim(),
        pinned,
      });
    } else {
      addNotice({
        title: title.trim(),
        content: content.trim(),
        priority,
        author: author.trim(),
        pinned,
      });
    }
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Digital Notice Board"
        description="Official community circulars and announcements for all 24 units of Tower 3. Supports Normal, Important, and Emergency notices."
        action={
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Notice</span>
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['all', 'normal', 'important', 'emergency'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPriorityFilter(level)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                priorityFilter === level
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {level === 'all' ? `All (${state.notices.length})` : level}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notices..."
            aria-label="Search notices"
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {filteredNotices.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" />}
          title="No notices posted yet"
          description="No notices are pre-filled. Use the + Add Notice button whenever an announcement needs to be shared with Tower 3 residents."
          action={
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Notice</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => (
            <article
              key={notice.id}
              className={`rounded-xl border p-5 ${
                notice.priority === 'emergency'
                  ? 'border-red-200 bg-red-50/40'
                  : notice.priority === 'important'
                  ? 'border-sky-200 bg-white'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-semibold uppercase tracking-wide ${
                        notice.priority === 'emergency'
                          ? 'text-red-600'
                          : notice.priority === 'important'
                          ? 'text-sky-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {notice.priority} Notice
                    </span>
                    {notice.pinned && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-[#0B1F3A]">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </span>
                      </>
                    )}
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {notice.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  <h2 className="mt-1.5 text-lg font-bold text-slate-900">{notice.title}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {notice.content}
                  </p>
                  <div className="mt-3 text-xs text-slate-500">Issued by: {notice.author}</div>
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateNotice(notice.id, { pinned: !notice.pinned })}
                      aria-label={
                        notice.pinned
                          ? `Unpin notice ${notice.title}`
                          : `Pin notice ${notice.title}`
                      }
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {notice.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(notice)}
                      aria-label={`Edit notice ${notice.title}`}
                      className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(notice)}
                      aria-label={`Delete notice ${notice.title}`}
                      className="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add / Edit Notice Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingNotice ? 'Edit Community Notice' : 'Add Notice to Digital Notice Board'}
        subtitle="Select Normal, Important, or Emergency classification."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="notice-title" className="block text-xs font-semibold text-slate-700">
              Notice Title *
            </label>
            <input
              id="notice-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sunday Lobby Cleaning & Staircase Wash"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="notice-priority" className="block text-xs font-semibold text-slate-700">
                Notice Type *
              </label>
              <select
                id="notice-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as NoticePriority)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="normal">Normal Notice</option>
                <option value="important">Important Notice</option>
                <option value="emergency">Emergency Notice</option>
              </select>
            </div>

            <div>
              <label htmlFor="notice-author" className="block text-xs font-semibold text-slate-700">
                Issued By *
              </label>
              <input
                id="notice-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Tower 3 Admin"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notice-content" className="block text-xs font-semibold text-slate-700">
              Notice Details *
            </label>
            <textarea
              id="notice-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write full announcement details, dates, and resident instructions..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            <span>Pin notice to the top of the notice board</span>
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
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              {editingNotice ? 'Update Notice' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteNotice(deleteTarget.id);
        }}
        title="Delete Notice"
        description={
          deleteTarget ? `Permanently delete "${deleteTarget.title}" from the notice board?` : ''
        }
        confirmLabel="Delete Notice"
      />
    </div>
  );
}
