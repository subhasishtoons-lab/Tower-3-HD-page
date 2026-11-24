import React, { useMemo, useState } from 'react';
import { MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { DiscussionCategory, DiscussionTopic } from '../types';
import { ALL_UNIT_NUMBERS } from '../utils/residents';

const CATEGORIES: DiscussionCategory[] = [
  'General',
  'Maintenance',
  'Sanitation',
  'Security',
  'Community Events',
  'Suggestions',
];

interface DiscussionForumProps {
  store: TowerStore;
}

export function DiscussionForum({ store }: DiscussionForumProps) {
  const { state, localRole, addDiscussionTopic, addDiscussionReply, deleteDiscussionTopic } = store;
  const isAdmin = localRole === 'admin';

  const [categoryFilter, setCategoryFilter] = useState<'All' | DiscussionCategory>('All');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    state.discussions[0]?.id ?? null
  );

  // New Topic Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicCategory, setTopicCategory] = useState<DiscussionCategory>('General');
  const [topicUnit, setTopicUnit] = useState('049');
  const [topicAuthor, setTopicAuthor] = useState('');
  const [topicContent, setTopicContent] = useState('');
  const [topicError, setTopicError] = useState<string | null>(null);

  // Reply State
  const [replyUnit, setReplyUnit] = useState('050');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DiscussionTopic | null>(null);

  const filteredTopics = useMemo(
    () =>
      state.discussions
        .filter((d) => (categoryFilter === 'All' ? true : d.category === categoryFilter))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.discussions, categoryFilter]
  );

  const activeTopic =
    filteredTopics.find((t) => t.id === selectedTopicId) ?? filteredTopics[0] ?? null;

  const getResidentNameForUnit = (unitNum: string) => {
    const unit = state.units.find((u) => u.unitNumber === unitNum);
    return unit?.resident?.fullName || '';
  };

  const handleOpenNewTopic = () => {
    setTopicTitle('');
    setTopicContent('');
    setTopicUnit('049');
    setTopicAuthor(getResidentNameForUnit('049'));
    setTopicError(null);
    setModalOpen(true);
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || topicTitle.trim().length < 4) {
      setTopicError('Topic title must be at least 4 characters.');
      return;
    }
    if (!topicAuthor.trim()) {
      setTopicError('Please enter your name.');
      return;
    }
    if (!topicContent.trim() || topicContent.trim().length < 8) {
      setTopicError('Please write a message of at least 8 characters.');
      return;
    }
    addDiscussionTopic({
      title: topicTitle,
      category: topicCategory,
      authorName: topicAuthor,
      unitNumber: topicUnit,
      content: topicContent,
    });
    setModalOpen(false);
  };

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    const effectiveAuthor = replyAuthor.trim() || getResidentNameForUnit(replyUnit);
    if (!effectiveAuthor) {
      setReplyError('Please enter your name before posting a reply.');
      return;
    }
    if (!replyText.trim() || replyText.trim().length < 2) {
      setReplyError('Reply cannot be empty.');
      return;
    }
    addDiscussionReply(activeTopic.id, {
      authorName: effectiveAuthor,
      unitNumber: replyUnit,
      content: replyText,
    });
    setReplyText('');
    setReplyError(null);
  };

  return (
    <div>
      <PageHeader
        title="Discussion Forum"
        description="Open community threads for Tower 3 residents to share suggestions, coordinate sanitation timings, and discuss common improvements."
        action={
          <button
            type="button"
            onClick={handleOpenNewTopic}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Topic</span>
          </button>
        }
      />

      {/* Category Filter */}
      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
        {(['All', ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredTopics.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="No discussions started yet"
          description="Use the + New Topic button to start a discussion thread with Tower 3 neighbours."
          action={
            <button
              type="button"
              onClick={handleOpenNewTopic}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>New Topic</span>
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Topic List */}
          <div className="space-y-2.5 lg:col-span-5">
            {filteredTopics.map((topic) => {
              const isSelected = activeTopic?.id === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-sky-700">{topic.category}</span>
                    <span className="font-mono tabular-nums">{topic.createdAt.slice(0, 10)}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">{topic.title}</h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {topic.authorName} · Unit {topic.unitNumber}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {topic.replies.length} {topic.replies.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Active Thread */}
          <div className="lg:col-span-7">
            {activeTopic && (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-sky-700">{activeTopic.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Posted by {activeTopic.authorName} (Unit {activeTopic.unitNumber})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {activeTopic.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      <h2 className="mt-1.5 text-lg font-bold text-slate-900">
                        {activeTopic.title}
                      </h2>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(activeTopic)}
                        aria-label={`Delete discussion ${activeTopic.title}`}
                        className="rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {activeTopic.content}
                  </p>
                </div>

                {/* Replies List */}
                <div className="divide-y divide-slate-200 px-5">
                  <div className="py-3 text-xs font-semibold text-slate-500">
                    Replies &amp; Comments ({activeTopic.replies.length})
                  </div>
                  {activeTopic.replies.length === 0 ? (
                    <div className="py-5 text-sm text-slate-500">
                      No replies yet. Be the first resident to comment below.
                    </div>
                  ) : (
                    activeTopic.replies.map((rep) => (
                      <div key={rep.id} className="py-4">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900">
                            {rep.authorName}{' '}
                            <span className="font-mono font-normal text-slate-500">
                              (Unit {rep.unitNumber})
                            </span>
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {rep.createdAt.slice(0, 10)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-slate-700">{rep.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Composer */}
                <form
                  onSubmit={handlePostReply}
                  className="border-t border-slate-200 bg-slate-50/70 p-5 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-700">Add a Reply</div>
                  {replyError && (
                    <div role="alert" className="text-xs font-medium text-red-600">
                      {replyError}
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="reply-unit" className="block text-[11px] font-medium text-slate-600">
                        Your Unit
                      </label>
                      <select
                        id="reply-unit"
                        value={replyUnit}
                        onChange={(e) => {
                          setReplyUnit(e.target.value);
                          setReplyAuthor(getResidentNameForUnit(e.target.value));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                      >
                        {ALL_UNIT_NUMBERS.map((u) => (
                          <option key={u} value={u}>
                            Unit {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="reply-author" className="block text-[11px] font-medium text-slate-600">
                        Your Name
                      </label>
                      <input
                        id="reply-author"
                        type="text"
                        value={replyAuthor}
                        onChange={(e) => setReplyAuthor(e.target.value)}
                        placeholder={getResidentNameForUnit(replyUnit) || 'Enter your name'}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reply-text" className="sr-only">
                      Reply message
                    </label>
                    <textarea
                      id="reply-text"
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your comment or suggestion..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#132d52]"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Post Reply</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Topic Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Start a New Discussion Topic"
        subtitle="Share ideas or questions with Tower 3 neighbours."
      >
        <form onSubmit={handleCreateTopic} className="space-y-4">
          {topicError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {topicError}
            </div>
          )}
          <div>
            <label htmlFor="disc-title" className="block text-xs font-semibold text-slate-700">
              Topic Subject *
            </label>
            <input
              id="disc-title"
              type="text"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="e.g., Bihu Celebration Coordination for Tower 3"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="disc-cat" className="block text-xs font-semibold text-slate-700">
                Category
              </label>
              <select
                id="disc-cat"
                value={topicCategory}
                onChange={(e) => setTopicCategory(e.target.value as DiscussionCategory)}
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
              <label htmlFor="disc-unit" className="block text-xs font-semibold text-slate-700">
                Unit
              </label>
              <select
                id="disc-unit"
                value={topicUnit}
                onChange={(e) => {
                  setTopicUnit(e.target.value);
                  setTopicAuthor(getResidentNameForUnit(e.target.value));
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
              <label htmlFor="disc-author" className="block text-xs font-semibold text-slate-700">
                Your Name *
              </label>
              <input
                id="disc-author"
                type="text"
                value={topicAuthor}
                onChange={(e) => setTopicAuthor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="disc-body" className="block text-xs font-semibold text-slate-700">
              Discussion Details *
            </label>
            <textarea
              id="disc-body"
              rows={4}
              value={topicContent}
              onChange={(e) => setTopicContent(e.target.value)}
              placeholder="Explain your proposal or question..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
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
              Post Topic
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteDiscussionTopic(deleteTarget.id);
            setSelectedTopicId(null);
          }
        }}
        title="Delete Discussion Topic"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}" and all ${deleteTarget.replies.length} replies?`
            : ''
        }
        confirmLabel="Delete Topic"
      />
    </div>
  );
}
