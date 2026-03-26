"use client";

import type { InspectionMetadata, DraftObservation } from '@/types/inspection';

interface Form483PreviewProps {
  metadata: InspectionMetadata;
  observations: DraftObservation[];
  watermark?: 'DRAFT' | 'FINAL' | null;
}

// Match backend: Times New Roman, 10pt body, 9pt labels, 12pt header title
const FONT_FAMILY = '"Times New Roman", Times, serif';
const FONT_SIZE = '10pt';
const LABEL_SIZE = '9pt';
const HEADER_TITLE_SIZE = '12pt';

const cellStyle: React.CSSProperties = {
  border: '1px solid black',
  padding: '4px 6px',
  verticalAlign: 'top',
  fontSize: FONT_SIZE,
  fontFamily: FONT_FAMILY,
};

const labelStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  fontSize: LABEL_SIZE,
};

function formatDateIssued() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

export default function Form483Preview({
  metadata,
  observations,
  watermark,
}: Form483PreviewProps) {
  const cityStateZip = [metadata.city, metadata.state, metadata.zip_code]
    .filter(Boolean)
    .join(', ');
  const establishmentType = (metadata.establishment_type || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const reportIssued = metadata.report_issued_to_title
    ? `${metadata.report_issued_to_name}, ${metadata.report_issued_to_title}`
    : metadata.report_issued_to_name;
  const invNames = (metadata.investigators || []).map((inv) => inv.name || '').filter(Boolean).join(', ');
  const invNamesAndTitles = (metadata.investigators || []).map((inv) => `${inv.name || ''}, ${inv.title || ''}`).filter(Boolean);
  const investigatorDisplay = metadata.investigator_signed_name || invNames;
  const supervisorDisplay = metadata.supervisor_signed_name || '';

  return (
    <div
      className="printable-483 relative mx-auto bg-white"
      style={{
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE,
        width: '8.5in',
        minHeight: '11in',
        padding: '0.375in',
        lineHeight: 1.4,
      }}
    >
      {watermark && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          <span
            style={{
              fontSize: '120pt',
              fontWeight: 'bold',
              color: watermark === 'DRAFT' ? 'rgba(220,38,38,0.15)' : 'rgba(22,163,74,0.15)',
              transform: 'rotate(-35deg)',
              userSelect: 'none',
            }}
          >
            {watermark}
          </span>
        </div>
      )}

      {/* Single table matching backend: 3 columns, same structure as .docx */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '2px solid black',
        }}
      >
        <tbody>
          {/* Row 0: Title (merged) — matches backend header row 0 */}
          <tr>
            <td
              colSpan={3}
              style={{
                ...cellStyle,
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: HEADER_TITLE_SIZE,
                borderBottom: '1px solid black',
              }}
            >
              <div>DEPARTMENT OF HEALTH AND HUMAN SERVICES</div>
              <div>Food and Drug Administration</div>
            </td>
          </tr>

          {/* Row 1: District Office (2 cols) | Dates + FEI (1 col) */}
          <tr>
            <td colSpan={2} style={labelStyle}>
              DISTRICT OFFICE ADDRESS AND PHONE NUMBER:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{metadata.district_office}</div>
            </td>
            <td style={labelStyle}>
              DATE(S) OF INSPECTION:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>
                {metadata.inspection_start} to {metadata.inspection_end}
              </div>
              FEI NUMBER:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{metadata.fei_number}</div>
            </td>
          </tr>

          {/* Row 2: Name and title (merged) */}
          <tr>
            <td colSpan={3} style={labelStyle}>
              NAME AND TITLE OF INDIVIDUAL TO WHOM REPORT IS ISSUED:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{reportIssued}</div>
            </td>
          </tr>

          {/* Row 3: Firm name (2 cols) | Street address (1 col) */}
          <tr>
            <td colSpan={2} style={labelStyle}>
              FIRM NAME:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{metadata.firm_name}</div>
            </td>
            <td style={labelStyle}>
              STREET ADDRESS:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{metadata.street_address}</div>
            </td>
          </tr>

          {/* Row 4: City/State/ZIP | Country | Type (3 cols) */}
          <tr>
            <td style={labelStyle}>
              CITY, STATE AND ZIP CODE:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{cityStateZip}</div>
            </td>
            <td style={labelStyle}>
              COUNTRY:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{metadata.country}</div>
            </td>
            <td style={labelStyle}>
              TYPE OF ESTABLISHMENT INSPECTED:
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{establishmentType}</div>
            </td>
          </tr>

          {/* Row 5: "During an inspection..." (merged) */}
          <tr>
            <td
              colSpan={3}
              style={{
                ...cellStyle,
                borderBottom: '2px solid black',
                paddingTop: '6px',
                paddingBottom: '6px',
              }}
            >
              During an inspection of your establishment, I (we) observed:
            </td>
          </tr>

          {/* Observation rows — same order as backend: label, body, citation, evidence, divider */}
          {observations.map((obs, i) => (
            <tr key={obs.id}>
              <td colSpan={3} style={{ ...cellStyle, paddingBottom: 0 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Observation {i + 1}:</div>
                <div style={{ marginBottom: '4px' }}>{obs.observation_text}</div>
                {obs.cfr_citation && (
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>[{obs.cfr_citation}]</div>
                )}
                {obs.evidence_list.length > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    {obs.evidence_list.map((ev, j) => (
                      <div key={j} style={{ marginLeft: '1em' }}>
                        {'  \u2022 '}
                        {ev}
                      </div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    borderBottom: '1px solid black',
                    marginTop: '6px',
                    marginBottom: 0,
                  }}
                />
              </td>
            </tr>
          ))}

          {observations.length === 0 && (
            <tr>
              <td colSpan={3} style={{ ...cellStyle, minHeight: '40px' }} />
            </tr>
          )}

          {/* Footer: Signature row (3 cols) — matches backend */}
          <tr>
            <td style={labelStyle}>
              INVESTIGATOR SIGNATURE:
              {metadata.investigator_signature_image ? (
                <div style={{ marginTop: '4px' }}>
                  <img src={metadata.investigator_signature_image} alt="Investigator signature" style={{ maxHeight: '42px', maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ fontWeight: 'normal', fontSize: '12pt', fontStyle: 'italic' }}>{metadata.investigator_signature_text || investigatorDisplay}</div>
              )}
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{investigatorDisplay}</div>
              {metadata.investigator_signed_at && (
                <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>Signed: {metadata.investigator_signed_at}</div>
              )}
            </td>
            <td style={labelStyle}>
              EMPLOYEE(S) NAME AND TITLE (Print or Type):
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>
                {invNamesAndTitles.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </td>
            <td style={labelStyle}>
              SUPERVISOR SIGNATURE / DATE ISSUED:
              {metadata.supervisor_signature_image ? (
                <div style={{ marginTop: '4px' }}>
                  <img src={metadata.supervisor_signature_image} alt="Supervisor signature" style={{ maxHeight: '42px', maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ fontWeight: 'normal', fontSize: '12pt', fontStyle: 'italic' }}>
                  {metadata.supervisor_signature_text || supervisorDisplay}
                </div>
              )}
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>{supervisorDisplay}</div>
              <div style={{ fontWeight: 'normal', fontSize: FONT_SIZE }}>
                {metadata.supervisor_signed_at || formatDateIssued()}
              </div>
            </td>
          </tr>

          {/* Footer: Form ID + Website — matches backend */}
          <tr>
            <td
              colSpan={3}
              style={{
                ...cellStyle,
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: LABEL_SIZE,
              }}
            >
              FORM FDA 483 (2/16)       Website: www.fda.gov/oc/industry
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


