import type { InspectionMetadata, DraftObservation } from '@/types/inspection';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details?: string;
}

export const mockInspections: InspectionMetadata[] = [
  {
    firm_name: 'Acme Pharmaceutical Inc.',
    fei_number: '3002808811',
    street_address: '1200 Industrial Blvd',
    city: 'Parsippany',
    state: 'NJ',
    zip_code: '07054',
    country: 'United States',
    establishment_type: 'Drug Manufacturer',
    inspection_start: '2025-03-10',
    inspection_end: '2025-03-21',
    district_office: 'New Jersey District',
    investigators: [
      { name: 'Dr. Sarah Chen', title: 'Lead Investigator' },
      { name: 'Mark Ramirez', title: 'Investigator' },
    ],
    report_issued_to_name: 'James Whitfield',
    report_issued_to_title: 'VP of Quality Assurance',
  },
  {
    firm_name: 'BioGenesis Laboratories LLC',
    fei_number: '1822456789',
    street_address: '450 Research Park Drive',
    city: 'Research Triangle Park',
    state: 'NC',
    zip_code: '27709',
    country: 'United States',
    establishment_type: 'Biologics Manufacturer',
    inspection_start: '2025-04-01',
    inspection_end: '2025-04-11',
    district_office: 'North Carolina District',
    investigators: [
      { name: 'Dr. Linda Park', title: 'Lead Investigator' },
    ],
    report_issued_to_name: 'Robert Nguyen',
    report_issued_to_title: 'Director of Manufacturing',
  },
  {
    firm_name: 'MedDevice Solutions Corp.',
    fei_number: '2134567890',
    street_address: '88 Technology Way',
    city: 'San Jose',
    state: 'CA',
    zip_code: '95134',
    country: 'United States',
    establishment_type: 'Medical Device Manufacturer',
    inspection_start: '2025-05-05',
    inspection_end: '2025-05-16',
    district_office: 'San Francisco District',
    investigators: [
      { name: 'Angela Torres', title: 'Lead Investigator' },
      { name: 'David Kim', title: 'Investigator' },
      { name: 'Priya Patel', title: 'Analyst' },
    ],
    report_issued_to_name: 'Susan Marshall',
    report_issued_to_title: 'Chief Quality Officer',
  },
];

export const mockObservations: DraftObservation[] = [
  {
    id: 'obs-001',
    observation_text:
      'There is no adequate system for monitoring environmental conditions in aseptic processing areas. Specifically, the firm failed to establish scientifically sound environmental monitoring programs to assess microbiological quality of the aseptic processing areas during production. No viable air sampling was performed during filling operations on the dates of March 12-14, 2025.',
    cfr_citation: '21 CFR 211.42(c)(10)',
    evidence_list: [
      'Environmental monitoring SOP (SOP-EM-042) last revised 01/2022 does not include viable air sampling requirements',
      'Batch records for lots L2025-0310 through L2025-0314 show no environmental monitoring data',
      'Interview with QA Manager on 03/15/2025 confirmed no viable air sampling program in place',
    ],
    confidence_score: 0.94,
    source_notes_excerpt:
      'Aseptic fill room (Room 302) – no settle plates observed during filling. QA Manager stated "we rely on non-viable particle counts only."',
    review_flags: [],
  },
  {
    id: 'obs-002',
    observation_text:
      'Procedures designed to prevent microbiological contamination of drug products purporting to be sterile are not followed. Operators were observed entering the aseptic core without performing proper gowning procedures, including failure to sanitize gloves prior to aseptic manipulations.',
    cfr_citation: '21 CFR 211.113(b)',
    evidence_list: [
      'Photographic evidence captured on 03/12/2025 showing operator entering ISO 5 area without glove sanitization',
      'Gowning qualification records for 3 operators were expired (last qualified >12 months ago)',
    ],
    confidence_score: 0.91,
    source_notes_excerpt:
      'Observed operator J. Martinez enter ISO 5 filling area at 10:42 AM without sanitizing gloves. Gowning qualification for Martinez expired 09/2024.',
    review_flags: [],
  },
  {
    id: 'obs-003',
    observation_text:
      'Laboratory controls do not include the establishment of scientifically sound and appropriate test procedures to assure that drug products conform to appropriate standards of identity, strength, quality, and purity. Specifically, the HPLC method used for potency testing of Product X has not been validated for accuracy and precision.',
    cfr_citation: '21 CFR 211.160(b)',
    evidence_list: [
      'Method validation report for HPLC assay method (AM-2019-056) lacks accuracy and precision studies',
      'OOS investigation #2025-017 linked to unvalidated method parameters',
      'QC Director acknowledged validation gaps during interview on 03/18/2025',
    ],
    confidence_score: 0.87,
    source_notes_excerpt:
      'Reviewed method validation package for AM-2019-056. No accuracy study (spike recovery) or intermediate precision data present. QC Dir. stated "we adopted the method from a compendial reference but did not perform full validation."',
    review_flags: ['Needs legal review'],
  },
  {
    id: 'obs-004',
    observation_text:
      'Written records of major equipment cleaning, maintenance, and use are not maintained. Cleaning logs for the tablet compression equipment (Fette P2090) show gaps from February 1 through February 28, 2025, during which multiple product changeovers occurred.',
    cfr_citation: '21 CFR 211.182',
    evidence_list: [
      'Equipment logbook for Fette P2090 (EQ-TC-005) — pages for February 2025 are blank',
      'Batch records confirm 4 product changeovers occurred in February 2025 on this equipment',
    ],
    confidence_score: 0.89,
    source_notes_excerpt:
      'Equipment logbook EQ-TC-005 reviewed on site. February pages completely blank. Production schedule confirms Lots A-101, B-204, A-108, C-301 ran on this press during the gap period.',
    review_flags: [],
  },
  {
    id: 'obs-005',
    observation_text:
      'Complaint handling procedures are deficient in that the firm failed to investigate all product complaints. A review of complaint records revealed that 14 out of 47 complaints received between January and March 2025 were closed without investigation, including 3 complaints alleging adverse patient reactions.',
    cfr_citation: '21 CFR 211.198',
    evidence_list: [
      'Complaint log extract showing 14 complaints marked "closed — no investigation required"',
      'Three complaints (#C-2025-008, #C-2025-021, #C-2025-039) allege adverse reactions but have no investigation records',
      'Complaint SOP (SOP-QA-011) does not define criteria for when investigation is required',
    ],
    confidence_score: 0.92,
    source_notes_excerpt:
      'Complaint log reviewed: 47 total complaints in Q1 2025. 14 closed without investigation. Complaint #C-2025-008 states "patient experienced severe rash after use" — no investigation initiated.',
    review_flags: [],
  },
];

export const sampleAuditTrail: AuditEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2025-03-10T09:00:00Z',
    action: 'Inspection created',
    user: 'Dr. Sarah Chen',
    details: 'Created inspection for Acme Pharmaceutical Inc. (FEI 3002808811)',
  },
  {
    id: 'audit-002',
    timestamp: '2025-03-10T09:15:00Z',
    action: 'Notes uploaded',
    user: 'Dr. Sarah Chen',
    details: 'Uploaded 3 field note documents (12 pages total)',
  },
  {
    id: 'audit-003',
    timestamp: '2025-03-10T09:20:00Z',
    action: 'Observations generated',
    user: 'System (AI)',
    details: 'Generated 5 draft observations from uploaded notes with RAG pipeline',
  },
  {
    id: 'audit-004',
    timestamp: '2025-03-15T14:30:00Z',
    action: 'Observation edited',
    user: 'Dr. Sarah Chen',
    details: 'Revised observation #3 — updated CFR citation and evidence list',
  },
  {
    id: 'audit-005',
    timestamp: '2025-03-16T10:00:00Z',
    action: 'Observation deleted',
    user: 'Mark Ramirez',
    details: 'Removed duplicate observation #6 after review',
  },
  {
    id: 'audit-006',
    timestamp: '2025-03-20T11:00:00Z',
    action: 'Document generated',
    user: 'System (AI)',
    details: 'Generated Form FDA 483 PDF draft with 5 observations',
  },
  {
    id: 'audit-007',
    timestamp: '2025-03-21T08:30:00Z',
    action: 'Signature captured',
    user: 'Dr. Sarah Chen',
    details: 'Lead investigator signature captured for Form FDA 483',
  },
  {
    id: 'audit-008',
    timestamp: '2025-03-21T09:00:00Z',
    action: 'Form published',
    user: 'Dr. Sarah Chen',
    details: 'Form FDA 483 published and issued to James Whitfield, VP of Quality Assurance',
  },
];

export const sampleData = {
  inspections: mockInspections,
  observations: mockObservations,
  auditTrail: sampleAuditTrail,
};

