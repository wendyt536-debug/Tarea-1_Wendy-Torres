export type Role = "Administrator" | "Contracting" | "Management" | "Requester";

// Status is a freeform string — values are loaded dynamically from the dropdown_values table.
// This ensures both legacy records and new standardized values render correctly.
export type IntakeStatus = string;

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type CommentType = "assignment" | "internal" | "follow-up" | "timeline";

export interface IntakeComment {
  id: string;
  intakeId: string;
  userName: string;
  userRole: Role;
  type: CommentType;
  body: string;
  createdAt: string; // ISO
}

export interface Intake {
  id: string;
  // Phase 1 - Assignment
  intakeNumber: string;
  requestType: string;
  lineOfBusiness: string;
  supplierName: string;
  kpEntity: string;
  fdaName: string;
  fdaNuid: string;
  requesterName: string;
  requesterNuid: string;
  assignedOwner: string;
  backupOwner: string;
  assignmentDate: string; // ISO date
  priority: Priority;
  assignmentComments: string;

  // Phase 2 - Contracting work
  contractNumber: string;
  contractType: string;
  estimatedContractAmount: number | null;
  receivedDate: string; // ISO date
  status: IntakeStatus;
  finishingDate: string; // ISO date | ""
  rootCause: string;
  documentsReceived: string;
  missingInformation: string;
  internalNotes: string;
  followUpNotes: string;
  finalComments: string;

  // Meta
  createdAt: string;
  lastUpdated: string;
  lastUpdatedBy: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}