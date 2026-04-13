import { type InspectionRecord, parseInspectionMetadataJson } from "@/lib/db/inspection-service";

/** Build FastAPI InspectionMetadata-shaped object for document / AI routes. */
export function buildInspectionMetadataPayload(inspection: InspectionRecord): Record<string, unknown> {
  const m = parseInspectionMetadataJson(inspection.metadata_json);
  return {
    firm_name: String(m.firm_name ?? inspection.firm_name ?? ""),
    fei_number: String(m.fei_number ?? inspection.fei_number ?? ""),
    street_address: String(m.street_address ?? inspection.street_address ?? ""),
    city: String(m.city ?? inspection.city ?? ""),
    state: String(m.state ?? inspection.state ?? ""),
    zip_code: String(m.zip_code ?? inspection.zip_code ?? ""),
    country: String(m.country ?? inspection.country ?? "United States"),
    establishment_type: String(m.establishment_type ?? inspection.establishment_type ?? ""),
    inspection_start: String(m.inspection_start ?? inspection.inspection_start ?? ""),
    inspection_end: String(m.inspection_end ?? inspection.inspection_end ?? ""),
    district_office: String(m.district_office ?? inspection.district_office ?? ""),
    investigators: Array.isArray(m.investigators) ? m.investigators : [],
    report_issued_to_name: String(m.report_issued_to_name ?? ""),
    report_issued_to_title: String(m.report_issued_to_title ?? ""),
    investigator_signature_type: String(m.investigator_signature_type ?? ""),
    investigator_signature_text: String(m.investigator_signature_text ?? ""),
    investigator_signature_image: String(m.investigator_signature_image ?? ""),
    investigator_signed_name: String(m.investigator_signed_name ?? ""),
    investigator_signed_at: String(m.investigator_signed_at ?? ""),
    supervisor_signature_type: String(m.supervisor_signature_type ?? ""),
    supervisor_signature_text: String(m.supervisor_signature_text ?? ""),
    supervisor_signature_image: String(m.supervisor_signature_image ?? ""),
    supervisor_signed_name: String(m.supervisor_signed_name ?? ""),
    supervisor_signed_at: String(m.supervisor_signed_at ?? ""),
  };
}

export function parseObservationsJson(json: string | null | undefined): unknown[] {
  try {
    const o = JSON.parse(json || "[]");
    return Array.isArray(o) ? o : [];
  } catch {
    return [];
  }
}
