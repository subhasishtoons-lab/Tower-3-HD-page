export type ModuleId =
  | 'home'
  | 'residents'
  | 'bills'
  | 'expenses'
  | 'notices'
  | 'emergencies'
  | 'discussions'
  | 'maintenance'
  | 'meetings'
  | 'contacts'
  | 'activity'
  | 'admin'
  | 'about'
  | 'backup';

export type LocalViewRole = 'admin' | 'resident';

export interface LocalAccount {
  id: string;
  username: string; // normalized lowercase, no email required
  fullName: string;
  role: LocalViewRole;
  isPrimaryAdmin?: boolean; // true only for the 1st Admin who can promote up to 2 residents (3 admins max)
  unitNumber?: string; // required for residents ('049'–'072'), optional for admins
  designation?: string; // optional role label for admins
  passwordSalt: string; // base64 random 16-byte salt
  passwordHash: string; // base64 PBKDF2-SHA256 derived key
  securityQuestion: string; // mandatory password-reset hint question (no email required)
  securityAnswerSalt: string; // base64 random 16-byte salt for normalized security answer
  securityAnswerHash: string; // base64 PBKDF2-SHA256 derived key for normalized security answer
  createdAt: string;
}

export interface PublicAccount {
  id: string;
  username: string;
  fullName: string;
  role: LocalViewRole;
  isPrimaryAdmin?: boolean;
  unitNumber?: string;
  designation?: string;
  securityQuestion: string;
  createdAt: string;
}

export interface AuthSession {
  accountId: string;
  username: string;
  fullName: string;
  role: LocalViewRole;
  isPrimaryAdmin?: boolean;
  unitNumber?: string;
  designation?: string;
  signedInAt: string;
}

export interface Resident {
  id: string;
  unitNumber: string; // '049' through '072'
  fullName: string;
  oilEmployeeId: string;
  department: string;
  phone: string;
  familyMembers: number;
  vehicleNumbers: string;
  moveInDate: string; // YYYY-MM-DD
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes?: string;
}

export interface ResidentTransferRecord {
  id: string;
  unitNumber: string;
  residentId: string;
  fullName: string;
  oilEmployeeId: string;
  department: string;
  moveInDate: string;
  moveOutDate: string;
  reason: string;
  recordedAt: string;
}

export interface UnitInfo {
  unitNumber: string;
  floor: number; // 1 to 6
  resident: Resident | null; // null = blank (no resident name assigned)
}

export type BillStatus = 'unpaid' | 'paid';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer';

export interface MonthlyBill {
  id: string;
  month: string; // YYYY-MM
  unitNumber: string;
  residentIdSnapshot: string | null;
  residentNameSnapshot: string; // Preserved even if resident later transfers or leaves
  cleanerShare: number; // Variable base monthly share per unit set by Admin when creating bills
  extraExpensesShare: number; // Sum of approved expenses for month / 24
  extraExpenseIds: string[];
  totalAmount: number;
  status: BillStatus;
  paidAt?: string;
  paymentMode?: PaymentMode;
  receiptRef?: string;
  generatedAt: string;
}

export type ExpenseApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface ExpenseRecord {
  id: string;
  title: string;
  category: 'Sanitation Supplies' | 'Common Area Repair' | 'Lift Maintenance' | 'Electrical Common' | 'Garden & Grounds' | 'Security' | 'Community Event' | 'Other';
  amount: number;
  date: string; // YYYY-MM-DD
  billingMonth: string; // YYYY-MM
  vendor: string;
  approvalStatus: ExpenseApprovalStatus;
  splitEqually: boolean; // Default true across 24 units
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export type NoticePriority = 'normal' | 'important' | 'emergency';

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  priority: NoticePriority;
  author: string;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type EmergencySeverity = 'critical' | 'high' | 'advisory';
export type EmergencyStatus = 'active' | 'resolved';

export interface EmergencyAnnouncement {
  id: string;
  title: string;
  message: string;
  severity: EmergencySeverity;
  status: EmergencyStatus;
  issuedBy: string;
  affectedUnits: string; // e.g., 'All 24 Units' or 'Floors 4–6'
  actionRequired: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export type DiscussionCategory = 'General' | 'Maintenance' | 'Sanitation' | 'Security' | 'Community Events' | 'Suggestions';

export interface DiscussionReply {
  id: string;
  authorName: string;
  unitNumber: string;
  content: string;
  createdAt: string;
}

export interface DiscussionTopic {
  id: string;
  title: string;
  category: DiscussionCategory;
  authorName: string;
  unitNumber: string;
  content: string;
  createdAt: string;
  replies: DiscussionReply[];
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface MaintenanceRequest {
  id: string;
  unitNumber: string;
  reportedBy: string;
  title: string;
  category: 'Plumbing' | 'Lift' | 'Common Lighting' | 'Sanitation' | 'Security' | 'Civil / Seepage' | 'Other';
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  photoDataUrl?: string;
  photoName?: string;
  assignedTo?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type MeetingStatus = 'upcoming' | 'completed' | 'cancelled';

export interface MeetingRecord {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venue: string;
  status: MeetingStatus;
  agenda: string[];
  minutes?: string;
  decisions?: string[];
  attendeeUnitsCount?: number;
  convenor: string;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  category: 'Medical' | 'Security' | 'Fire & Rescue' | 'Tower Utilities' | 'Tower Contacts';
  phone: string;
  alternatePhone?: string;
  availability: string;
  location: string;
}

export type ActivityCategory =
  | 'resident'
  | 'billing'
  | 'expense'
  | 'notice'
  | 'emergency'
  | 'discussion'
  | 'maintenance'
  | 'meeting'
  | 'contact'
  | 'backup'
  | 'admin';

export interface ActivityLog {
  id: string;
  category: ActivityCategory;
  action: string;
  details: string;
  unitNumber?: string;
  actor: string;
  timestamp: string;
}

export interface CommitteeMember {
  id: string;
  role: string;
  name: string;
  unitNumber: string;
  phone: string;
}

export interface GalleryPhoto {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  uploadedBy: string;
  date: string; // YYYY-MM-DD
  featured?: boolean;
}

export interface TowerDataState {
  schemaVersion: number;
  lastUpdatedAt: string;
  lastBackupAt: string | null;
  units: UnitInfo[];
  residentHistory: ResidentTransferRecord[];
  bills: MonthlyBill[];
  expenses: ExpenseRecord[];
  notices: NoticeItem[];
  emergencies: EmergencyAnnouncement[];
  discussions: DiscussionTopic[];
  maintenanceRequests: MaintenanceRequest[];
  meetings: MeetingRecord[];
  emergencyContacts: EmergencyContact[];
  activityLogs: ActivityLog[];
  committeeMembers: CommitteeMember[];
  galleryPhotos?: GalleryPhoto[];
}
