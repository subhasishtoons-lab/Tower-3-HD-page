import { useCallback, useEffect, useState } from 'react';
import {
  createSeedData,
  DEFAULT_GALLERY_PHOTOS,
  DEFAULT_PERSON_EMERGENCY_CONTACTS,
} from '../data/seedData';
import type {
  ActivityCategory,
  ActivityLog,
  AuthSession,
  DiscussionCategory,
  EmergencyAnnouncement,
  EmergencyContact,
  EmergencySeverity,
  ExpenseApprovalStatus,
  ExpenseRecord,
  GalleryPhoto,
  LocalViewRole,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
  MeetingRecord,
  MeetingStatus,
  NoticeItem,
  NoticePriority,
  PaymentMode,
  TowerDataState,
} from '../types';
import { buildBackupPayload } from '../utils/backup';
import { generateMonthlyBills, markBillPayment } from '../utils/finance';
import {
  addResidentToUnit,
  createId,
  editResidentInUnit,
  removeResidentFromUnit,
  replaceResidentInUnit,
  type ResidentInput,
} from '../utils/residents';

const STORAGE_KEY = 'tower3_hd_state_v3';
const LEGACY_STORAGE_KEY = 'tower3_hd_state_v2';

function normalizeContacts(rawContacts: unknown): EmergencyContact[] {
  const list: EmergencyContact[] = Array.isArray(rawContacts)
    ? rawContacts.map((c: EmergencyContact) => ({
        ...c,
        category:
          (c.category as string) === 'Committee' ? 'Tower Contacts' : c.category,
      }))
    : [];

  const existingIds = new Set(list.map((c) => c.id));
  const existingNames = new Set(list.map((c) => c.name.trim().toLowerCase()));
  const toPrepend = DEFAULT_PERSON_EMERGENCY_CONTACTS.filter(
    (c) => !existingIds.has(c.id) && !existingNames.has(c.name.trim().toLowerCase())
  );
  return toPrepend.length > 0 ? [...toPrepend, ...list] : list;
}

function normalizeGalleryPhotos(rawPhotos: unknown): GalleryPhoto[] {
  const existing: GalleryPhoto[] = Array.isArray(rawPhotos)
    ? (rawPhotos as GalleryPhoto[]).filter((p) => p && p.id !== 'gal_seed_2')
    : [];
  const existingIds = new Set(existing.map((p) => p.id));
  const existingUrls = new Set(existing.map((p) => p.imageUrl));
  const missingDefaults = DEFAULT_GALLERY_PHOTOS.filter(
    (p) => !existingIds.has(p.id) && !existingUrls.has(p.imageUrl)
  );
  if (existing.length === 0) return DEFAULT_GALLERY_PHOTOS;
  return missingDefaults.length > 0 ? [...existing, ...missingDefaults] : existing;
}

function loadInitialState(): TowerDataState {
  try {
    const rawV3 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as TowerDataState;
      if (parsed && Array.isArray(parsed.units) && parsed.units.length === 24) {
        return {
          ...parsed,
          committeeMembers: [],
          emergencyContacts: normalizeContacts(parsed.emergencyContacts),
          galleryPhotos: normalizeGalleryPhotos(parsed.galleryPhotos),
        };
      }
    }

    // One-time migration from v2 -> v3: preserve units, resident history, gallery photos, and emergency contacts
    // while clearing pre-filled sample bills, expenses, notices, emergencies, meetings, maintenance, and office bearers
    const rawV2 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV2) {
      const legacy = JSON.parse(rawV2) as TowerDataState;
      if (legacy && Array.isArray(legacy.units) && legacy.units.length === 24) {
        const cleanSeed = createSeedData();
        const migrated: TowerDataState = {
          ...cleanSeed,
          units: legacy.units,
          residentHistory: Array.isArray(legacy.residentHistory) ? legacy.residentHistory : [],
          emergencyContacts: normalizeContacts(legacy.emergencyContacts),
          galleryPhotos: normalizeGalleryPhotos(legacy.galleryPhotos),
          lastBackupAt: legacy.lastBackupAt ?? null,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
      }
    }
  } catch {
    // Fallback to clean seed data if localStorage is unavailable or corrupt
  }
  return createSeedData();
}

function appendLog(
  logs: ActivityLog[],
  category: ActivityCategory,
  action: string,
  details: string,
  actor: string,
  unitNumber?: string
): ActivityLog[] {
  const entry: ActivityLog = {
    id: createId('act'),
    category,
    action,
    details,
    unitNumber,
    actor,
    timestamp: new Date().toISOString(),
  };
  return [entry, ...logs].slice(0, 250);
}

export function useTowerStore(currentUser: AuthSession | null) {
  const [state, setState] = useState<TowerDataState>(() => loadInitialState());
  const [storageError, setStorageError] = useState<string | null>(null);

  const localRole: LocalViewRole = currentUser?.role ?? 'resident';

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(null);
    } catch {
      setStorageError(
        'Browser storage quota reached. Please export a JSON backup and remove large maintenance photos.'
      );
    }
  }, [state]);

  const actorLabel = currentUser
    ? currentUser.role === 'admin'
      ? `${currentUser.fullName}${currentUser.designation ? ` (${currentUser.designation})` : ' (Admin)'}`
      : `${currentUser.fullName}${currentUser.unitNumber ? ` (Unit ${currentUser.unitNumber})` : ''}`
    : 'Tower 3 User';

  const ensureResidentNameForUnit = useCallback((unitNumber: string, fullName: string) => {
    setState((prev) => {
      const targetUnit = prev.units.find((u) => u.unitNumber === unitNumber);
      if (!targetUnit || targetUnit.resident !== null) return prev;
      const { units, resident } = addResidentToUnit(prev.units, {
        unitNumber,
        fullName,
        oilEmployeeId: '',
        department: '',
        phone: '',
        familyMembers: 1,
        vehicleNumbers: '',
        moveInDate: new Date().toISOString().slice(0, 10),
        emergencyContactName: '',
        emergencyContactPhone: '',
      });
      return {
        ...prev,
        lastUpdatedAt: new Date().toISOString(),
        units,
        activityLogs: appendLog(
          prev.activityLogs,
          'resident',
          'Resident Self-Registered Name',
          `${resident.fullName} linked to Unit ${resident.unitNumber} during local resident signup.`,
          `${resident.fullName} (Unit ${resident.unitNumber})`,
          resident.unitNumber
        ),
      };
    });
  }, []);

  // --- RESIDENTS ---
  const addResident = useCallback(
    (input: ResidentInput) => {
      setState((prev) => {
        const { units, resident } = addResidentToUnit(prev.units, input);
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          units,
          activityLogs: appendLog(
            prev.activityLogs,
            'resident',
            'Added Resident',
            `${resident.fullName} (${resident.oilEmployeeId}) assigned to Unit ${resident.unitNumber}.`,
            actorLabel,
            resident.unitNumber
          ),
        };
      });
    },
    [actorLabel]
  );

  const editResident = useCallback(
    (input: ResidentInput) => {
      setState((prev) => {
        const { units, resident } = editResidentInUnit(prev.units, input);
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          units,
          activityLogs: appendLog(
            prev.activityLogs,
            'resident',
            'Updated Resident Profile',
            `Updated details for ${resident.fullName} in Unit ${resident.unitNumber}. Historical bills preserved.`,
            actorLabel,
            resident.unitNumber
          ),
        };
      });
    },
    [actorLabel]
  );

  const replaceResident = useCallback(
    (input: ResidentInput, transferReason: string, moveOutDate: string) => {
      setState((prev) => {
        const { units, residentHistory, outgoingResident, incomingResident } =
          replaceResidentInUnit(prev.units, prev.residentHistory, input, transferReason, moveOutDate);
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          units,
          residentHistory,
          activityLogs: appendLog(
            prev.activityLogs,
            'resident',
            'Replaced Resident (Transfer)',
            `Unit ${input.unitNumber} transferred from ${outgoingResident.fullName} to ${incomingResident.fullName}. Previous financial transactions retained.`,
            actorLabel,
            input.unitNumber
          ),
        };
      });
    },
    [actorLabel]
  );

  const removeResident = useCallback(
    (unitNumber: string, reason: string, moveOutDate: string) => {
      setState((prev) => {
        const { units, residentHistory, outgoingResident } = removeResidentFromUnit(
          prev.units,
          prev.residentHistory,
          unitNumber,
          reason,
          moveOutDate
        );
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          units,
          residentHistory,
          activityLogs: appendLog(
            prev.activityLogs,
            'resident',
            'Deleted Resident Name',
            `${outgoingResident.fullName} removed from Unit ${unitNumber} (${reason || 'Deleted'}). Historical bills preserved.`,
            actorLabel,
            unitNumber
          ),
        };
      });
    },
    [actorLabel]
  );

  // --- MONTHLY BILLS ---
  const generateBillsForMonth = useCallback(
    (month: string, baseMonthlyAmount?: number) => {
      let summary = { createdCount: 0, updatedUnpaidCount: 0, preservedPaidCount: 0 };
      setState((prev) => {
        const result = generateMonthlyBills(
          prev.bills,
          prev.units,
          prev.expenses,
          month,
          baseMonthlyAmount
        );
        summary = {
          createdCount: result.createdCount,
          updatedUnpaidCount: result.updatedUnpaidCount,
          preservedPaidCount: result.preservedPaidCount,
        };
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          bills: result.bills,
          activityLogs: appendLog(
            prev.activityLogs,
            'billing',
            'Created / Synced Monthly Bills',
            `Month ${month}: ${result.createdCount} created, ${result.updatedUnpaidCount} unpaid updated, ${result.preservedPaidCount} paid preserved.`,
            actorLabel
          ),
        };
      });
      return summary;
    },
    [actorLabel]
  );

  const updateBillPayment = useCallback(
    (
      billId: string,
      status: 'paid' | 'unpaid',
      paymentMode?: PaymentMode,
      receiptRef?: string,
      paidAt?: string
    ) => {
      setState((prev) => {
        const target = prev.bills.find((b) => b.id === billId);
        const bills = markBillPayment(prev.bills, billId, status, paymentMode, receiptRef, paidAt);
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          bills,
          activityLogs: target
            ? appendLog(
                prev.activityLogs,
                'billing',
                status === 'paid' ? 'Marked Bill Paid' : 'Reverted Bill to Unpaid',
                `Unit ${target.unitNumber} (${target.month}) — ₹${target.totalAmount.toFixed(2)} ${
                  status === 'paid' ? `via ${paymentMode || 'UPI'}` : 'marked unpaid'
                }.`,
                actorLabel,
                target.unitNumber
              )
            : prev.activityLogs,
        };
      });
    },
    [actorLabel]
  );

  // --- EXPENSES ---
  const addExpense = useCallback(
    (input: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
      setState((prev) => {
        const expense: ExpenseRecord = {
          ...input,
          id: createId('exp'),
          createdAt: new Date().toISOString(),
        };
        const expenses = [expense, ...prev.expenses];
        // Automatically sync unpaid bills for that month only if monthly bills already exist
        const hasMonthBills = prev.bills.some((b) => b.month === expense.billingMonth);
        const synced =
          expense.approvalStatus === 'approved' && hasMonthBills
            ? generateMonthlyBills(prev.bills, prev.units, expenses, expense.billingMonth).bills
            : prev.bills;

        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          expenses,
          bills: synced,
          activityLogs: appendLog(
            prev.activityLogs,
            'expense',
            'Recorded Expense',
            `${expense.title} — ₹${expense.amount.toFixed(2)} (${expense.approvalStatus}) for ${expense.billingMonth}.`,
            actorLabel
          ),
        };
      });
    },
    [actorLabel]
  );

  const updateExpenseStatus = useCallback(
    (expenseId: string, status: ExpenseApprovalStatus, approvedBy?: string) => {
      setState((prev) => {
        const target = prev.expenses.find((e) => e.id === expenseId);
        if (!target) return prev;
        const expenses = prev.expenses.map((e) =>
          e.id === expenseId
            ? {
                ...e,
                approvalStatus: status,
                approvedBy: status === 'approved' ? approvedBy || actorLabel : e.approvedBy,
              }
            : e
        );
        // Re-sync unpaid bills for that month whenever approval changes
        const hasMonthBills = prev.bills.some((b) => b.month === target.billingMonth);
        const bills = hasMonthBills
          ? generateMonthlyBills(prev.bills, prev.units, expenses, target.billingMonth).bills
          : prev.bills;

        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          expenses,
          bills,
          activityLogs: appendLog(
            prev.activityLogs,
            'expense',
            `Expense ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            `${target.title} (₹${target.amount.toFixed(2)}) marked ${status} for ${target.billingMonth}.`,
            actorLabel
          ),
        };
      });
    },
    [actorLabel]
  );

  const deleteExpense = useCallback(
    (expenseId: string) => {
      setState((prev) => {
        const target = prev.expenses.find((e) => e.id === expenseId);
        if (!target) return prev;
        const expenses = prev.expenses.filter((e) => e.id !== expenseId);
        const hasMonthBills = prev.bills.some((b) => b.month === target.billingMonth);
        const bills = hasMonthBills
          ? generateMonthlyBills(prev.bills, prev.units, expenses, target.billingMonth).bills
          : prev.bills;
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          expenses,
          bills,
          activityLogs: appendLog(
            prev.activityLogs,
            'expense',
            'Deleted Expense',
            `Removed expense "${target.title}" (₹${target.amount.toFixed(2)}).`,
            actorLabel
          ),
        };
      });
    },
    [actorLabel]
  );

  // --- NOTICES ---
  const addNotice = useCallback(
    (input: { title: string; content: string; priority: NoticePriority; author: string; pinned: boolean }) => {
      setState((prev) => {
        const notice: NoticeItem = {
          id: createId('not'),
          title: input.title.trim(),
          content: input.content.trim(),
          priority: input.priority,
          author: input.author.trim() || actorLabel,
          pinned: input.pinned,
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          notices: [notice, ...prev.notices],
          activityLogs: appendLog(
            prev.activityLogs,
            'notice',
            'Published Notice',
            `[${notice.priority.toUpperCase()}] ${notice.title}`,
            notice.author
          ),
        };
      });
    },
    [actorLabel]
  );

  const updateNotice = useCallback(
    (
      id: string,
      updates: Partial<Pick<NoticeItem, 'title' | 'content' | 'priority' | 'pinned' | 'author'>>
    ) => {
      setState((prev) => ({
        ...prev,
        lastUpdatedAt: new Date().toISOString(),
        notices: prev.notices.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
        ),
      }));
    },
    []
  );

  const deleteNotice = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.notices.find((n) => n.id === id);
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          notices: prev.notices.filter((n) => n.id !== id),
          activityLogs: target
            ? appendLog(
                prev.activityLogs,
                'notice',
                'Deleted Notice',
                `Removed notice "${target.title}".`,
                actorLabel
              )
            : prev.activityLogs,
        };
      });
    },
    [actorLabel]
  );

  // --- EMERGENCY ANNOUNCEMENTS ---
  const addEmergency = useCallback(
    (input: {
      title: string;
      message: string;
      severity: EmergencySeverity;
      issuedBy: string;
      affectedUnits: string;
      actionRequired: string;
      alsoPostNotice?: boolean;
    }) => {
      setState((prev) => {
        const now = new Date().toISOString();
        const item: EmergencyAnnouncement = {
          id: createId('emg'),
          title: input.title.trim(),
          message: input.message.trim(),
          severity: input.severity,
          status: 'active',
          issuedBy: input.issuedBy.trim() || actorLabel,
          affectedUnits: input.affectedUnits.trim() || 'All 24 Units (049–072)',
          actionRequired: input.actionRequired.trim(),
          createdAt: now,
        };

        const notices = input.alsoPostNotice
          ? [
              {
                id: createId('not'),
                title: item.title,
                content: `${item.message}${item.actionRequired ? ` Action required: ${item.actionRequired}` : ''}`,
                priority: 'emergency' as NoticePriority,
                author: item.issuedBy,
                pinned: true,
                createdAt: now,
              },
              ...prev.notices,
            ]
          : prev.notices;

        return {
          ...prev,
          lastUpdatedAt: now,
          emergencies: [item, ...prev.emergencies],
          notices,
          activityLogs: appendLog(
            prev.activityLogs,
            'emergency',
            'Broadcasted Emergency Alert',
            `${item.title} (${item.severity.toUpperCase()}) — ${item.affectedUnits}.`,
            item.issuedBy
          ),
        };
      });
    },
    [actorLabel]
  );

  const resolveEmergency = useCallback(
    (id: string, resolutionNote: string) => {
      setState((prev) => {
        const target = prev.emergencies.find((e) => e.id === id);
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          emergencies: prev.emergencies.map((e) =>
            e.id === id
              ? {
                  ...e,
                  status: 'resolved',
                  resolvedAt: new Date().toISOString(),
                  resolutionNote: resolutionNote.trim() || 'Resolved by Tower 3 Admin.',
                }
              : e
          ),
          activityLogs: target
            ? appendLog(
                prev.activityLogs,
                'emergency',
                'Resolved Emergency Alert',
                `Resolved "${target.title}".`,
                actorLabel
              )
            : prev.activityLogs,
        };
      });
    },
    [actorLabel]
  );

  const deleteEmergency = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        lastUpdatedAt: new Date().toISOString(),
        emergencies: prev.emergencies.filter((e) => e.id !== id),
      }));
    },
    []
  );

  // --- DISCUSSIONS ---
  const addDiscussionTopic = useCallback(
    (input: {
      title: string;
      category: DiscussionCategory;
      authorName: string;
      unitNumber: string;
      content: string;
    }) => {
      setState((prev) => {
        const topic = {
          id: createId('disc'),
          title: input.title.trim(),
          category: input.category,
          authorName: input.authorName.trim(),
          unitNumber: input.unitNumber,
          content: input.content.trim(),
          createdAt: new Date().toISOString(),
          replies: [],
        };
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          discussions: [topic, ...prev.discussions],
          activityLogs: appendLog(
            prev.activityLogs,
            'discussion',
            'Started Discussion Topic',
            `"${topic.title}" posted by ${topic.authorName} (Unit ${topic.unitNumber}).`,
            topic.authorName,
            topic.unitNumber
          ),
        };
      });
    },
    []
  );

  const addDiscussionReply = useCallback(
    (topicId: string, input: { authorName: string; unitNumber: string; content: string }) => {
      setState((prev) => {
        const target = prev.discussions.find((d) => d.id === topicId);
        if (!target) return prev;
        const reply = {
          id: createId('rep'),
          authorName: input.authorName.trim(),
          unitNumber: input.unitNumber,
          content: input.content.trim(),
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          discussions: prev.discussions.map((d) =>
            d.id === topicId ? { ...d, replies: [...d.replies, reply] } : d
          ),
          activityLogs: appendLog(
            prev.activityLogs,
            'discussion',
            'Replied to Discussion',
            `${reply.authorName} (Unit ${reply.unitNumber}) replied on "${target.title}".`,
            reply.authorName,
            reply.unitNumber
          ),
        };
      });
    },
    []
  );

  const deleteDiscussionTopic = useCallback(
    (topicId: string) => {
      setState((prev) => ({
        ...prev,
        lastUpdatedAt: new Date().toISOString(),
        discussions: prev.discussions.filter((d) => d.id !== topicId),
      }));
    },
    []
  );

  // --- MAINTENANCE REQUESTS ---
  const addMaintenanceRequest = useCallback(
    (input: {
      unitNumber: string;
      reportedBy: string;
      title: string;
      category: MaintenanceRequest['category'];
      description: string;
      priority: MaintenancePriority;
      photoDataUrl?: string;
      photoName?: string;
    }) => {
      setState((prev) => {
        const now = new Date().toISOString();
        const req: MaintenanceRequest = {
          id: createId('mnt'),
          unitNumber: input.unitNumber,
          reportedBy: input.reportedBy.trim(),
          title: input.title.trim(),
          category: input.category,
          description: input.description.trim(),
          priority: input.priority,
          status: 'open',
          photoDataUrl: input.photoDataUrl,
          photoName: input.photoName,
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...prev,
          lastUpdatedAt: now,
          maintenanceRequests: [req, ...prev.maintenanceRequests],
          activityLogs: appendLog(
            prev.activityLogs,
            'maintenance',
            'Submitted Maintenance Request',
            `Unit ${req.unitNumber}: ${req.title} (${req.priority.toUpperCase()}).`,
            req.reportedBy,
            req.unitNumber
          ),
        };
      });
    },
    []
  );

  const updateMaintenanceStatus = useCallback(
    (
      id: string,
      status: MaintenanceStatus,
      assignedTo?: string,
      resolutionNote?: string
    ) => {
      setState((prev) => {
        const target = prev.maintenanceRequests.find((m) => m.id === id);
        if (!target) return prev;
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          maintenanceRequests: prev.maintenanceRequests.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status,
                  assignedTo: assignedTo !== undefined ? assignedTo : m.assignedTo,
                  resolutionNote: resolutionNote !== undefined ? resolutionNote : m.resolutionNote,
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
          activityLogs: appendLog(
            prev.activityLogs,
            'maintenance',
            'Updated Maintenance Status',
            `Unit ${target.unitNumber} — "${target.title}" moved to ${status.replace('_', ' ')}.`,
            actorLabel,
            target.unitNumber
          ),
        };
      });
    },
    [actorLabel]
  );

  const deleteMaintenanceRequest = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        lastUpdatedAt: new Date().toISOString(),
        maintenanceRequests: prev.maintenanceRequests.filter((m) => m.id !== id),
      }));
    },
    []
  );

  // --- MEETINGS ---
  const addMeeting = useCallback(
    (input: Omit<MeetingRecord, 'id' | 'createdAt'>) => {
      setState((prev) => {
        const meeting: MeetingRecord = {
          ...input,
          id: createId('mtg'),
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          meetings: [meeting, ...prev.meetings],
          activityLogs: appendLog(
            prev.activityLogs,
            'meeting',
            'Scheduled Community Meeting',
            `${meeting.title} on ${meeting.date} at ${meeting.time} (${meeting.venue}).`,
            meeting.convenor
          ),
        };
      });
    },
    []
  );

  const updateMeeting = useCallback(
    (
      id: string,
      updates: Partial<Pick<MeetingRecord, 'status' | 'minutes' | 'decisions' | 'attendeeUnitsCount' | 'agenda'>>
    ) => {
      setState((prev) => {
        const target = prev.meetings.find((m) => m.id === id);
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          meetings: prev.meetings.map((m) => (m.id === id ? { ...m, ...updates } : m)),
          activityLogs: target
            ? appendLog(
                prev.activityLogs,
                'meeting',
                'Updated Meeting Record',
                `Updated "${target.title}" (status: ${updates.status || target.status}).`,
                actorLabel
              )
            : prev.activityLogs,
        };
      });
    },
    [actorLabel]
  );

  const deleteMeeting = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      lastUpdatedAt: new Date().toISOString(),
      meetings: prev.meetings.filter((m) => m.id !== id),
    }));
  }, []);

  // --- EMERGENCY CONTACTS ---
  const addContact = useCallback(
    (input: Omit<EmergencyContact, 'id'>) => {
      setState((prev) => {
        const contact: EmergencyContact = { ...input, id: createId('cnt') };
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          emergencyContacts: [...prev.emergencyContacts, contact],
          activityLogs: appendLog(
            prev.activityLogs,
            'contact',
            'Added Emergency Contact',
            `${contact.name} (${contact.category}) — ${contact.phone}.`,
            actorLabel
          ),
        };
      });
    },
    [actorLabel]
  );

  const updateContact = useCallback((id: string, input: Omit<EmergencyContact, 'id'>) => {
    setState((prev) => ({
      ...prev,
      lastUpdatedAt: new Date().toISOString(),
      emergencyContacts: prev.emergencyContacts.map((c) => (c.id === id ? { ...input, id } : c)),
    }));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      lastUpdatedAt: new Date().toISOString(),
      emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id),
    }));
  }, []);

  // --- GALLERY PHOTOS ---

  const addGalleryPhoto = useCallback(
    (input: { title: string; caption: string; imageUrl: string; uploadedBy: string; date: string }) => {
      setState((prev) => {
        const existing = prev.galleryPhotos ?? DEFAULT_GALLERY_PHOTOS;
        const photo = {
          id: createId('gal'),
          title: input.title.trim(),
          caption: input.caption.trim(),
          imageUrl: input.imageUrl,
          uploadedBy: input.uploadedBy.trim() || actorLabel,
          date: input.date || new Date().toISOString().slice(0, 10),
        };
        return {
          ...prev,
          lastUpdatedAt: new Date().toISOString(),
          galleryPhotos: [photo, ...existing],
          activityLogs: appendLog(
            prev.activityLogs,
            'admin',
            'Added Photo Gallery Image',
            `Added "${photo.title}" to Tower 3 Photo Gallery.`,
            photo.uploadedBy
          ),
        };
      });
    },
    [actorLabel]
  );

  const deleteGalleryPhoto = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      lastUpdatedAt: new Date().toISOString(),
      galleryPhotos: (prev.galleryPhotos ?? DEFAULT_GALLERY_PHOTOS).filter((p) => p.id !== id),
    }));
  }, []);

  // --- BACKUP & RESTORE ---
  const createExportBackup = useCallback(() => {
    const exportedAt = new Date().toISOString();
    const payload = buildBackupPayload(state, exportedAt);
    setState((prev) => ({
      ...prev,
      lastBackupAt: exportedAt,
      activityLogs: appendLog(
        prev.activityLogs,
        'backup',
        'Exported JSON Backup',
        `Downloaded TOWER 3 HD backup snapshot (${prev.bills.length} bills, ${prev.expenses.length} expenses).`,
        actorLabel
      ),
    }));
    return payload;
  }, [state, actorLabel]);

  const restoreFromBackup = useCallback(
    (incomingData: TowerDataState) => {
      const restoredAt = new Date().toISOString();
      setState({
        ...incomingData,
        lastUpdatedAt: restoredAt,
        activityLogs: appendLog(
          incomingData.activityLogs,
          'backup',
          'Restored Data from JSON Backup',
          'Overwrote local browser records with verified JSON backup file.',
          actorLabel
        ),
      });
    },
    [actorLabel]
  );

  const resetToSeedData = useCallback(() => {
    const fresh = createSeedData();
    setState({
      ...fresh,
      activityLogs: appendLog(
        fresh.activityLogs,
        'admin',
        'Reset Local Portal Data',
        'Cleared local records and restored clean Tower 3 starting state in browser localStorage.',
        actorLabel
      ),
    });
  }, [actorLabel]);

  return {
    state,
    currentUser,
    localRole,
    storageError,
    ensureResidentNameForUnit,
    addResident,
    editResident,
    replaceResident,
    removeResident,
    generateBillsForMonth,
    updateBillPayment,
    addExpense,
    updateExpenseStatus,
    deleteExpense,
    addNotice,
    updateNotice,
    deleteNotice,
    addEmergency,
    resolveEmergency,
    deleteEmergency,
    addDiscussionTopic,
    addDiscussionReply,
    deleteDiscussionTopic,
    addMaintenanceRequest,
    updateMaintenanceStatus,
    deleteMaintenanceRequest,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addContact,
    updateContact,
    deleteContact,
    addGalleryPhoto,
    deleteGalleryPhoto,
    createExportBackup,
    restoreFromBackup,
    resetToSeedData,
  };
}

export type TowerStore = ReturnType<typeof useTowerStore>;
