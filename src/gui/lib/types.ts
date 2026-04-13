export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export type EstablishmentType =
  | "Drug Manufacturer"
  | "Food Facility"
  | "Medical Device"
  | "Biologics"
  | "Cosmetics"
  | "Tobacco"
  | "Veterinary"
  | "Other";

export interface Investigator {
  id: string;
  name: string;
  title: string;
  badgeNumber: string;
  districtOffice: string;
}

export interface Inspection {
  id: string;
  status: "in_progress" | "pending_review" | "closed";
  firm: {
    name: string;
    feiNumber: string;
    address: Address;
    type: EstablishmentType;
  };
  dates: { start: Date; end: Date };
  districtOffice: string;
  reportIssuedTo: { name: string; title: string };
  investigators: Investigator[];
  observations: Observation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Observation {
  id: string;
  number: number;
  text: string;
  significance: "minor" | "significant" | "critical";
  evidence: Evidence[];
  citations: CFRCitation[];
  who?: string;
  what?: string;
  when?: string;
  where?: string;
  howMuch?: string;
  howOften?: string;
  aiGenerated: boolean;
  lastModified: Date;
}

export interface Evidence {
  id: string;
  description: string;
  attachments: FileAttachment[];
  sourceType: "record" | "photo" | "interview" | "observation";
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface CFRCitation {
  part: string;
  section: string;
  title: string;
  fullCitation: string;
}

export interface Form483 {
  id: string;
  inspectionId: string;
  status: "draft" | "under_review" | "approved" | "published";
  observations: Observation[];
  signatures: DocumentSignature[];
  checklistItems: ChecklistItem[];
  issuedDate?: Date;
  publishedDate?: Date;
  auditTrail: AuditEvent[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: "not_started" | "in_progress" | "completed";
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
}

export interface DocumentSignature {
  investigatorId: string;
  investigatorName: string;
  title: string;
  signatureImage: string;
  signedAt: Date;
  required: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  actorId: string;
  actorName: string;
  action: string;
  details: Record<string, unknown>;
  type: "create" | "edit" | "sign" | "publish" | "review";
}

export interface ReferenceChunk {
  id: string;
  docId: string;
  source: "IOM" | "CFR";
  sectionPath: string[];
  title: string;
  text: string;
  pageStart: number;
  pageEnd: number;
}
