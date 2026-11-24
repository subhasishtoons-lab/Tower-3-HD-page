import type {
  EmergencyContact,
  GalleryPhoto,
  TowerDataState,
  UnitInfo,
} from '../types';
import { BACKUP_SCHEMA_VERSION } from '../utils/backup';
import { TOWER_FLOORS } from '../utils/residents';

export interface NearbyDistanceItem {
  place: string;
  distance: string;
}

export const NEARBY_DISTANCES: NearbyDistanceItem[] = [
  { place: 'OIL Main Office', distance: '500 metres' },
  { place: 'R&D Office', distance: '400 metres' },
  { place: 'OIL Market', distance: '500 metres' },
  { place: 'OIL Medical', distance: '100 metres' },
  { place: 'OIL Co-operative', distance: '700 metres' },
  { place: 'Zaloni Club', distance: '500 metres' },
];

export const TOWER_3_LOGO_URL =
  '/assets/aistudio/e51bee19-24de-4577-9340-cf94d0567f2c_457ddf10.webp';

export const DEFAULT_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'gal_seed_1',
    title: 'Tower 3 Festive Illumination — Night View',
    caption:
      'Tower 3, New Horizontal Enclave illuminated with festive lights overlooking the children’s play area and colony lawn.',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-11-05_at_10.42.10_PM_340d65b4.jpeg',
    uploadedBy: 'Tower 3 Admin',
    date: '2026-11-05',
    featured: true,
  },
  {
    id: 'gal_seed_3',
    title: 'Tower 3 Entrance, Twin Lifts & All 6 Floors',
    caption:
      'Evening view of the Tower 3 ground lobby, twin lifts, TOWER-3 HD-T3 (049-072) plaque, and all six illuminated corridors.',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-11-24_at_11.12.34_AM_7e6cdfd9.jpeg',
    uploadedBy: 'Tower 3 Admin',
    date: '2026-11-24',
  },
  {
    id: 'gal_seed_4',
    title: 'Tower 3 Stairwell & Balconies — Night View',
    caption:
      'Upward night view of the central illuminated stairwell windows and residential balconies across Floors 1 to 6.',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-11-24_at_11.12.34_AM__1__5ceed1b7.jpeg',
    uploadedBy: 'Tower 3 Admin',
    date: '2026-11-24',
  },
  {
    id: 'gal_seed_5',
    title: 'TOWER-3 HD-T3 (049–072) Building Plaque',
    caption:
      'Official TOWER-3 HD-T3 (049–072) identification board lined with potted greenery on the first-floor balcony.',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-11-24_at_11.12.33_AM_36660269.jpeg',
    uploadedBy: 'Tower 3 Admin',
    date: '2026-11-24',
  },
  {
    id: 'gal_seed_6',
    title: 'Tower 3 Entrance Signage & Corridor Planters',
    caption:
      'Wide view of the TOWER-3 HD-T3 (049–072) entrance signage, ceiling lighting, and corridor planter boxes.',
    imageUrl: '/assets/aistudio/WhatsApp_Image_2026-11-24_at_11.12.33_AM__1__ab63afab.jpeg',
    uploadedBy: 'Tower 3 Admin',
    date: '2026-11-24',
  },
];

export const DEFAULT_PERSON_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'cnt_seed_arindam',
    name: 'Arindam Choudhury',
    role: 'Tower 3 Emergency Contact',
    category: 'Tower Contacts',
    phone: '',
    availability: 'On Call',
    location: 'Tower 3, New Horizontal Enclave',
  },
  {
    id: 'cnt_seed_akas',
    name: 'Akas N Das',
    role: 'Tower 3 Emergency Contact',
    category: 'Tower Contacts',
    phone: '',
    availability: 'On Call',
    location: 'Tower 3, New Horizontal Enclave',
  },
];

export function createSeedData(): TowerDataState {
  // All 24 units (049–072) start with blank resident names so the admin can add or delete names directly
  const units: UnitInfo[] = TOWER_FLOORS.flatMap((floorInfo) =>
    floorInfo.units.map((unitNumber) => ({
      unitNumber,
      floor: floorInfo.floor,
      resident: null,
    }))
  );

  const emergencyContacts: EmergencyContact[] = [
    ...DEFAULT_PERSON_EMERGENCY_CONTACTS,
    {
      id: 'cnt_seed_1',
      name: 'OIL Hospital Emergency & Ambulance',
      role: '24×7 Medical Casualty',
      category: 'Medical',
      phone: '0374-2800450',
      alternatePhone: '108',
      availability: '24 Hours / All Days',
      location: 'OIL Hospital Campus, Duliajan',
    },
    {
      id: 'cnt_seed_2',
      name: 'CISF & OIL Colony Security Control Room',
      role: 'Township Gate & Patrol Security',
      category: 'Security',
      phone: '0374-2800100',
      alternatePhone: '0374-2800101',
      availability: '24 Hours / All Days',
      location: 'Main Security Gate, OIL Housing Area',
    },
    {
      id: 'cnt_seed_3',
      name: 'OIL Fire Services Station, Duliajan',
      role: 'Fire & Emergency Rescue',
      category: 'Fire & Rescue',
      phone: '0374-2800101',
      alternatePhone: '101',
      availability: '24 Hours / All Days',
      location: 'Industrial Area Fire Station, Duliajan',
    },
    {
      id: 'cnt_seed_4',
      name: 'Township Civil & Plumbing Helpdesk',
      role: 'Water Tank, Pipelines & Civil Repairs',
      category: 'Tower Utilities',
      phone: '0374-2800622',
      availability: '7:00 AM – 8:00 PM',
      location: 'New Horizontal Enclave Maintenance Office',
    },
    {
      id: 'cnt_seed_5',
      name: 'Township Electrical & Lift Rescue Desk',
      role: 'Lift Breakdown & Common Power Supply',
      category: 'Tower Utilities',
      phone: '0374-2800635',
      availability: '24 Hours (On-Call Rescue)',
      location: 'OIL Electrical Sub-Station, Duliajan',
    },
  ];

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    lastUpdatedAt: new Date().toISOString(),
    lastBackupAt: null,
    units,
    residentHistory: [],
    bills: [],
    expenses: [],
    notices: [],
    emergencies: [],
    discussions: [],
    maintenanceRequests: [],
    meetings: [],
    emergencyContacts,
    activityLogs: [],
    committeeMembers: [],
    galleryPhotos: DEFAULT_GALLERY_PHOTOS,
  };
}
