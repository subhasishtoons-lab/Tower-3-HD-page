import React, { useState } from 'react';
import { Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { EmergencyContact } from '../types';

const CONTACT_CATEGORIES: EmergencyContact['category'][] = [
  'Medical',
  'Security',
  'Fire & Rescue',
  'Tower Utilities',
  'Tower Contacts',
];

interface EmergencyContactsProps {
  store: TowerStore;
}

export function EmergencyContacts({ store }: EmergencyContactsProps) {
  const { state, localRole, addContact, updateContact, deleteContact } = store;
  const isAdmin = localRole === 'admin';

  const [categoryFilter, setCategoryFilter] = useState<'All' | EmergencyContact['category']>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContact | null>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<EmergencyContact['category']>('Tower Utilities');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [availability, setAvailability] = useState('24 Hours / All Days');
  const [location, setLocation] = useState('OIL Housing Area, Duliajan');
  const [error, setError] = useState<string | null>(null);

  const filteredContacts = state.emergencyContacts.filter((c) =>
    categoryFilter === 'All' ? true : c.category === categoryFilter
  );

  const openAdd = () => {
    setEditing(null);
    setName('');
    setRole('');
    setCategory('Tower Utilities');
    setPhone('');
    setAlternatePhone('');
    setAvailability('24 Hours / All Days');
    setLocation('OIL Housing Area, Duliajan');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setName(c.name);
    setRole(c.role);
    setCategory(c.category);
    setPhone(c.phone);
    setAlternatePhone(c.alternatePhone || '');
    setAvailability(c.availability);
    setLocation(c.location);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Contact name is required.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 3) {
      setError('Please enter a valid telephone or helpline number.');
      return;
    }

    const payload = {
      name: name.trim(),
      role: role.trim() || 'Emergency Support',
      category,
      phone: phone.trim(),
      alternatePhone: alternatePhone.trim() || undefined,
      availability: availability.trim() || 'On Call',
      location: location.trim() || 'Duliajan, Assam',
    };

    if (editing) {
      updateContact(editing.id, payload);
    } else {
      addContact(payload);
    }
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Emergency Contacts"
        description="Essential Duliajan OIL Township emergency numbers, hospital casualty, CISF security, fire services, and Tower 3 emergency contacts."
        action={
          isAdmin ? (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Contact</span>
            </button>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
        {(['All', ...CONTACT_CATEGORIES] as const).map((cat) => (
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredContacts.map((contact) => {
          const isCritical =
            contact.category === 'Medical' ||
            contact.category === 'Fire & Rescue' ||
            contact.category === 'Security';
          return (
            <div
              key={contact.id}
              className={`flex flex-col justify-between rounded-xl border p-5 ${
                isCritical ? 'border-red-200 bg-white' : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isCritical ? 'text-red-600' : 'text-sky-700'
                    }`}
                  >
                    {contact.category}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(contact)}
                        aria-label={`Edit contact ${contact.name}`}
                        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(contact)}
                        aria-label={`Delete contact ${contact.name}`}
                        className="rounded-md p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h2 className="mt-1.5 text-base font-bold text-slate-900">{contact.name}</h2>
                <p className="mt-0.5 text-xs text-slate-600">{contact.role}</p>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div>Hours: {contact.availability}</div>
                  <div>Location: {contact.location}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3.5">
                {contact.phone.trim() ? (
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-xs font-semibold text-white transition-colors ${
                      isCritical
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-[#0B1F3A] hover:bg-[#132d52]'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{contact.phone}</span>
                  </a>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Phone number not added yet
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEdit(contact)}
                        aria-label={`Add phone number for ${contact.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Add Phone Number</span>
                      </button>
                    )}
                  </div>
                )}
                {contact.alternatePhone && (
                  <a
                    href={`tel:${contact.alternatePhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Alt: {contact.alternatePhone}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Contact Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cnt-name" className="block text-xs font-semibold text-slate-700">
                Name / Desk *
              </label>
              <input
                id="cnt-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cnt-cat" className="block text-xs font-semibold text-slate-700">
                Category
              </label>
              <select
                id="cnt-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as EmergencyContact['category'])}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {CONTACT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cnt-role" className="block text-xs font-semibold text-slate-700">
                Role / Service
              </label>
              <input
                id="cnt-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cnt-phone" className="block text-xs font-semibold text-slate-700">
                Primary Phone *
              </label>
              <input
                id="cnt-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="cnt-alt" className="block text-xs font-semibold text-slate-700">
                Alternate Phone
              </label>
              <input
                id="cnt-alt"
                type="tel"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="cnt-hours" className="block text-xs font-semibold text-slate-700">
                Availability
              </label>
              <input
                id="cnt-hours"
                type="text"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cnt-loc" className="block text-xs font-semibold text-slate-700">
              Location / Desk Address
            </label>
            <input
              id="cnt-loc"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
              Save Contact
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteContact(deleteTarget.id);
        }}
        title="Delete Emergency Contact"
        description={deleteTarget ? `Remove "${deleteTarget.name}" from Emergency Contacts?` : ''}
        confirmLabel="Delete Contact"
      />
    </div>
  );
}
