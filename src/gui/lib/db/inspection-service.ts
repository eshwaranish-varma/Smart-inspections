import pool from "@/lib/db/client";
import { ensureAuthTables, type UserRole, type UserSignatureProfile } from "@/lib/db/user-service";

export type InspectionStatus =
  | "created"
  | "assigned"
  | "in_progress"
  | "draft_completed"
  | "approved_483"
  | "sent_to_firm"
  | "eir_assigned"
  | "eir_drafting"
  | "eir_submitted"
  | "under_review"
  | "approved"
  | "eir_approved"
  | "rejected"
  | "rework_required"
  | "closed";

export type NotificationType =
  | "ASSIGNED"
  | "SUBMITTED_FOR_REVIEW"
  | "REVIEW_STARTED"
  | "REWORK_REQUESTED"
  | "APPROVED"
  | "COMMENT_ADDED"
  | "DOCUMENT_READY";

export type InspectionRecord = {
  id: string;
  title: string;
  firm_name: string;
  fei_number: string;
  establishment_type: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  district_office: string;
  inspection_start: string | null;
  inspection_end: string | null;
  regulatory_basis: string;
  status: InspectionStatus;
  created_by: string;
  assigned_to: string | null;
  observations_json: string;
  eir_json: string;
  metadata_json: string;
  raw_notes: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  creator_name?: string;
  assignee_name?: string;
};

export type WorkflowLogRecord = {
  id: string;
  inspection_id: string;
  action: string;
  performed_by: string;
  comments: string;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
  performer_name?: string;
};

export type InspectionCommentRecord = {
  id: string;
  inspection_id: string;
  author_id: string;
  author_role: UserRole;
  comment: string;
  created_at: string;
  author_name?: string;
};

export type NotificationRecord = {
  id: string;
  user_id: string;
  inspection_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export type InspectionDocumentVersionRecord = {
  id: string;
  inspection_id: string;
  version_number: number;
  created_by: string;
  file_docx_path: string;
  file_pdf_path: string;
  version_type: "DRAFT" | "SUBMITTED" | "REWORK" | "APPROVED";
  comments_snapshot: string;
  payload_json: string;
  created_at: string;
  creator_name?: string;
};

export type DocumentLibraryRecord = {
  id: string;
  inspection_id: string | null;
  title: string;
  final_docx_path: string;
  final_pdf_path: string;
  status: string;
  approved_at: string;
  investigator_id: string | null;
  supervisor_id: string | null;
  publish_ready: boolean;
  archived_year: number | null;
  reopened_from_document_id: string | null;
  final_metadata_json: string;
  final_observations_json: string;
  final_eir_json: string;
  signatures_json: string;
  comments_snapshot_json: string;
  created_at: string;
  updated_at: string;
  investigator_name?: string;
  supervisor_name?: string;
};

/**
 * Enforce role-based access to an inspection. Returns the inspection if allowed, or null.
 * Supervisors can access any inspection. Investigators can only access inspections assigned to them.
 */
export function canUserAccessInspection(
  inspection: InspectionRecord,
  userId: string,
  userRole: string
): boolean {
  if (userRole === "supervisor") return true;
  return inspection.assigned_to === userId || inspection.created_by === userId;
}

/**
 * Workflow phases (paper spec) ↔ DB `status` values:
 * Phase 1 created → `created` · Phase 2 assigned → `assigned`
 * Phase 3 investigation → `in_progress` · Phase 4 483 draft done / “submitted for supervisor” → `draft_completed` (no separate `483_submitted`)
 * Phase 5 483 approved → `approved_483` · Phase 6 sent to firm → `sent_to_firm`
 * Phase 7 EIR assigned → `eir_assigned` · Phase 8 EIR drafting → `eir_drafting`
 * Phase 9 EIR submitted → `eir_submitted` · Phase 10 EIR review → `under_review` · Approve → `eir_approved` or `approved` · Phase 11 → library + `closed`
 */
const VALID_TRANSITIONS: Record<InspectionStatus, InspectionStatus[]> = {
  created: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["draft_completed"],
  /** Legacy: draft_completed → eir_submitted. FDA: draft_completed → approved_483. Supervisor may return draft to investigator → in_progress. */
  draft_completed: ["eir_submitted", "approved_483", "in_progress"],
  approved_483: ["sent_to_firm"],
  sent_to_firm: ["eir_assigned"],
  eir_assigned: ["eir_drafting"],
  eir_drafting: ["eir_submitted"],
  eir_submitted: ["under_review"],
  under_review: ["approved", "eir_approved", "rework_required"],
  approved: ["closed"],
  eir_approved: ["closed"],
  rejected: ["rework_required"],
  rework_required: ["in_progress", "eir_drafting"],
  closed: [],
};

export function canTransition(from: InspectionStatus, to: InspectionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function parseInspectionMetadataJson(metadataJson: string | null | undefined): Record<string, unknown> {
  try {
    return metadataJson ? (JSON.parse(metadataJson) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Set when supervisor approves Form FDA 483 (draft_completed → approved_483); drives EIR final status eir_approved. */
export function isFda483Pipeline(metadataJson: string | null | undefined): boolean {
  return Boolean(parseInspectionMetadataJson(metadataJson).fda_pipeline);
}

/** Default true on new inspections: use FDA 483 → EIR sequence UI and defer EIR preview until EIR drafting phase. */
export function isFdaSequencedWorkflow(metadataJson: string | null | undefined): boolean {
  return Boolean(parseInspectionMetadataJson(metadataJson).fda_sequenced_workflow);
}

export function getCurrentTurn(status: InspectionStatus): string {
  if (status === "approved" || status === "eir_approved" || status === "closed") return "Approved and Ready to Publish";
  if (status === "rework_required") return "Rework Required by Investigator";
  if (status === "eir_submitted" || status === "under_review") return "Waiting for Supervisor Review";
  if (status === "draft_completed") {
    return "FDA 483 draft complete — awaiting supervisor approval or return for revision";
  }
  if (status === "approved_483") return "Waiting for Supervisor — Send 483 to Firm";
  if (status === "sent_to_firm") return "Waiting for Supervisor — Assign EIR Drafting";
  if (status === "eir_assigned") return "Waiting for Investigator — Start EIR Draft";
  if (status === "eir_drafting") return "Waiting for Investigator — Draft and Submit EIR";
  return "Waiting for Investigator";
}

export async function createInspection(input: {
  title: string;
  firmName: string;
  feiNumber: string;
  establishmentType?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  districtOffice?: string;
  inspectionStart?: string;
  inspectionEnd?: string;
  regulatoryBasis?: string;
  createdBy: string;
  /** Default true: FDA 483→EIR workflow bar + defer EIR preview until eir_drafting. Set false for legacy-only inspections. */
  fdaSequencedWorkflow?: boolean;
}): Promise<InspectionRecord> {
  await ensureAuthTables();
  const fdaSeq = input.fdaSequencedWorkflow !== false;
  const metadataJson = JSON.stringify({ fda_sequenced_workflow: fdaSeq });
  const result = await pool.query<InspectionRecord>(
    `INSERT INTO inspections (title, firm_name, fei_number, establishment_type, street_address, city, state, zip_code, country, district_office, inspection_start, inspection_end, regulatory_basis, status, created_by, metadata_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'created',$14,$15)
     RETURNING *`,
    [
      input.title,
      input.firmName,
      input.feiNumber,
      input.establishmentType || "",
      input.streetAddress || "",
      input.city || "",
      input.state || "",
      input.zipCode || "",
      input.country || "United States",
      input.districtOffice || "",
      input.inspectionStart || null,
      input.inspectionEnd || null,
      input.regulatoryBasis || "",
      input.createdBy,
      metadataJson,
    ]
  );
  const inspection = result.rows[0];
  await logWorkflowAction(inspection.id, "CREATED", input.createdBy, "Inspection created", null, "created");
  return inspection;
}

export async function assignInspection(
  inspectionId: string,
  assignedTo: string,
  performedBy: string,
  comments: string = ""
): Promise<InspectionRecord> {
  await ensureAuthTables();
  const current = await getInspectionById(inspectionId);
  if (!current) throw new Error("Inspection not found");
  if (!canTransition(current.status, "assigned")) {
    throw new Error(`Cannot assign inspection in status '${current.status}'`);
  }
  const result = await pool.query<InspectionRecord>(
    `UPDATE inspections SET assigned_to = $1, status = 'assigned', updated_at = NOW() WHERE id = $2 RETURNING *`,
    [assignedTo, inspectionId]
  );
  await logWorkflowAction(inspectionId, "ASSIGNED", performedBy, comments || `Assigned to investigator`, current.status, "assigned");
  await createNotification({
    userId: assignedTo,
    inspectionId,
    type: "ASSIGNED",
    title: "Inspection assigned",
    message: `${current.title} has been assigned to you.`,
  });
  return result.rows[0];
}

/** Assign EIR drafting after 483 sent to firm (sent_to_firm → eir_assigned). Supervisor only. */
export async function assignEirDrafting(
  inspectionId: string,
  assignedTo: string,
  performedBy: string,
  comments: string = ""
): Promise<InspectionRecord> {
  await ensureAuthTables();
  const current = await getInspectionById(inspectionId);
  if (!current) throw new Error("Inspection not found");
  if (!canTransition(current.status, "eir_assigned")) {
    throw new Error(`Cannot assign EIR drafting in status '${current.status}'`);
  }
  const result = await pool.query<InspectionRecord>(
    `UPDATE inspections SET assigned_to = $1, status = 'eir_assigned', updated_at = NOW() WHERE id = $2 RETURNING *`,
    [assignedTo, inspectionId]
  );
  const updated = result.rows[0];
  await logWorkflowAction(
    inspectionId,
    "EIR_ASSIGNED",
    performedBy,
    comments || "EIR drafting assigned to investigator",
    current.status,
    "eir_assigned"
  );
  await createNotification({
    userId: assignedTo,
    inspectionId,
    type: "ASSIGNED",
    title: "EIR drafting assigned",
    message: `${current.title}: you are assigned to draft the Establishment Inspection Report.`,
  });
  return updated;
}

export async function mergeInspectionMetadata(
  inspectionId: string,
  patch: Record<string, unknown>
): Promise<InspectionRecord> {
  await ensureAuthTables();
  const current = await getInspectionById(inspectionId);
  if (!current) throw new Error("Inspection not found");
  const meta = parseInspectionMetadataJson(current.metadata_json);
  const merged = { ...meta, ...patch };
  const result = await pool.query<InspectionRecord>(
    `UPDATE inspections SET metadata_json = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(merged), inspectionId]
  );
  return result.rows[0];
}

export async function transitionStatus(
  inspectionId: string,
  newStatus: InspectionStatus,
  performedBy: string,
  action: string,
  comments: string = ""
): Promise<InspectionRecord> {
  await ensureAuthTables();
  const current = await getInspectionById(inspectionId);
  if (!current) throw new Error("Inspection not found");
  if (!canTransition(current.status, newStatus)) {
    throw new Error(`Cannot transition from '${current.status}' to '${newStatus}'`);
  }
  const isTerminal = newStatus === "closed" || newStatus === "approved" || newStatus === "eir_approved";
  const result = await pool.query<InspectionRecord>(
    `UPDATE inspections SET status = $1, updated_at = NOW()${isTerminal ? ", completed_at = NOW()" : ""} WHERE id = $2 RETURNING *`,
    [newStatus, inspectionId]
  );
  const updated = result.rows[0];
  await logWorkflowAction(inspectionId, action, performedBy, comments, current.status, newStatus);
  await maybeSnapshotVersion(updated, performedBy, action, comments);
  await maybeCreateStatusNotifications(current, updated, action, performedBy, comments);
  return updated;
}

export async function updateInspectionData(
  inspectionId: string,
  data: {
    observations_json?: string;
    eir_json?: string;
    metadata_json?: string;
    raw_notes?: string;
    create_version?: boolean;
    version_type?: "DRAFT" | "SUBMITTED" | "REWORK" | "APPROVED";
    version_comments?: string;
    performed_by?: string;
  }
): Promise<InspectionRecord> {
  await ensureAuthTables();
  const sets: string[] = ["updated_at = NOW()"];
  const vals: unknown[] = [];
  let idx = 1;
  if (data.observations_json !== undefined) { sets.push(`observations_json = $${idx}`); vals.push(data.observations_json); idx++; }
  if (data.eir_json !== undefined) { sets.push(`eir_json = $${idx}`); vals.push(data.eir_json); idx++; }
  if (data.metadata_json !== undefined) { sets.push(`metadata_json = $${idx}`); vals.push(data.metadata_json); idx++; }
  if (data.raw_notes !== undefined) { sets.push(`raw_notes = $${idx}`); vals.push(data.raw_notes); idx++; }
  vals.push(inspectionId);
  const result = await pool.query<InspectionRecord>(
    `UPDATE inspections SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    vals
  );
  const inspection = result.rows[0];
  if (inspection && data.create_version && data.performed_by) {
    await saveVersionSnapshot(
      inspectionId,
      data.performed_by,
      data.version_type || "DRAFT",
      data.version_comments || "Draft updated"
    );
  }
  return inspection;
}

export async function getInspectionById(id: string): Promise<InspectionRecord | null> {
  await ensureAuthTables();
  const result = await pool.query<InspectionRecord>(
    `SELECT i.*,
            (cu.first_name || ' ' || cu.last_name) AS creator_name,
            (au.first_name || ' ' || au.last_name) AS assignee_name
     FROM inspections i
     LEFT JOIN users cu ON cu.id = i.created_by
     LEFT JOIN users au ON au.id = i.assigned_to
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getInspectionsByUser(userId: string): Promise<InspectionRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<InspectionRecord>(
    `SELECT i.*,
            (cu.first_name || ' ' || cu.last_name) AS creator_name,
            (au.first_name || ' ' || au.last_name) AS assignee_name
     FROM inspections i
     LEFT JOIN users cu ON cu.id = i.created_by
     LEFT JOIN users au ON au.id = i.assigned_to
     WHERE i.assigned_to = $1
     ORDER BY i.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getAllInspections(statusFilter?: string): Promise<InspectionRecord[]> {
  await ensureAuthTables();
  let query = `SELECT i.*,
                      (cu.first_name || ' ' || cu.last_name) AS creator_name,
                      (au.first_name || ' ' || au.last_name) AS assignee_name
               FROM inspections i
               LEFT JOIN users cu ON cu.id = i.created_by
               LEFT JOIN users au ON au.id = i.assigned_to`;
  const params: string[] = [];
  if (statusFilter) {
    query += ` WHERE i.status = $1`;
    params.push(statusFilter);
  }
  query += ` ORDER BY i.updated_at DESC`;
  const result = await pool.query<InspectionRecord>(query, params);
  return result.rows;
}

export async function getWorkflowLogs(inspectionId: string): Promise<WorkflowLogRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<WorkflowLogRecord>(
    `SELECT wl.*, (u.first_name || ' ' || u.last_name) AS performer_name
     FROM inspection_workflow_logs wl
     LEFT JOIN users u ON u.id = wl.performed_by
     WHERE wl.inspection_id = $1
     ORDER BY wl.created_at ASC`,
    [inspectionId]
  );
  return result.rows;
}

export async function createReview(
  inspectionId: string,
  reviewerId: string,
  decision: "approved" | "rework_required",
  comments: string,
  signature?: {
    signatureType?: string;
    signatureText?: string;
    signatureImage?: string;
    signedName?: string;
    signedAt?: string;
  }
): Promise<void> {
  await ensureAuthTables();
  if (signature) {
    await saveUserSignatureProfile(reviewerId, signature);
  }
  await pool.query(
    `INSERT INTO inspection_reviews (inspection_id, reviewer_id, decision, comments) VALUES ($1, $2, $3, $4)`,
    [inspectionId, reviewerId, decision, comments]
  );
  const action = decision === "approved" ? "APPROVED" : "REJECTED";
  const inspection = await getInspectionById(inspectionId);
  if (!inspection) throw new Error("Inspection not found");
  const approvedTarget: InspectionStatus =
    decision === "approved" &&
    (isFda483Pipeline(inspection.metadata_json) || isFdaSequencedWorkflow(inspection.metadata_json))
      ? "eir_approved"
      : "approved";
  await transitionStatus(
    inspectionId,
    decision === "approved" ? approvedTarget : "rework_required",
    reviewerId,
    action,
    comments
  );
  if (decision === "approved") {
    await publishInspectionToLibrary(inspectionId, reviewerId);
  }
}

export async function addInspectionComment(
  inspectionId: string,
  authorId: string,
  authorRole: UserRole,
  comment: string
): Promise<InspectionCommentRecord> {
  await ensureAuthTables();
  const result = await pool.query<InspectionCommentRecord>(
    `INSERT INTO inspection_comments (inspection_id, author_id, author_role, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [inspectionId, authorId, authorRole, comment]
  );
  const commentRow = result.rows[0];
  await logWorkflowAction(inspectionId, "COMMENT_ADDED", authorId, comment, null, "comment");
  const inspection = await getInspectionById(inspectionId);
  if (inspection) {
    const targetUserId = authorRole === "supervisor" ? inspection.assigned_to : inspection.created_by;
    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        inspectionId,
        type: "COMMENT_ADDED",
        title: "New review comment",
        message: `A new comment was added on ${inspection.title}.`,
      });
    }
  }
  return commentRow;
}

export async function getInspectionComments(inspectionId: string): Promise<InspectionCommentRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<InspectionCommentRecord>(
    `SELECT c.*, (u.first_name || ' ' || u.last_name) AS author_name
     FROM inspection_comments c
     LEFT JOIN users u ON u.id = c.author_id
     WHERE c.inspection_id = $1
     ORDER BY c.created_at ASC`,
    [inspectionId]
  );
  return result.rows;
}

export async function createNotification(input: {
  userId: string;
  inspectionId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
}) {
  await ensureAuthTables();
  await pool.query(
    `INSERT INTO notifications (user_id, inspection_id, title, message, type, is_read)
     VALUES ($1, $2, $3, $4, $5, FALSE)`,
    [input.userId, input.inspectionId ?? null, input.title, input.message, input.type]
  );
}

export async function getNotifications(userId: string): Promise<NotificationRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<NotificationRecord>(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [userId]
  );
  return result.rows;
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await ensureAuthTables();
  await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, [
    notificationId,
    userId,
  ]);
}

export async function markAllNotificationsRead(userId: string) {
  await ensureAuthTables();
  await pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [userId]);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  await ensureAuthTables();
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return Number(result.rows[0]?.count || "0");
}

export async function saveUserSignatureProfile(
  userId: string,
  data: {
    signatureType?: string;
    signatureText?: string;
    signatureImage?: string;
    signedName?: string;
    signedAt?: string;
  }
) {
  await ensureAuthTables();
  await pool.query(
    `INSERT INTO user_profiles (user_id, signature_type, signature_text, signature_image, signed_name, signature_updated_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       signature_type = EXCLUDED.signature_type,
       signature_text = EXCLUDED.signature_text,
       signature_image = EXCLUDED.signature_image,
       signed_name = EXCLUDED.signed_name,
       signature_updated_at = NOW(),
       updated_at = NOW()`,
    [
      userId,
      data.signatureType || null,
      data.signatureText || null,
      data.signatureImage || null,
      data.signedName || null,
    ]
  );
}

export async function getUserSignatureProfile(userId: string): Promise<UserSignatureProfile | null> {
  await ensureAuthTables();
  const result = await pool.query<UserSignatureProfile>(
    `SELECT signature_type, signature_text, signature_image, signed_name, signature_updated_at
     FROM user_profiles
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function saveVersionSnapshot(
  inspectionId: string,
  createdBy: string,
  versionType: "DRAFT" | "SUBMITTED" | "REWORK" | "APPROVED",
  comments: string
) {
  await ensureAuthTables();
  const inspection = await getInspectionById(inspectionId);
  if (!inspection) return;
  const nextVersion = await getNextVersionNumber(inspectionId);
  const payload = JSON.stringify({
    metadata: safeJsonParse(inspection.metadata_json, {}),
    observations: safeJsonParse(inspection.observations_json, []),
    eir: safeJsonParse(inspection.eir_json, {}),
    raw_notes: inspection.raw_notes,
    status: inspection.status,
  });
  await pool.query(
    `INSERT INTO inspection_document_versions
      (inspection_id, version_number, created_by, version_type, comments_snapshot, payload_json)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [inspectionId, nextVersion, createdBy, versionType, comments, payload]
  );
}

/**
 * Best URL to show uploaded / archived evidence as PDF (version snapshot, then library final).
 * Paths may be app-relative (e.g. `/uploads/...`) or absolute http(s).
 */
export async function getBestPdfUrlForInspection(inspectionId: string): Promise<string | null> {
  await ensureAuthTables();
  const v = await pool.query<{ file_pdf_path: string }>(
    `SELECT file_pdf_path FROM inspection_document_versions
     WHERE inspection_id = $1 AND COALESCE(TRIM(file_pdf_path), '') <> ''
     ORDER BY version_number DESC LIMIT 1`,
    [inspectionId]
  );
  const vPath = v.rows[0]?.file_pdf_path?.trim();
  if (vPath) return normalizeEvidencePdfUrl(vPath);
  const lib = await pool.query<{ final_pdf_path: string }>(
    `SELECT final_pdf_path FROM document_library_records
     WHERE inspection_id = $1 AND COALESCE(TRIM(final_pdf_path), '') <> ''
     ORDER BY COALESCE(updated_at, approved_at, created_at) DESC LIMIT 1`,
    [inspectionId]
  );
  const lPath = lib.rows[0]?.final_pdf_path?.trim();
  if (lPath) return normalizeEvidencePdfUrl(lPath);
  return null;
}

function normalizeEvidencePdfUrl(p: string): string {
  const t = p.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return t;
  return `/${t.replace(/\\/g, "/")}`;
}

export async function getInspectionVersions(inspectionId: string): Promise<InspectionDocumentVersionRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<InspectionDocumentVersionRecord>(
    `SELECT v.*, (u.first_name || ' ' || u.last_name) AS creator_name
     FROM inspection_document_versions v
     LEFT JOIN users u ON u.id = v.created_by
     WHERE v.inspection_id = $1
     ORDER BY v.version_number DESC`,
    [inspectionId]
  );
  return result.rows;
}

export type AiRunRecord = {
  id: string;
  inspection_id: string;
  user_id: string | null;
  run_type: string;
  model: string | null;
  doc_id: string | null;
  input_summary: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  inspection_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
  actor_name?: string | null;
};

export type DocumentReviewCommentRecord = {
  id: string;
  inspection_id: string;
  author_id: string;
  document_kind: string;
  body: string;
  page_number: number | null;
  created_at: string;
  author_name?: string | null;
};

export type DocumentReviewSignatureRecord = {
  id: string;
  inspection_id: string;
  signer_id: string;
  signer_name: string;
  decision: string;
  signed_at: string;
  signature_note: string | null;
};

export async function insertAiRun(input: {
  inspectionId: string;
  userId: string;
  runType: string;
  model?: string | null;
  docId?: string | null;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
}): Promise<void> {
  await ensureAuthTables();
  await pool.query(
    `INSERT INTO ai_runs (inspection_id, user_id, run_type, model, doc_id, input_summary, output_summary)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [
      input.inspectionId,
      input.userId,
      input.runType,
      input.model ?? null,
      input.docId ?? null,
      JSON.stringify(input.inputSummary ?? {}),
      JSON.stringify(input.outputSummary ?? {}),
    ]
  );
}

export async function insertAuditLog(input: {
  inspectionId: string;
  userId: string | null;
  action: string;
  entityType?: string | null;
  changes?: Record<string, unknown>;
}): Promise<void> {
  await ensureAuthTables();
  await pool.query(
    `INSERT INTO audit_logs (inspection_id, user_id, action, entity_type, changes)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      input.inspectionId,
      input.userId,
      input.action,
      input.entityType ?? null,
      JSON.stringify(input.changes ?? {}),
    ]
  );
}

export async function listAiRunsForInspection(inspectionId: string): Promise<AiRunRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<AiRunRecord>(
    `SELECT id, inspection_id, user_id, run_type, model, doc_id, input_summary, output_summary, created_at::text
     FROM ai_runs WHERE inspection_id = $1 ORDER BY created_at ASC`,
    [inspectionId]
  );
  return result.rows;
}

export async function listSupplementalAuditLogs(inspectionId: string): Promise<AuditLogRow[]> {
  await ensureAuthTables();
  const result = await pool.query<AuditLogRow>(
    `SELECT a.id, a.inspection_id, a.user_id, a.action, a.entity_type, a.changes, a.created_at::text,
            (u.first_name || ' ' || u.last_name) AS actor_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.inspection_id = $1
     ORDER BY a.created_at ASC`,
    [inspectionId]
  );
  return result.rows;
}

export async function listDocumentReviewComments(inspectionId: string): Promise<DocumentReviewCommentRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<DocumentReviewCommentRecord>(
    `SELECT c.id, c.inspection_id, c.author_id, c.document_kind, c.body, c.page_number, c.created_at::text,
            (u.first_name || ' ' || u.last_name) AS author_name
     FROM document_review_comments c
     LEFT JOIN users u ON u.id = c.author_id
     WHERE c.inspection_id = $1
     ORDER BY c.created_at ASC`,
    [inspectionId]
  );
  return result.rows;
}

export async function addDocumentReviewComment(input: {
  inspectionId: string;
  authorId: string;
  body: string;
  documentKind?: string;
  pageNumber?: number | null;
}): Promise<DocumentReviewCommentRecord> {
  await ensureAuthTables();
  const result = await pool.query<DocumentReviewCommentRecord>(
    `INSERT INTO document_review_comments (inspection_id, author_id, document_kind, body, page_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, inspection_id, author_id, document_kind, body, page_number, created_at::text`,
    [
      input.inspectionId,
      input.authorId,
      input.documentKind ?? "483",
      input.body,
      input.pageNumber ?? null,
    ]
  );
  return result.rows[0];
}

export async function addDocumentReviewSignature(input: {
  inspectionId: string;
  signerId: string;
  signerName: string;
  decision: "approve" | "reject";
  signatureNote?: string | null;
}): Promise<DocumentReviewSignatureRecord> {
  await ensureAuthTables();
  const result = await pool.query<DocumentReviewSignatureRecord>(
    `INSERT INTO document_review_signatures (inspection_id, signer_id, signer_name, decision, signature_note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, inspection_id, signer_id, signer_name, decision, signed_at::text, signature_note`,
    [
      input.inspectionId,
      input.signerId,
      input.signerName,
      input.decision,
      input.signatureNote ?? null,
    ]
  );
  await insertAuditLog({
    inspectionId: input.inspectionId,
    userId: input.signerId,
    action: `DOCUMENT_REVIEW_${input.decision.toUpperCase()}`,
    entityType: "document_review",
    changes: { signer_name: input.signerName },
  });
  return result.rows[0];
}

export async function listDocumentReviewSignatures(inspectionId: string): Promise<DocumentReviewSignatureRecord[]> {
  await ensureAuthTables();
  const result = await pool.query<DocumentReviewSignatureRecord>(
    `SELECT id, inspection_id, signer_id, signer_name, decision, signed_at::text, signature_note
     FROM document_review_signatures WHERE inspection_id = $1 ORDER BY signed_at ASC`,
    [inspectionId]
  );
  return result.rows;
}

export async function listInspectionReviewsForAudit(inspectionId: string) {
  await ensureAuthTables();
  const result = await pool.query<{
    id: string;
    inspection_id: string;
    reviewer_id: string;
    decision: string;
    comments: string;
    created_at: string;
    reviewer_name: string | null;
  }>(
    `SELECT r.id, r.inspection_id, r.reviewer_id, r.decision, r.comments, r.created_at::text,
            (u.first_name || ' ' || u.last_name) AS reviewer_name
     FROM inspection_reviews r
     LEFT JOIN users u ON u.id = r.reviewer_id
     WHERE r.inspection_id = $1
     ORDER BY r.created_at ASC`,
    [inspectionId]
  );
  return result.rows;
}

export async function listApprovedDocuments(filters?: {
  year?: number;
  status?: string;
  investigatorId?: string;
  supervisorId?: string;
}): Promise<DocumentLibraryRecord[]> {
  await ensureAuthTables();
  const clauses: string[] = [];
  const values: Array<string | number> = [];
  if (filters?.year) {
    clauses.push(`archived_year = $${values.length + 1}`);
    values.push(filters.year);
  }
  if (filters?.status) {
    clauses.push(`status = $${values.length + 1}`);
    values.push(filters.status);
  }
  if (filters?.investigatorId) {
    clauses.push(`investigator_id = $${values.length + 1}`);
    values.push(filters.investigatorId);
  }
  if (filters?.supervisorId) {
    clauses.push(`supervisor_id = $${values.length + 1}`);
    values.push(filters.supervisorId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query<DocumentLibraryRecord>(
    `SELECT d.*,
            (iu.first_name || ' ' || iu.last_name) AS investigator_name,
            (su.first_name || ' ' || su.last_name) AS supervisor_name
     FROM document_library_records d
     LEFT JOIN users iu ON iu.id = d.investigator_id
     LEFT JOIN users su ON su.id = d.supervisor_id
     ${where}
     ORDER BY d.approved_at DESC`,
    values
  );
  return result.rows;
}

export async function getApprovedDocument(documentId: string): Promise<DocumentLibraryRecord | null> {
  await ensureAuthTables();
  const result = await pool.query<DocumentLibraryRecord>(
    `SELECT d.*,
            (iu.first_name || ' ' || iu.last_name) AS investigator_name,
            (su.first_name || ' ' || su.last_name) AS supervisor_name
     FROM document_library_records d
     LEFT JOIN users iu ON iu.id = d.investigator_id
     LEFT JOIN users su ON su.id = d.supervisor_id
     WHERE d.id = $1`,
    [documentId]
  );
  return result.rows[0] ?? null;
}

/** Counts for dashboard: published rows plus approved rows ready to publish (mutually exclusive statuses). */
export async function getDocumentPublishSummary(): Promise<{
  published: number;
  readyToPublish: number;
  total: number;
}> {
  await ensureAuthTables();
  const result = await pool.query<{ published: string | null; ready_to_publish: string | null }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'published')::text AS published,
       COUNT(*) FILTER (WHERE status = 'ready_to_publish' AND COALESCE(publish_ready, TRUE))::text AS ready_to_publish
     FROM document_library_records`
  );
  const row = result.rows[0];
  const published = Number(row?.published ?? 0);
  const readyToPublish = Number(row?.ready_to_publish ?? 0);
  return { published, readyToPublish, total: published + readyToPublish };
}

/**
 * Inspections still in the drafting pipeline: created or assigned through supervisor review / rework,
 * excluding approved, closed, and rejected.
 */
export async function getActiveDraftCount(): Promise<number> {
  await ensureAuthTables();
  const result = await pool.query<{ c: string | null }>(
    `SELECT COUNT(*)::text AS c FROM inspections
     WHERE status IN (
       'created', 'assigned', 'in_progress', 'draft_completed',
       'approved_483', 'sent_to_firm', 'eir_assigned', 'eir_drafting',
       'eir_submitted', 'under_review', 'rework_required'
     )`
  );
  return Number(result.rows[0]?.c ?? 0);
}

export async function reopenApprovedDocumentForNextYear(
  documentId: string,
  createdBy: string,
  assignedTo?: string | null
): Promise<InspectionRecord> {
  await ensureAuthTables();
  const doc = await getApprovedDocument(documentId);
  if (!doc) throw new Error("Approved document not found");
  const metadata = safeJsonParse<Record<string, string | number | boolean | null>>(doc.final_metadata_json, {});
  const currentYear = new Date().getFullYear();
  const inspection = await createInspection({
    title: `${doc.title} (${currentYear})`,
    firmName: String(metadata.firm_name || ""),
    feiNumber: String(metadata.fei_number || ""),
    establishmentType: String(metadata.establishment_type || ""),
    streetAddress: String(metadata.street_address || ""),
    city: String(metadata.city || ""),
    state: String(metadata.state || ""),
    zipCode: String(metadata.zip_code || ""),
    country: String(metadata.country || "United States"),
    districtOffice: String(metadata.district_office || ""),
    inspectionStart: "",
    inspectionEnd: "",
    regulatoryBasis: "",
    createdBy,
  });
  if (assignedTo) {
    await assignInspection(inspection.id, assignedTo, createdBy, `Reopened from approved document ${doc.title}`);
  }
  await logWorkflowAction(inspection.id, "REOPENED_FOR_NEXT_YEAR", createdBy, `Reopened from document library record ${documentId}`, null, inspection.status);
  return inspection;
}

async function publishInspectionToLibrary(inspectionId: string, supervisorId: string) {
  const inspection = await getInspectionById(inspectionId);
  if (!inspection) return;
  const comments = await getInspectionComments(inspectionId);
  const supervisorSignature = await getUserSignatureProfile(supervisorId);
  const investigatorSignature = inspection.assigned_to
    ? await getUserSignatureProfile(inspection.assigned_to)
    : null;
  await saveVersionSnapshot(inspectionId, supervisorId, "APPROVED", "Final approved version");
  const result = await pool.query(
    `INSERT INTO document_library_records
      (inspection_id, title, status, approved_at, investigator_id, supervisor_id, publish_ready, archived_year,
       final_metadata_json, final_observations_json, final_eir_json, signatures_json, comments_snapshot_json, updated_at)
     VALUES ($1,$2,'ready_to_publish',NOW(),$3,$4,TRUE,$5,$6,$7,$8,$9,$10,NOW())
     RETURNING id`,
    [
      inspection.id,
      inspection.title,
      inspection.assigned_to,
      supervisorId,
      new Date().getFullYear(),
      inspection.metadata_json || "{}",
      inspection.observations_json || "[]",
      inspection.eir_json || "{}",
      JSON.stringify({
        investigator: investigatorSignature,
        supervisor: supervisorSignature,
      }),
      JSON.stringify(comments),
    ]
  );
  if (inspection.assigned_to) {
    await createNotification({
      userId: inspection.assigned_to,
      inspectionId,
      type: "APPROVED",
      title: "Inspection approved",
      message: `${inspection.title} has been approved by the supervisor.`,
    });
    await createNotification({
      userId: inspection.assigned_to,
      inspectionId,
      type: "DOCUMENT_READY",
      title: "Approved document ready",
      message: `${inspection.title} is now available in the approved document library.`,
    });
  }
  await createNotification({
    userId: supervisorId,
    inspectionId,
    type: "DOCUMENT_READY",
    title: "Approved document archived",
    message: `${inspection.title} has been saved to the approved document library.`,
  });
  await logWorkflowAction(
    inspectionId,
    "DOCUMENT_READY",
    supervisorId,
    `Approved document archived as ${result.rows[0]?.id ?? "library record"}`,
    inspection.status,
    inspection.status
  );
}

async function maybeSnapshotVersion(
  inspection: InspectionRecord,
  performedBy: string,
  action: string,
  comments: string
) {
  if (action === "DRAFT_COMPLETED") {
    await saveVersionSnapshot(inspection.id, performedBy, "DRAFT", comments || "Draft completed");
  }
  if (action === "EIR_SUBMITTED") {
    await saveVersionSnapshot(inspection.id, performedBy, "SUBMITTED", comments || "Submitted for supervisor review");
  }
  if (action === "REJECTED") {
    await saveVersionSnapshot(inspection.id, performedBy, "REWORK", comments || "Returned for rework");
  }
  if (action === "483_RETURNED_FOR_REVISION") {
    await saveVersionSnapshot(
      inspection.id,
      performedBy,
      "REWORK",
      comments || "FDA 483 returned to investigator for revision"
    );
  }
}

async function maybeCreateStatusNotifications(
  previous: InspectionRecord,
  updated: InspectionRecord,
  action: string,
  performedBy: string,
  comments: string
) {
  if (action === "EIR_SUBMITTED") {
    await createNotification({
      userId: previous.created_by,
      inspectionId: previous.id,
      type: "SUBMITTED_FOR_REVIEW",
      title: "Inspection submitted for review",
      message: `${previous.title} is ready for supervisor review.`,
    });
  }
  if (action === "REVIEW_STARTED" && previous.assigned_to) {
    await createNotification({
      userId: previous.assigned_to,
      inspectionId: previous.id,
      type: "REVIEW_STARTED",
      title: "Supervisor review started",
      message: `${previous.title} is currently under supervisor review.`,
    });
  }
  if (action === "REJECTED" && previous.assigned_to) {
    await createNotification({
      userId: previous.assigned_to,
      inspectionId: previous.id,
      type: "REWORK_REQUESTED",
      title: "Rework requested",
      message: comments || `${previous.title} was returned for rework.`,
    });
  }
  if (action === "483_RETURNED_FOR_REVISION" && previous.assigned_to) {
    await createNotification({
      userId: previous.assigned_to,
      inspectionId: previous.id,
      type: "REWORK_REQUESTED",
      title: "FDA 483 returned for revision",
      message: comments || `${previous.title}: supervisor returned the 483 draft for further work.`,
    });
  }
  if (action === "STARTED" && previous.created_by !== performedBy) {
    await createNotification({
      userId: previous.created_by,
      inspectionId: previous.id,
      type: "COMMENT_ADDED",
      title: "Drafting started",
      message: `${previous.title} has been opened and drafting is in progress.`,
    });
  }
  if (updated.status === "in_progress" && previous.status === "rework_required" && previous.created_by !== performedBy) {
    await createNotification({
      userId: previous.created_by,
      inspectionId: previous.id,
      type: "COMMENT_ADDED",
      title: "Investigator resumed rework",
      message: `${previous.title} has been updated after rework request.`,
    });
  }
}

async function getNextVersionNumber(inspectionId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COALESCE(MAX(version_number), 0)::text AS count FROM inspection_document_versions WHERE inspection_id = $1`,
    [inspectionId]
  );
  return Number(result.rows[0]?.count || "0") + 1;
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function logWorkflowAction(
  inspectionId: string,
  action: string,
  performedBy: string,
  comments: string,
  previousStatus: string | null,
  newStatus: string
): Promise<void> {
  await pool.query(
    `INSERT INTO inspection_workflow_logs (inspection_id, action, performed_by, comments, previous_status, new_status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [inspectionId, action, performedBy, comments, previousStatus, newStatus]
  );
}
