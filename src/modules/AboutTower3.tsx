import React, { useState } from 'react';
import { Building2, Camera, Images, MapPin, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import {
  DEFAULT_GALLERY_PHOTOS,
  NEARBY_DISTANCES,
  TOWER_3_LOGO_URL,
} from '../data/seedData';
import type { TowerStore } from '../store/useTowerStore';
import type { GalleryPhoto } from '../types';
import { TOWER_FLOORS } from '../utils/residents';

function compressGalleryImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxDim = 960;
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
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface AboutTower3Props {
  store: TowerStore;
  onInspectUnit: (unitNumber: string) => void;
}

export function AboutTower3({ store, onInspectUnit }: AboutTower3Props) {
  const { state, localRole, addGalleryPhoto, deleteGalleryPhoto } = store;
  const isAdmin = localRole === 'admin';

  const galleryPhotos = state.galleryPhotos?.length
    ? state.galleryPhotos
    : DEFAULT_GALLERY_PHOTOS;

  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
  const [photoUploader, setPhotoUploader] = useState('Tower 3 Resident');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setUploadError('Image must be smaller than 6 MB.');
      return;
    }
    try {
      const compressed = await compressGalleryImage(file);
      setPhotoDataUrl(compressed);
      setPhotoFileName(file.name);
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleSubmitPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoTitle.trim() || photoTitle.trim().length < 3) {
      setUploadError('Please enter a photo title (at least 3 characters).');
      return;
    }
    if (!photoDataUrl) {
      setUploadError('Please choose a photograph to upload.');
      return;
    }
    addGalleryPhoto({
      title: photoTitle,
      caption: photoCaption,
      imageUrl: photoDataUrl,
      uploadedBy: photoUploader,
      date: photoDate,
    });
    setPhotoTitle('');
    setPhotoCaption('');
    setPhotoDataUrl('');
    setPhotoFileName('');
    setUploadError(null);
    setUploadOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="About Tower 3"
        description="Company-allotted OIL quarters profile, nearby distances, Photo Gallery, and building layout (Units 049–072)."
      />

      {/* Profile Hero Card */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid items-stretch lg:grid-cols-12">
          <div className="relative min-h-[240px] bg-slate-900 lg:col-span-5">
            <img
              src={galleryPhotos[0].imageUrl}
              alt={galleryPhotos[0].title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-6 sm:p-8 lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3.5">
              <img
                src={TOWER_3_LOGO_URL}
                alt="TOWER 3 HD official logo"
                className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 bg-[#061326] object-cover"
              />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Non-Commercial Community Portal</span>
                </div>
                <h2 className="mt-0.5 font-display text-2xl font-bold text-[#0B1F3A]">
                  Tower 3, New Horizontal Enclave
                </h2>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-slate-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <span>
                Tower 3, New Horizontal Enclave, Oil Housing Area, Oil India Limited (OIL),
                Duliajan, Assam — 786602
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Part of the 7-tower New Horizontal Enclave inside the Oil India Limited Housing
              Colony, Duliajan. Tower 3 consists of company-allotted quarters across 6 residential
              floors with 4 units per floor (24 units numbered 049 through 072). This is not a
              private home society — residents are OIL personnel on transferable postings rather
              than permanent owners.
            </p>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Colony Towers</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">7</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Tower 3 Floors</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">6</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Units / Floor</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">4</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Units</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  24 (049–072)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby OIL Duliajan Landmarks & Distance Table */}
      <section
        aria-label="Nearby landmarks and distance from Tower 3"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <div className="flex flex-col gap-1 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MapPin className="h-5 w-5 text-sky-600" />
              <span>Nearby Landmarks &amp; Distance from Tower 3</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Approximate distance from Tower 3, New Horizontal Enclave, OIL Housing Area, Duliajan.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3 text-right">Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {NEARBY_DISTANCES.map((item) => (
                <tr key={item.place} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3 font-medium text-slate-900">{item.place}</td>
                  <td className="px-6 py-3 text-right font-mono font-semibold text-[#0B1F3A] tabular-nums">
                    {item.distance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tower 3 Photo Gallery */}
      <section aria-label="Tower 3 Photo Gallery" className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Images className="h-5 w-5 text-sky-600" />
              <span>Tower 3 Photo Gallery</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Community moments, festive illuminations, and building photographs from Tower 3,
              Duliajan. Click any photo to view full size.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setUploadOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Photo</span>
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleryPhotos.map((photo) => (
            <article
              key={photo.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setLightboxPhoto(photo)}
                aria-label={`View full photo: ${photo.title}`}
                className="group relative aspect-[16/10] w-full overflow-hidden bg-slate-900 text-left"
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">{photo.date}</span>
                    {photo.featured && (
                      <span className="font-semibold text-sky-700">Featured</span>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">{photo.title}</h3>
                  {photo.caption && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{photo.caption}</p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                  <span className="truncate">By {photo.uploadedBy}</span>
                  {isAdmin && galleryPhotos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(photo)}
                      aria-label={`Remove photo ${photo.title}`}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Interactive 6-Floor Architectural Matrix */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Tower 3 Floor &amp; Unit Directory (049–072)
            </h2>
            <p className="text-xs text-slate-600">
              Click any unit tile to open its resident record in Resident Management.
            </p>
          </div>
          <div className="text-xs text-slate-500">Top floor shown first (Floor 6 → Floor 1)</div>
        </div>

        <div className="mt-5 space-y-3">
          {[...TOWER_FLOORS].reverse().map((floor) => (
            <div key={floor.floor} className="grid gap-2.5 sm:grid-cols-12 sm:items-center">
              <div className="text-xs font-bold text-slate-500 sm:col-span-2">
                Floor {floor.floor}
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:col-span-10 sm:grid-cols-4">
                {floor.units.map((unitNum) => {
                  const unit = state.units.find((u) => u.unitNumber === unitNum);
                  return (
                    <button
                      key={unitNum}
                      type="button"
                      onClick={() => onInspectUnit(unitNum)}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-left transition-colors hover:border-sky-400 hover:bg-sky-50/50"
                    >
                      <div className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                        Unit {unitNum}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-600">
                        {unit?.resident ? unit.resident.fullName : '—'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Company-Allotted Quarters Notes & Prototype Limitations */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">
            Company-Allotted Quarters &amp; Billing Notes
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-700">
            <li>
              <span className="font-semibold text-slate-900">OIL Company-Allotted Housing:</span>{' '}
              Tower 3 is Oil India Limited residential accommodation — not a private home society.
              Residents are transferable company personnel rather than permanent owners.
            </li>
            <li>
              <span className="font-semibold text-slate-900">No Fixed Monthly Amount:</span> No
              monthly fee is pre-set. Whenever a shared contribution or common expense is required,
              an Admin creates it with the actual variable amount and splits it across the 24 units.
            </li>
            <li>
              <span className="font-semibold text-slate-900">No Utility Billing:</span> Electricity,
              water, and piped gas are managed directly under OIL India Limited housing provisions;
              no utility charges are billed in TOWER 3 HD.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Immutable Transfer History:</span>{' '}
              Transferring or replacing a resident preserves all past financial transactions and
              original occupant snapshots.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-6">
          <div className="flex items-center gap-2 text-base font-bold text-[#0B1F3A]">
            <ShieldCheck className="h-5 w-5 text-sky-700" />
            <span>Initial Local Prototype Scope</span>
          </div>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-700">
            <li>
              <span className="font-semibold text-slate-900">Browser-Only Storage:</span> All data
              persists in this device&apos;s browser{' '}
              <code className="font-mono text-xs">localStorage</code> with no external database,
              cloud backend, or email account requirement.
            </li>
            <li>
              <span className="font-semibold text-slate-900">No Automatic Multi-Device Sync:</span>{' '}
              Changes made on one resident&apos;s phone or computer do not automatically appear on
              another resident&apos;s device. Use{' '}
              <span className="font-semibold">Backup &amp; Restore</span> to share JSON snapshots
              manually.
            </li>
            <li>
              <span className="font-semibold text-slate-900">On-Device Local Accounts:</span>{' '}
              Resident and Admin accounts separate portal controls on this browser, and do not
              provide cloud or multi-device authentication.
            </li>
          </ul>
        </section>
      </div>

      {/* Full-Size Lightbox Modal */}
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

      {/* Add Photo Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Add Photo to Tower 3 Gallery"
        subtitle="Photos are compressed automatically and saved locally in browser storage."
      >
        <form onSubmit={handleSubmitPhoto} className="space-y-4">
          {uploadError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          <div>
            <label htmlFor="gal-title" className="block text-xs font-semibold text-slate-700">
              Photo Title *
            </label>
            <input
              id="gal-title"
              type="text"
              value={photoTitle}
              onChange={(e) => setPhotoTitle(e.target.value)}
              placeholder="e.g., Magh Bihu Community Gathering"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gal-date" className="block text-xs font-semibold text-slate-700">
                Date
              </label>
              <input
                id="gal-date"
                type="date"
                value={photoDate}
                onChange={(e) => setPhotoDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="gal-uploader" className="block text-xs font-semibold text-slate-700">
                Uploaded By
              </label>
              <input
                id="gal-uploader"
                type="text"
                value={photoUploader}
                onChange={(e) => setPhotoUploader(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gal-caption" className="block text-xs font-semibold text-slate-700">
              Caption
            </label>
            <textarea
              id="gal-caption"
              rows={2}
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Short description of the event or location..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="gal-file" className="block text-xs font-semibold text-slate-700">
              Choose Image *
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <label
                htmlFor="gal-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Camera className="h-4 w-4 text-sky-600" />
                <span>{photoFileName ? 'Replace Image' : 'Select Image'}</span>
              </label>
              <input
                id="gal-file"
                type="file"
                accept="image/*"
                onChange={handleSelectImage}
                className="sr-only"
              />
              {photoFileName && (
                <span className="truncate text-xs text-slate-600">{photoFileName}</span>
              )}
            </div>
            {photoDataUrl && (
              <img
                src={photoDataUrl}
                alt="Upload preview"
                className="mt-3 h-32 w-48 rounded-lg border border-slate-200 object-cover"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Add to Gallery
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteGalleryPhoto(deleteTarget.id);
        }}
        title="Remove Gallery Photo"
        description={
          deleteTarget ? `Remove "${deleteTarget.title}" from the Tower 3 Photo Gallery?` : ''
        }
        confirmLabel="Remove Photo"
      />
    </div>
  );
}
