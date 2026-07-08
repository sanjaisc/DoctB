// =============================================================================
// Type-Safe Enum Constants for SQLite String Fields
// =============================================================================
// SQLite does not support native ENUM types. All enum-like fields are stored as
// String in Prisma. This module provides compile-time safe constants and
// runtime validation utilities. ALWAYS use these constants — never raw strings.
// =============================================================================

// ---- Clinic Statuses ----
export const CLINIC_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ClinicStatus = (typeof CLINIC_STATUS)[keyof typeof CLINIC_STATUS];

export const CLINIC_STATUSES: readonly ClinicStatus[] = Object.values(CLINIC_STATUS);

export const PUBLIC_CLINIC_STATUSES: readonly ClinicStatus[] = [
  CLINIC_STATUS.PUBLISHED,
];

export function isValidClinicStatus(value: string): value is ClinicStatus {
  return CLINIC_STATUSES.includes(value as ClinicStatus);
}

// ---- Provider Statuses ----
export const PROVIDER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type ProviderStatus = (typeof PROVIDER_STATUS)[keyof typeof PROVIDER_STATUS];

export const PROVIDER_STATUSES: readonly ProviderStatus[] = Object.values(PROVIDER_STATUS);

export const PUBLIC_PROVIDER_STATUSES: readonly ProviderStatus[] = [
  PROVIDER_STATUS.ACTIVE,
];

export function isValidProviderStatus(value: string): value is ProviderStatus {
  return PROVIDER_STATUSES.includes(value as ProviderStatus);
}

// ---- Slot Statuses ----
export const SLOT_STATUS = {
  AVAILABLE: "AVAILABLE",
  LOCKED: "LOCKED",
  BOOKED: "BOOKED",
  BOOKED_EXTERNALLY: "BOOKED_EXTERNALLY",
  BLOCKED: "BLOCKED",
  CLOSED: "CLOSED",
} as const;

export type SlotStatus = (typeof SLOT_STATUS)[keyof typeof SLOT_STATUS];

export const SLOT_STATUSES: readonly SlotStatus[] = Object.values(SLOT_STATUS);

export function isValidSlotStatus(value: string): value is SlotStatus {
  return SLOT_STATUSES.includes(value as SlotStatus);
}

// ---- Slot Modality ----
export const SLOT_MODALITY = {
  IN_PERSON: "IN_PERSON",
  VIDEO: "VIDEO",
} as const;

export type SlotModality = (typeof SLOT_MODALITY)[keyof typeof SLOT_MODALITY];

export const SLOT_MODALITIES: readonly SlotModality[] = Object.values(SLOT_MODALITY);

export function isValidSlotModality(value: string): value is SlotModality {
  return SLOT_MODALITIES.includes(value as SlotModality);
}

// ---- Appointment Statuses ----
export const APPOINTMENT_STATUS = {
  BOOKED: "BOOKED",
  CHECKED_IN: "CHECKED_IN",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
} as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] =
  Object.values(APPOINTMENT_STATUS);

// Valid state transitions (enforced at application level)
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [APPOINTMENT_STATUS.BOOKED]: [
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.CHECKED_IN]: [APPOINTMENT_STATUS.COMPLETED],
  [APPOINTMENT_STATUS.COMPLETED]: [APPOINTMENT_STATUS.ARCHIVED],
  [APPOINTMENT_STATUS.CANCELLED]: [],
  [APPOINTMENT_STATUS.NO_SHOW]: [APPOINTMENT_STATUS.ARCHIVED],
  [APPOINTMENT_STATUS.ARCHIVED]: [],
};

export function isValidAppointmentStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUSES.includes(value as AppointmentStatus);
}

export function canTransitionTo(
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  return APPOINTMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---- Refund Statuses ----
export const REFUND_STATUS = {
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
  REFUND_FAILED: "REFUND_FAILED",
  FORFEITED: "FORFEITED",
} as const;

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const REFUND_STATUSES: readonly RefundStatus[] = Object.values(REFUND_STATUS);

// ---- Staff Roles (RBAC) ----
export const STAFF_ROLE = {
  SYSTEM_MANAGER: "SYSTEM_MANAGER",
  CLINIC_ADMIN: "CLINIC_ADMIN",
  CLINIC_RECEPTION: "CLINIC_RECEPTION",
} as const;

export type StaffRole = (typeof STAFF_ROLE)[keyof typeof STAFF_ROLE];

export const STAFF_ROLES: readonly StaffRole[] = Object.values(STAFF_ROLE);

// Role hierarchy: each role implicitly includes all capabilities of roles below it.
// CLINIC_ADMIN inherits all CLINIC_RECEPTION capabilities.
// SYSTEM_MANAGER inherits all CLINIC_ADMIN capabilities.
export const ROLE_HIERARCHY: Record<StaffRole, number> = {
  [STAFF_ROLE.CLINIC_RECEPTION]: 1,
  [STAFF_ROLE.CLINIC_ADMIN]: 2,
  [STAFF_ROLE.SYSTEM_MANAGER]: 3,
};

/**
 * Check if a user's role meets or exceeds the minimum required role level.
 * This is the single source of truth for role inheritance.
 *
 * @example
 * hasMinimumRole("CLINIC_ADMIN", "CLINIC_RECEPTION") // true — Admin can do Reception work
 * hasMinimumRole("CLINIC_RECEPTION", "CLINIC_ADMIN") // false — Reception cannot do Admin work
 */
export function hasMinimumRole(
  userRole: string,
  minimumRole: StaffRole
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as StaffRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return userLevel >= requiredLevel;
}

export function isValidStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

// ---- Reschedule Policies ----
export const RESCHEDULE_POLICY = {
  FORFEIT_ON_LATE_RESCHEDULE: "FORFEIT_ON_LATE_RESCHEDULE",
  TRANSFER_ON_LATE_RESCHEDULE: "TRANSFER_ON_LATE_RESCHEDULE",
  ALLOW_1_GRACE_TRANSFER: "ALLOW_1_GRACE_TRANSFER",
} as const;

export type ReschedulePolicy =
  (typeof RESCHEDULE_POLICY)[keyof typeof RESCHEDULE_POLICY];

export const RESCHEDULE_POLICIES: readonly ReschedulePolicy[] =
  Object.values(RESCHEDULE_POLICY);

// ---- Self-Pay Payment Types ----
export const SELF_PAY_PAYMENT_TYPE = {
  FULL_UPFRONT: "FULL_UPFRONT",
  STANDARD_DEPOSIT: "STANDARD_DEPOSIT",
} as const;

export type SelfPayPaymentType =
  (typeof SELF_PAY_PAYMENT_TYPE)[keyof typeof SELF_PAY_PAYMENT_TYPE];

// ---- Token Purposes ----
export const TOKEN_PURPOSE = {
  INTAKE: "INTAKE",
  REVIEW: "REVIEW",
  MANAGE: "MANAGE",
  CHECK_IN: "CHECK_IN",
} as const;

export type TokenPurpose = (typeof TOKEN_PURPOSE)[keyof typeof TOKEN_PURPOSE];

export const TOKEN_PURPOSES: readonly TokenPurpose[] = Object.values(TOKEN_PURPOSE);

// ---- Cancellation Reasons ----
export const CANCELLATION_REASON = {
  PATIENT_CANCELLED: "PATIENT_CANCELLED",
  CLINIC_CANCELLED: "CLINIC_CANCELLED",
  DOUBLE_BOOKING: "DOUBLE_BOOKING",
} as const;

export type CancellationReason =
  (typeof CANCELLATION_REASON)[keyof typeof CANCELLATION_REASON];

// ---- Payment Statuses ----
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  REFUNDED: "REFUNDED",
  FORFEITED: "FORFEITED",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// ---- Ledger Types ----
export const LEDGER_TYPE = {
  DEPOSIT_AUTH: "DEPOSIT_AUTH",
  DEPOSIT_CAPTURE: "DEPOSIT_CAPTURE",
  REFUND: "REFUND",
  FULL_PAYMENT: "FULL_PAYMENT",
  BALANCE_PAYMENT: "BALANCE_PAYMENT",
} as const;

export type LedgerType = (typeof LEDGER_TYPE)[keyof typeof LEDGER_TYPE];

// ---- Patient Types ----
export const PATIENT_TYPE = {
  ADULT: "ADULT",
  PEDIATRIC: "PEDIATRIC",
} as const;

export type PatientType = (typeof PATIENT_TYPE)[keyof typeof PATIENT_TYPE];

// ---- Waitlist Statuses ----
export const WAITLIST_STATUS = {
  ACTIVE: "ACTIVE",
  OFFERED: "OFFERED",
  FULFILLED: "FULFILLED",
  EXPIRED: "EXPIRED",
  REMOVED: "REMOVED",
} as const;

export type WaitlistStatus = (typeof WAITLIST_STATUS)[keyof typeof WAITLIST_STATUS];

// ---- Intake Field Types ----
export const INTAKE_FIELD_TYPE = {
  TEXT: "text",
  TEXTAREA: "textarea",
  SELECT: "select",
  CHECKBOX: "checkbox",
} as const;

export type IntakeFieldType = (typeof INTAKE_FIELD_TYPE)[keyof typeof INTAKE_FIELD_TYPE];

export const INTAKE_FIELD_TYPES: readonly IntakeFieldType[] = Object.values(INTAKE_FIELD_TYPE);

export function isValidIntakeFieldType(value: string): value is IntakeFieldType {
  return INTAKE_FIELD_TYPES.includes(value as IntakeFieldType);
}

// ---- Payment Methods ----
export const PAYMENT_METHOD = {
  STRIPE: "STRIPE",
  CASH_AT_DESK: "CASH_AT_DESK",
  MANUAL_WAIVER: "MANUAL_WAIVER",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

// =============================================================================
// Badge / Status-Pill Style Maps (used by <StatusBadge> component)
// =============================================================================

export const APP_STATUS_STYLES: Record<string, string> = {
  BOOKED:     "bg-blue-100 text-blue-700 border-blue-200",
  CHECKED_IN: "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED:  "bg-red-100 text-red-700 border-red-200",
  NO_SHOW:    "bg-gray-100 text-gray-600 border-gray-200",
  ARCHIVED:   "bg-muted text-muted-foreground border-muted",
};

export const APP_STATUS_LABELS: Record<string, string> = {
  BOOKED:     "Booked",
  CHECKED_IN: "Checked In",
  COMPLETED:  "Completed",
  CANCELLED:  "Cancelled",
  NO_SHOW:    "No Show",
  ARCHIVED:   "Archived",
};

export const SLOT_STATUS_STYLES: Record<string, string> = {
  AVAILABLE:         "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  LOCKED:            "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  BOOKED:            "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  BOOKED_EXTERNALLY: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  BLOCKED:           "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  CLOSED:            "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
};

export const SLOT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE:         "Available",
  LOCKED:            "Locked",
  BOOKED:            "Booked",
  BOOKED_EXTERNALLY: "Ext. Booked",
  BLOCKED:           "Blocked",
  CLOSED:            "Closed",
};

export const CLINIC_STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
  DRAFT:     "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400",
  PENDING:   "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  SUSPENDED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  ARCHIVED:  "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400",
};

export const AUDIT_ACTION_STYLES: Record<string, string> = {
  STAFF_LOGIN:           "bg-purple-100 text-purple-700",
  STAFF_LOGOUT:          "bg-purple-100 text-purple-700",
  BOOKING_CREATED:       "bg-emerald-100 text-emerald-700",
  BOOKING_CANCELLED:     "bg-red-100 text-red-700",
  BOOKING_CHECKED_IN:    "bg-amber-100 text-amber-700",
  BOOKING_COMPLETED:     "bg-emerald-100 text-emerald-700",
  BOOKING_RESCHEDULED:   "bg-blue-100 text-blue-700",
  BOOKING_NO_SHOW:       "bg-gray-100 text-gray-600",
  PROVIDER_CREATED:      "bg-sky-100 text-sky-700",
  PROVIDER_UPDATED:      "bg-sky-100 text-sky-700",
  CLINIC_UPDATED:        "bg-amber-100 text-amber-700",
  SLOT_BLOCKED:          "bg-orange-100 text-orange-700",
  SYSTEM_CONFIG_UPDATED: "bg-gray-100 text-gray-700",
  TAXONOMY_PURGED:       "bg-amber-100 text-amber-700",
};