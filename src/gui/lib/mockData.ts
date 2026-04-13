import {
  Inspection,
  Observation,
  Evidence,
  CFRCitation,
  Form483,
  ChecklistItem,
  DocumentSignature,
  AuditEvent,
  Investigator,
  ReferenceChunk,
} from "@/lib/types";

export const currentUser: Investigator = {
  id: "inv-001",
  name: "Sarah Chen",
  title: "Consumer Safety Officer",
  badgeNumber: "FDA-2847",
  districtOffice: "Dallas District Office",
};

const investigatorMartinez: Investigator = {
  id: "inv-002",
  name: "James Martinez",
  title: "Senior Investigator",
  badgeNumber: "FDA-3192",
  districtOffice: "Dallas District Office",
};

const investigatorPatel: Investigator = {
  id: "inv-003",
  name: "Priya Patel",
  title: "Consumer Safety Officer",
  badgeNumber: "FDA-4501",
  districtOffice: "San Francisco District Office",
};

const investigatorKimura: Investigator = {
  id: "inv-004",
  name: "David Kimura",
  title: "Compliance Officer",
  badgeNumber: "FDA-2063",
  districtOffice: "San Francisco District Office",
};

const investigatorNguyen: Investigator = {
  id: "inv-005",
  name: "Lisa Nguyen",
  title: "Senior Investigator",
  badgeNumber: "FDA-1758",
  districtOffice: "New York District Office",
};

const investigatorThompson: Investigator = {
  id: "inv-006",
  name: "Robert Thompson",
  title: "Consumer Safety Officer",
  badgeNumber: "FDA-3847",
  districtOffice: "New York District Office",
};

export const cfrCitations: CFRCitation[] = [
  {
    part: "211",
    section: "22",
    title: "Responsibilities of quality control unit",
    fullCitation: "21 CFR 211.22",
  },
  {
    part: "211",
    section: "42",
    title: "Design and construction features",
    fullCitation: "21 CFR 211.42",
  },
  {
    part: "211",
    section: "56",
    title: "Sanitation",
    fullCitation: "21 CFR 211.56",
  },
  {
    part: "211",
    section: "63",
    title: "Equipment design, size, and location",
    fullCitation: "21 CFR 211.63",
  },
  {
    part: "211",
    section: "68",
    title: "Automatic, mechanical, and electronic equipment",
    fullCitation: "21 CFR 211.68",
  },
  {
    part: "211",
    section: "100",
    title: "Written procedures; deviations",
    fullCitation: "21 CFR 211.100",
  },
  {
    part: "211",
    section: "113",
    title: "Control of microbiological contamination",
    fullCitation: "21 CFR 211.113",
  },
  {
    part: "211",
    section: "160",
    title: "General requirements - laboratory controls",
    fullCitation: "21 CFR 211.160",
  },
  {
    part: "211",
    section: "165",
    title: "Testing and release for distribution",
    fullCitation: "21 CFR 211.165",
  },
  {
    part: "211",
    section: "180",
    title: "General requirements - records and reports",
    fullCitation: "21 CFR 211.180",
  },
  {
    part: "211",
    section: "188",
    title: "Batch production and control records",
    fullCitation: "21 CFR 211.188",
  },
  {
    part: "211",
    section: "192",
    title: "Production record review",
    fullCitation: "21 CFR 211.192",
  },
  {
    part: "820",
    section: "22",
    title: "Quality audit",
    fullCitation: "21 CFR 820.22",
  },
  {
    part: "820",
    section: "30",
    title: "Design controls",
    fullCitation: "21 CFR 820.30",
  },
  {
    part: "820",
    section: "70",
    title: "Production and process controls",
    fullCitation: "21 CFR 820.70",
  },
  {
    part: "820",
    section: "90",
    title: "Nonconforming product",
    fullCitation: "21 CFR 820.90",
  },
  {
    part: "117",
    section: "126",
    title: "Food CGMP - process controls",
    fullCitation: "21 CFR 117.126",
  },
  {
    part: "117",
    section: "135",
    title: "Preventive controls",
    fullCitation: "21 CFR 117.135",
  },
  {
    part: "117",
    section: "145",
    title: "Monitoring",
    fullCitation: "21 CFR 117.145",
  },
  {
    part: "117",
    section: "155",
    title: "Corrective actions and corrections",
    fullCitation: "21 CFR 117.155",
  },
  {
    part: "211",
    section: "25",
    title: "Personnel qualifications",
    fullCitation: "21 CFR 211.25",
  },
  {
    part: "211",
    section: "67",
    title: "Equipment cleaning and maintenance",
    fullCitation: "21 CFR 211.67",
  },
  {
    part: "211",
    section: "84",
    title: "Testing and approval or rejection of components, drug product containers, and closures",
    fullCitation: "21 CFR 211.84",
  },
  {
    part: "820",
    section: "75",
    title: "Process validation",
    fullCitation: "21 CFR 820.75",
  },
  {
    part: "117",
    section: "165",
    title: "Verification",
    fullCitation: "21 CFR 117.165",
  },
];

const meridianObservation1: Observation = {
  id: "obs-001",
  number: 1,
  text: "The quality control unit failed to exercise its responsibility to ensure that adequate written procedures are established and followed for the review and approval of batch production records prior to release of drug product for distribution. Specifically, Batch Records #2024-1847, #2024-1852, and #2024-1860 for Metformin HCl 500mg tablets were released for distribution without documented evidence that the quality unit reviewed deviations noted during compression operations. The deviation log entries reference out-of-specification tablet hardness values ranging from 4.2 to 4.8 kP against a specification of 5.0–12.0 kP, yet no investigation was initiated, and no disposition decision was documented prior to release.",
  significance: "critical",
  evidence: [
    {
      id: "ev-001",
      description: "Batch Record #2024-1847 reviewed on 02/05/2025 — missing QC review signature on deviation page 14",
      attachments: [
        { id: "att-001", name: "batch-1847-deviation-page.pdf", type: "application/pdf", size: 245800, url: "/uploads/att-001-batch-1847-deviation.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-002",
      description: "Batch Record #2024-1852 reviewed on 02/05/2025 — compression deviation log shows OOS hardness values with no investigation reference",
      attachments: [
        { id: "att-002", name: "batch-1852-compression-log.pdf", type: "application/pdf", size: 189400, url: "/uploads/att-002-batch-1852-compression.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-003",
      description: "Photograph of QC deviation tracking whiteboard in Building A, Room 204, taken 02/06/2025",
      attachments: [
        { id: "att-003", name: "qc-whiteboard-photo.jpg", type: "image/jpeg", size: 3421000, url: "/uploads/att-003-qc-whiteboard.jpg" },
      ],
      sourceType: "photo",
    },
  ],
  citations: [cfrCitations[0], cfrCitations[11]],
  who: "Quality Control Unit personnel",
  what: "Failure to review batch deviations before product release",
  when: "Batch records dated September through November 2024",
  where: "Quality Control Department, Building A",
  howMuch: "3 of 12 batch records reviewed (25%) lacked documented deviation investigations",
  howOften: "Recurring pattern observed across a 3-month production period",
  aiGenerated: false,
  lastModified: new Date("2025-02-06T14:30:00"),
};

const meridianObservation2: Observation = {
  id: "obs-002",
  number: 2,
  text: "Equipment used in the manufacture, processing, packing, or holding of drug products is not cleaned and maintained at appropriate intervals to prevent malfunctions or contamination that would alter the safety, identity, strength, quality, or purity of the drug product. Specifically, the fluid bed dryer (Equipment ID FBD-03) located in Granulation Suite B-110 had visible residue of a yellow-brown substance on the interior walls and product filter bag during inspection on 02/04/2025. Cleaning logs show the last documented cleaning of FBD-03 was performed on 01/15/2025, despite the equipment being used for three separate product campaigns between 01/16/2025 and 02/03/2025.",
  significance: "critical",
  evidence: [
    {
      id: "ev-004",
      description: "Photograph of visible residue on FBD-03 interior wall and filter bag, taken 02/04/2025 at 10:42 AM",
      attachments: [
        { id: "att-004", name: "fbd03-residue-photo-1.jpg", type: "image/jpeg", size: 4102000, url: "/uploads/att-004-fbd03-residue-1.jpg" },
        { id: "att-005", name: "fbd03-residue-photo-2.jpg", type: "image/jpeg", size: 3890000, url: "/uploads/att-005-fbd03-residue-2.jpg" },
      ],
      sourceType: "photo",
    },
    {
      id: "ev-005",
      description: "Equipment cleaning log for FBD-03 covering January–February 2025, showing gap in cleaning documentation",
      attachments: [
        { id: "att-006", name: "fbd03-cleaning-log.pdf", type: "application/pdf", size: 156200, url: "/uploads/att-006-fbd03-cleaning-log.pdf" },
      ],
      sourceType: "record",
    },
  ],
  citations: [cfrCitations[21], cfrCitations[3]],
  who: "Manufacturing personnel responsible for equipment cleaning",
  what: "Failure to clean fluid bed dryer between product campaigns",
  when: "January 16, 2025 through February 3, 2025",
  where: "Granulation Suite B-110, Building B",
  howMuch: "3 product campaigns processed without documented inter-campaign cleaning",
  howOften: "18-day gap between documented cleanings despite continuous use",
  aiGenerated: false,
  lastModified: new Date("2025-02-07T09:15:00"),
};

const meridianObservation3: Observation = {
  id: "obs-003",
  number: 3,
  text: "Written procedures required under this part are not followed. The firm's SOP-MFG-042 \"In-Process Controls During Tablet Compression\" Rev. 08, effective 06/01/2024, requires that tablet weight, hardness, thickness, and friability be tested every 30 minutes during compression operations. Review of batch records for five lots produced in October and November 2024 revealed that in-process testing intervals ranged from 45 minutes to 2 hours and 15 minutes, with multiple testing intervals missed entirely. Specifically, Batch #2024-1855 had a 2-hour-15-minute gap in in-process testing between 14:00 and 16:15 on 10/22/2024 with no documented justification for the deviation.",
  significance: "significant",
  evidence: [
    {
      id: "ev-006",
      description: "SOP-MFG-042 Rev. 08 — In-Process Controls During Tablet Compression, effective 06/01/2024",
      attachments: [
        { id: "att-007", name: "sop-mfg-042-rev08.pdf", type: "application/pdf", size: 342100, url: "/uploads/att-007-sop-mfg-042.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-007",
      description: "Batch Record #2024-1855 in-process testing log showing 2h15m gap on 10/22/2024",
      attachments: [
        { id: "att-008", name: "batch-1855-ipc-log.pdf", type: "application/pdf", size: 198700, url: "/uploads/att-008-batch-1855-ipc.pdf" },
      ],
      sourceType: "record",
    },
  ],
  citations: [cfrCitations[5], cfrCitations[10]],
  who: "Compression operators on second shift",
  what: "In-process testing not performed at required intervals",
  when: "October and November 2024",
  where: "Compression Room A-108, Building A",
  howMuch: "5 of 8 lots reviewed (62.5%) had one or more missed or late in-process test intervals",
  howOften: "Gaps ranged from 45 minutes to 2 hours 15 minutes against a 30-minute requirement",
  aiGenerated: false,
  lastModified: new Date("2025-02-08T11:00:00"),
};

const meridianObservation4: Observation = {
  id: "obs-004",
  number: 4,
  text: "Laboratory controls do not include the establishment of scientifically sound and appropriate test procedures designed to assure that drug products conform to appropriate standards of identity, strength, quality, and purity. The firm's HPLC method for assay of Metformin HCl tablets (Method AM-2019-034) has not been validated for the current formulation change implemented in August 2024, which introduced a new film-coating excipient (Opadry II 85F). System suitability testing performed during routine analysis does not evaluate potential interference from the new excipient. No supplemental validation or method verification was performed to demonstrate the method remains suitable following the formulation change.",
  significance: "significant",
  evidence: [
    {
      id: "ev-008",
      description: "Analytical Method AM-2019-034 validation protocol and report — last validated May 2019 for original formulation",
      attachments: [
        { id: "att-009", name: "am-2019-034-validation.pdf", type: "application/pdf", size: 1245000, url: "/uploads/att-009-method-validation.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-009",
      description: "Change Control CC-2024-0087 approving formulation change to Opadry II 85F, effective 08/12/2024",
      attachments: [
        { id: "att-010", name: "cc-2024-0087.pdf", type: "application/pdf", size: 287400, url: "/uploads/att-010-change-control.pdf" },
      ],
      sourceType: "record",
    },
  ],
  citations: [cfrCitations[7], cfrCitations[8]],
  who: "Quality Control Laboratory",
  what: "Analytical method not revalidated after formulation change",
  when: "August 2024 to present",
  where: "QC Analytical Laboratory, Building C, Room 302",
  howMuch: "1 of 4 active HPLC methods (25%) not validated for current formulation",
  aiGenerated: true,
  lastModified: new Date("2025-02-10T16:45:00"),
};

const pacificObservation1: Observation = {
  id: "obs-005",
  number: 1,
  text: "The plant is not constructed in a manner to allow adequate cleaning and proper maintenance, and does not facilitate adequate cleaning and sanitizing operations. Specifically, the ceiling above the ready-to-eat salad processing line in Room F-12 exhibited extensive condensation with visible dripping onto exposed product contact surfaces during production operations observed on 01/21/2025. Ceiling panels in the northeast section of Room F-12 displayed water staining, black discoloration consistent with mold growth in an area measuring approximately 4 feet by 6 feet, and loose insulation material. Maintenance work orders for condensation issues in Room F-12 dated 11/14/2024 and 12/03/2024 remained open and unresolved at the time of inspection.",
  significance: "critical",
  evidence: [
    {
      id: "ev-010",
      description: "Photographs of ceiling condensation and discoloration above RTE processing line, Room F-12, taken 01/21/2025",
      attachments: [
        { id: "att-011", name: "room-f12-ceiling-photo-1.jpg", type: "image/jpeg", size: 5120000, url: "/uploads/att-011-ceiling-condensation.jpg" },
        { id: "att-012", name: "room-f12-ceiling-photo-2.jpg", type: "image/jpeg", size: 4830000, url: "/uploads/att-012-ceiling-mold.jpg" },
      ],
      sourceType: "photo",
    },
    {
      id: "ev-011",
      description: "Open maintenance work orders WO-2024-1187 (11/14/2024) and WO-2024-1243 (12/03/2024) for Room F-12 condensation",
      attachments: [
        { id: "att-013", name: "work-orders-f12.pdf", type: "application/pdf", size: 176300, url: "/uploads/att-013-work-orders.pdf" },
      ],
      sourceType: "record",
    },
  ],
  citations: [cfrCitations[16], cfrCitations[17]],
  who: "Facility maintenance department",
  what: "Facility construction allowing condensation over RTE processing",
  when: "Conditions observed 01/21/2025; work orders open since November 2024",
  where: "Room F-12, Ready-to-Eat Processing Area",
  howMuch: "Approximately 24 square feet of affected ceiling area above active production line",
  howOften: "Recurring — two unresolved work orders spanning 2 months",
  aiGenerated: false,
  lastModified: new Date("2025-01-22T10:30:00"),
};

const pacificObservation2: Observation = {
  id: "obs-006",
  number: 2,
  text: "Monitoring of preventive controls is not being conducted as required by the food safety plan. The firm's food safety plan requires environmental monitoring for Listeria monocytogenes and indicator organisms in all ready-to-eat processing areas on a weekly basis with a minimum of 10 sampling sites per zone. Review of environmental monitoring records from October 2024 through January 2025 showed that sampling was conducted on only 9 of 17 required weekly sampling events (53%). When sampling was performed, the number of sites sampled ranged from 4 to 7, below the required minimum of 10 sites per event. The environmental monitoring coordinator position was vacant from 11/01/2024 through 12/20/2024, and no interim assignment of responsibilities was documented.",
  significance: "critical",
  evidence: [
    {
      id: "ev-012",
      description: "Environmental monitoring records October 2024 through January 2025 — sampling frequency and site count tabulation",
      attachments: [
        { id: "att-014", name: "em-records-q4-2024.pdf", type: "application/pdf", size: 567800, url: "/uploads/att-014-em-records.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-013",
      description: "Food Safety Plan Section 7.3 — Environmental Monitoring Program requirements, Rev. 05 effective 03/15/2024",
      attachments: [
        { id: "att-015", name: "fsp-section-7-3.pdf", type: "application/pdf", size: 234100, url: "/uploads/att-015-fsp-em-program.pdf" },
      ],
      sourceType: "record",
    },
  ],
  citations: [cfrCitations[18], cfrCitations[17]],
  who: "Food safety team and quality assurance management",
  what: "Environmental monitoring not conducted per food safety plan requirements",
  when: "October 2024 through January 2025",
  where: "Ready-to-eat processing areas, Zones 1 through 3",
  howMuch: "9 of 17 required weekly sampling events conducted (53%); sites sampled per event ranged from 4–7 vs. required 10",
  howOften: "8 missed sampling events over a 17-week period",
  aiGenerated: false,
  lastModified: new Date("2025-01-23T14:20:00"),
};

const pacificObservation3: Observation = {
  id: "obs-007",
  number: 3,
  text: "Corrective actions are not being taken when preventive controls are not properly implemented and are found to be ineffective. Environmental monitoring conducted on 12/27/2024 detected Listeria spp. on a food contact surface (slicing blade assembly, Site RTE-04) in the ready-to-eat processing area. The firm's corrective action procedure (SOP-FSQA-018) requires enhanced cleaning and verification sampling within 24 hours of a positive Listeria spp. result on a food contact surface, followed by root cause investigation within 5 business days. Records reviewed showed verification sampling was not performed until 01/06/2025 (10 days after the initial positive), and no root cause investigation was documented at the time of inspection.",
  significance: "significant",
  evidence: [
    {
      id: "ev-014",
      description: "Environmental monitoring result report EM-2024-1298 showing Listeria spp. positive at Site RTE-04 on 12/27/2024",
      attachments: [
        { id: "att-016", name: "em-result-1298.pdf", type: "application/pdf", size: 98700, url: "/uploads/att-016-em-result.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-015",
      description: "SOP-FSQA-018 Rev. 03 — Corrective Actions for Environmental Monitoring Positives, effective 01/10/2024",
      attachments: [
        { id: "att-017", name: "sop-fsqa-018-rev03.pdf", type: "application/pdf", size: 210500, url: "/uploads/att-017-sop-fsqa-018.pdf" },
      ],
      sourceType: "record",
    },
  ],
  citations: [cfrCitations[19], cfrCitations[17]],
  who: "Quality assurance management and sanitation team",
  what: "Delayed corrective action response to Listeria positive on food contact surface",
  when: "December 27, 2024 through January 6, 2025",
  where: "Ready-to-eat processing area, slicing line",
  howMuch: "Verification sampling delayed 10 days vs. required 24 hours",
  howOften: "1 instance reviewed; however, systematic review not possible due to incomplete records",
  aiGenerated: false,
  lastModified: new Date("2025-01-24T09:45:00"),
};

const novamedObservation1: Observation = {
  id: "obs-008",
  number: 1,
  text: "Procedures for design changes are not established to ensure that design changes are verified or, where appropriate, validated before implementation. The firm implemented a design change (DCR-2024-0156) to the sterile catheter insertion tip geometry on 09/15/2024 that altered the bevel angle from 18° to 22°. The design history file for this change contains a risk assessment noting potential impact on tissue penetration force, yet no supplemental biocompatibility evaluation or clinical performance verification was performed prior to implementing the change in production. Sixteen lots incorporating the modified tip geometry were manufactured and distributed between 09/20/2024 and 12/15/2024 without completed design verification testing.",
  significance: "critical",
  evidence: [
    {
      id: "ev-016",
      description: "Design Change Request DCR-2024-0156 and associated risk assessment reviewed on 01/07/2025",
      attachments: [
        { id: "att-018", name: "dcr-2024-0156.pdf", type: "application/pdf", size: 456200, url: "/uploads/att-018-dcr-0156.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-017",
      description: "Design History File for Sterile Catheter Model SC-400 — verification and validation section incomplete for change DCR-2024-0156",
      attachments: [
        { id: "att-019", name: "dhf-sc400-excerpt.pdf", type: "application/pdf", size: 892100, url: "/uploads/att-019-dhf-sc400.pdf" },
      ],
      sourceType: "record",
    },
  ],
  citations: [cfrCitations[13], cfrCitations[14]],
  who: "Design engineering and quality assurance departments",
  what: "Design change implemented without required verification testing",
  when: "September 15, 2024 through December 15, 2024",
  where: "Design Engineering, Building 2; Production, Building 3 Clean Room",
  howMuch: "16 lots manufactured and distributed without completed design verification",
  howOften: "1 design change reviewed; no supplemental verification performed in 3-month period",
  aiGenerated: false,
  lastModified: new Date("2025-01-08T15:30:00"),
};

const novamedObservation2: Observation = {
  id: "obs-009",
  number: 2,
  text: "Procedures for control of nonconforming product are not established, or are not followed as established. The firm's SOP-QA-201 \"Nonconforming Product Control\" Rev. 04 requires that product failing final inspection be physically segregated and dispositioned within 15 business days. Review of nonconformance records NCR-2024-0089, NCR-2024-0098, and NCR-2024-0112 showed that lots of sterile catheter components that failed dimensional inspection remained in the production quarantine area for 32, 41, and 28 business days, respectively, prior to disposition. NCR-2024-0098 was found stored adjacent to conforming product in the finished goods staging area during a physical walkthrough on 01/09/2025, without adequate identification as nonconforming.",
  significance: "significant",
  evidence: [
    {
      id: "ev-018",
      description: "Nonconformance records NCR-2024-0089, NCR-2024-0098, NCR-2024-0112 with disposition timelines",
      attachments: [
        { id: "att-020", name: "ncr-records-2024.pdf", type: "application/pdf", size: 345600, url: "/uploads/att-020-ncr-records.pdf" },
      ],
      sourceType: "record",
    },
    {
      id: "ev-019",
      description: "Photograph of NCR-2024-0098 lot stored adjacent to conforming product in finished goods staging, taken 01/09/2025",
      attachments: [
        { id: "att-021", name: "ncr-0098-staging-photo.jpg", type: "image/jpeg", size: 3210000, url: "/uploads/att-021-ncr-staging.jpg" },
      ],
      sourceType: "photo",
    },
  ],
  citations: [cfrCitations[15]],
  who: "Quality assurance and warehouse personnel",
  what: "Nonconforming product not segregated and dispositioned within required timeframe",
  when: "August through December 2024",
  where: "Production quarantine area and finished goods staging, Building 3",
  howMuch: "3 of 5 nonconformance records reviewed (60%) exceeded the 15-business-day disposition requirement",
  howOften: "Delays ranged from 28 to 41 business days against a 15-business-day requirement",
  aiGenerated: false,
  lastModified: new Date("2025-01-09T17:00:00"),
};

export const observations: Observation[] = [
  meridianObservation1,
  meridianObservation2,
  meridianObservation3,
  meridianObservation4,
  pacificObservation1,
  pacificObservation2,
  pacificObservation3,
  novamedObservation1,
  novamedObservation2,
];

export const inspections: Inspection[] = [
  {
    id: "INS-2025-0042",
    status: "in_progress",
    firm: {
      name: "Meridian BioPharma Inc.",
      feiNumber: "3004521",
      address: {
        street: "4200 Meridian Parkway",
        city: "Fort Worth",
        state: "TX",
        zip: "76109",
        country: "US",
      },
      type: "Drug Manufacturer",
    },
    dates: {
      start: new Date("2025-02-03"),
      end: new Date("2025-02-14"),
    },
    districtOffice: "Dallas District Office",
    reportIssuedTo: {
      name: "Dr. Karen Whitfield",
      title: "Vice President, Quality Assurance",
    },
    investigators: [currentUser, investigatorMartinez],
    observations: [
      meridianObservation1,
      meridianObservation2,
      meridianObservation3,
      meridianObservation4,
    ],
    createdAt: new Date("2025-01-28T09:00:00"),
    updatedAt: new Date("2025-02-10T16:45:00"),
  },
  {
    id: "INS-2025-0038",
    status: "pending_review",
    firm: {
      name: "Pacific Coast Foods LLC",
      feiNumber: "2198734",
      address: {
        street: "8901 Harbor Boulevard",
        city: "Oakland",
        state: "CA",
        zip: "94607",
        country: "US",
      },
      type: "Food Facility",
    },
    dates: {
      start: new Date("2025-01-20"),
      end: new Date("2025-01-24"),
    },
    districtOffice: "San Francisco District Office",
    reportIssuedTo: {
      name: "Michael Tran",
      title: "Director of Operations",
    },
    investigators: [investigatorPatel, investigatorKimura],
    observations: [
      pacificObservation1,
      pacificObservation2,
      pacificObservation3,
    ],
    createdAt: new Date("2025-01-15T10:00:00"),
    updatedAt: new Date("2025-01-24T09:45:00"),
  },
  {
    id: "INS-2025-0035",
    status: "closed",
    firm: {
      name: "NovaMed Devices Corp",
      feiNumber: "4102938",
      address: {
        street: "275 Innovation Drive",
        city: "White Plains",
        state: "NY",
        zip: "10601",
        country: "US",
      },
      type: "Medical Device",
    },
    dates: {
      start: new Date("2025-01-06"),
      end: new Date("2025-01-10"),
    },
    districtOffice: "New York District Office",
    reportIssuedTo: {
      name: "Angela Morrison",
      title: "Senior Vice President, Regulatory Affairs",
    },
    investigators: [investigatorNguyen, investigatorThompson],
    observations: [novamedObservation1, novamedObservation2],
    createdAt: new Date("2024-12-20T08:30:00"),
    updatedAt: new Date("2025-01-15T12:00:00"),
  },
];

export const auditEvents: AuditEvent[] = [
  {
    id: "ae-001",
    timestamp: new Date("2025-02-03T08:15:00"),
    actorId: "inv-001",
    actorName: "Sarah Chen",
    action: "Created inspection record INS-2025-0042",
    details: { inspectionId: "INS-2025-0042", firmName: "Meridian BioPharma Inc." },
    type: "create",
  },
  {
    id: "ae-002",
    timestamp: new Date("2025-02-06T14:30:00"),
    actorId: "inv-001",
    actorName: "Sarah Chen",
    action: "Added Observation #1 to INS-2025-0042",
    details: { observationId: "obs-001", significance: "critical" },
    type: "edit",
  },
  {
    id: "ae-003",
    timestamp: new Date("2025-02-07T09:15:00"),
    actorId: "inv-002",
    actorName: "James Martinez",
    action: "Added Observation #2 to INS-2025-0042",
    details: { observationId: "obs-002", significance: "critical" },
    type: "edit",
  },
  {
    id: "ae-004",
    timestamp: new Date("2025-02-08T11:00:00"),
    actorId: "inv-001",
    actorName: "Sarah Chen",
    action: "Added Observation #3 to INS-2025-0042",
    details: { observationId: "obs-003", significance: "significant" },
    type: "edit",
  },
  {
    id: "ae-005",
    timestamp: new Date("2025-02-10T16:45:00"),
    actorId: "inv-001",
    actorName: "Sarah Chen",
    action: "Added Observation #4 to INS-2025-0042 (AI-assisted draft)",
    details: { observationId: "obs-004", significance: "significant", aiAssisted: true },
    type: "edit",
  },
  {
    id: "ae-006",
    timestamp: new Date("2025-02-11T09:00:00"),
    actorId: "inv-001",
    actorName: "Sarah Chen",
    action: "Created Form 483 draft for INS-2025-0042",
    details: { form483Id: "f483-001", inspectionId: "INS-2025-0042" },
    type: "create",
  },
  {
    id: "ae-007",
    timestamp: new Date("2025-02-12T10:30:00"),
    actorId: "inv-002",
    actorName: "James Martinez",
    action: "Updated checklist items on Form 483 F483-001",
    details: { form483Id: "f483-001", itemsCompleted: 3 },
    type: "edit",
  },
  {
    id: "ae-008",
    timestamp: new Date("2025-01-10T14:00:00"),
    actorId: "inv-005",
    actorName: "Lisa Nguyen",
    action: "Created Form 483 draft for INS-2025-0035",
    details: { form483Id: "f483-002", inspectionId: "INS-2025-0035" },
    type: "create",
  },
  {
    id: "ae-009",
    timestamp: new Date("2025-01-13T11:00:00"),
    actorId: "inv-005",
    actorName: "Lisa Nguyen",
    action: "Signed Form 483 F483-002",
    details: { form483Id: "f483-002", signatureType: "lead_investigator" },
    type: "sign",
  },
  {
    id: "ae-010",
    timestamp: new Date("2025-01-13T13:30:00"),
    actorId: "inv-006",
    actorName: "Robert Thompson",
    action: "Signed Form 483 F483-002",
    details: { form483Id: "f483-002", signatureType: "co_investigator" },
    type: "sign",
  },
  {
    id: "ae-011",
    timestamp: new Date("2025-01-14T09:00:00"),
    actorId: "inv-005",
    actorName: "Lisa Nguyen",
    action: "Submitted Form 483 F483-002 for supervisory review",
    details: { form483Id: "f483-002", reviewerName: "District Director" },
    type: "review",
  },
  {
    id: "ae-012",
    timestamp: new Date("2025-01-15T12:00:00"),
    actorId: "inv-005",
    actorName: "Lisa Nguyen",
    action: "Published Form 483 F483-002 and issued to firm",
    details: { form483Id: "f483-002", issuedTo: "Angela Morrison", firmName: "NovaMed Devices Corp" },
    type: "publish",
  },
];

const draftChecklistItems: ChecklistItem[] = [
  {
    id: "cl-001",
    label: "Each observation cites specific CFR section(s) violated",
    status: "completed",
    completedBy: "inv-001",
    completedAt: new Date("2025-02-11T10:00:00"),
  },
  {
    id: "cl-002",
    label: "Each observation includes supporting evidence with document references",
    status: "completed",
    completedBy: "inv-001",
    completedAt: new Date("2025-02-11T10:15:00"),
  },
  {
    id: "cl-003",
    label: "Observation text does not contain individual employee names",
    status: "completed",
    completedBy: "inv-002",
    completedAt: new Date("2025-02-12T10:30:00"),
  },
  {
    id: "cl-004",
    label: "Each observation addresses who, what, when, and where",
    status: "in_progress",
    notes: "Observation #4 missing 'where' details — needs update",
  },
  {
    id: "cl-005",
    label: "Population and sample ratios included where applicable (e.g., '3 of 12 batch records')",
    status: "completed",
    completedBy: "inv-001",
    completedAt: new Date("2025-02-11T14:00:00"),
  },
  {
    id: "cl-006",
    label: "Observation language is objective, factual, and free of opinion or conclusions",
    status: "in_progress",
  },
  {
    id: "cl-007",
    label: "District office address and contact information verified on header",
    status: "not_started",
  },
  {
    id: "cl-008",
    label: "Firm FEI number confirmed against ORA establishment database",
    status: "completed",
    completedBy: "inv-002",
    completedAt: new Date("2025-02-12T10:45:00"),
  },
];

const publishedChecklistItems: ChecklistItem[] = [
  {
    id: "cl-101",
    label: "Each observation cites specific CFR section(s) violated",
    status: "completed",
    completedBy: "inv-005",
    completedAt: new Date("2025-01-10T15:00:00"),
  },
  {
    id: "cl-102",
    label: "Each observation includes supporting evidence with document references",
    status: "completed",
    completedBy: "inv-005",
    completedAt: new Date("2025-01-10T15:10:00"),
  },
  {
    id: "cl-103",
    label: "Observation text does not contain individual employee names",
    status: "completed",
    completedBy: "inv-006",
    completedAt: new Date("2025-01-11T09:00:00"),
  },
  {
    id: "cl-104",
    label: "Each observation addresses who, what, when, and where",
    status: "completed",
    completedBy: "inv-005",
    completedAt: new Date("2025-01-11T09:30:00"),
  },
  {
    id: "cl-105",
    label: "Population and sample ratios included where applicable",
    status: "completed",
    completedBy: "inv-006",
    completedAt: new Date("2025-01-11T10:00:00"),
  },
  {
    id: "cl-106",
    label: "Observation language is objective, factual, and free of opinion or conclusions",
    status: "completed",
    completedBy: "inv-005",
    completedAt: new Date("2025-01-12T08:30:00"),
  },
  {
    id: "cl-107",
    label: "District office address and contact information verified on header",
    status: "completed",
    completedBy: "inv-006",
    completedAt: new Date("2025-01-12T09:00:00"),
  },
  {
    id: "cl-108",
    label: "Firm FEI number confirmed against ORA establishment database",
    status: "completed",
    completedBy: "inv-005",
    completedAt: new Date("2025-01-10T14:30:00"),
  },
];

const publishedSignatures: DocumentSignature[] = [
  {
    investigatorId: "inv-005",
    investigatorName: "Lisa Nguyen",
    title: "Senior Investigator",
    signatureImage: "/signatures/inv-005-signature.png",
    signedAt: new Date("2025-01-13T11:00:00"),
    required: true,
  },
  {
    investigatorId: "inv-006",
    investigatorName: "Robert Thompson",
    title: "Consumer Safety Officer",
    signatureImage: "/signatures/inv-006-signature.png",
    signedAt: new Date("2025-01-13T13:30:00"),
    required: true,
  },
];

export const form483s: Form483[] = [
  {
    id: "f483-001",
    inspectionId: "INS-2025-0042",
    status: "draft",
    observations: [
      meridianObservation1,
      meridianObservation2,
      meridianObservation3,
      meridianObservation4,
    ],
    signatures: [],
    checklistItems: draftChecklistItems,
    auditTrail: auditEvents.filter((e) =>
      e.details.form483Id === "f483-001" || e.details.inspectionId === "INS-2025-0042"
    ),
  },
  {
    id: "f483-002",
    inspectionId: "INS-2025-0035",
    status: "published",
    observations: [novamedObservation1, novamedObservation2],
    signatures: publishedSignatures,
    checklistItems: publishedChecklistItems,
    issuedDate: new Date("2025-01-14T09:00:00"),
    publishedDate: new Date("2025-01-15T12:00:00"),
    auditTrail: auditEvents.filter((e) =>
      e.details.form483Id === "f483-002" || e.details.inspectionId === "INS-2025-0035"
    ),
  },
];

export const referenceChunks: ReferenceChunk[] = [
  {
    id: "rc-001",
    docId: "IOM-2025",
    source: "IOM",
    sectionPath: ["Chapter 5", "5.2", "5.2.3"],
    title: "Inspectional Approach — CGMP Inspections",
    text: "The investigator should evaluate the firm's quality system by examining management responsibilities, resources, design controls, and corrective and preventive actions. The systems-based approach to CGMP inspections allows the investigator to assess whether the firm's manufacturing processes are in a state of control. Begin by identifying the systems to be covered and plan the depth of coverage for each system based on available compliance history, profile class, and district priorities.",
    pageStart: 214,
    pageEnd: 215,
  },
  {
    id: "rc-002",
    docId: "IOM-2025",
    source: "IOM",
    sectionPath: ["Chapter 5", "5.3", "5.3.1"],
    title: "Documenting Observations — Form FDA 483",
    text: "Inspectional observations are documented on Form FDA 483, Inspectional Observations. Each observation should be written clearly and concisely, identifying the requirement not met and the specific conditions observed. Observations should be factual and objective, referencing specific regulatory requirements (21 CFR sections) and providing sufficient detail for the firm to understand the nature and significance of the finding. Avoid conclusions about the overall state of compliance; each observation should stand on its own.",
    pageStart: 238,
    pageEnd: 239,
  },
  {
    id: "rc-003",
    docId: "IOM-2025",
    source: "IOM",
    sectionPath: ["Chapter 5", "5.3", "5.3.2"],
    title: "Evidence Collection and Documentation",
    text: "Investigators must collect and document sufficient evidence to support each inspectional observation. Evidence may include copies of records, photographs, samples, and affidavits. All evidence should be clearly identified, dated, and described in a manner that establishes its relevance to the observation. Photographic evidence should include documentation of the date, time, location, and subject matter. Batch records and other production documents should be referenced by unique identifiers such as lot number, batch number, and date of production.",
    pageStart: 242,
    pageEnd: 243,
  },
  {
    id: "rc-004",
    docId: "IOM-2025",
    source: "IOM",
    sectionPath: ["Chapter 5", "5.4", "5.4.1"],
    title: "Discussion of Observations with Management",
    text: "At the conclusion of the inspection, the investigator should discuss the inspectional observations with the firm's most responsible individual or designee. Present each observation on the Form FDA 483, explain the regulatory basis for the observation, and provide the firm an opportunity to respond. The discussion should be professional and factual. Do not provide recommendations for corrective actions; the firm is responsible for determining appropriate corrective measures.",
    pageStart: 256,
    pageEnd: 257,
  },
  {
    id: "rc-005",
    docId: "CFR-21",
    source: "CFR",
    sectionPath: ["Title 21", "Part 211", "Subpart J", "211.192"],
    title: "Production Record Review",
    text: "All drug product production and control records, including those for packaging and labeling, shall be reviewed and approved by the quality control unit to determine compliance with all established, approved written procedures before a batch is released or distributed. Any unexplained discrepancy (including a percentage of theoretical yield exceeding the maximum or minimum percentages established in master production and control records) or the failure of a batch or any of its components to meet any of its specifications shall be thoroughly investigated, whether or not the batch has already been distributed.",
    pageStart: 0,
    pageEnd: 0,
  },
  {
    id: "rc-006",
    docId: "CFR-21",
    source: "CFR",
    sectionPath: ["Title 21", "Part 211", "Subpart D", "211.67"],
    title: "Equipment Cleaning and Maintenance",
    text: "Equipment and utensils shall be cleaned, maintained, and, as appropriate for the nature of the drug, sanitized and/or sterilized at appropriate intervals to prevent malfunctions or contamination that would alter the safety, identity, strength, quality, or purity of the drug product beyond the official or other established requirements.",
    pageStart: 0,
    pageEnd: 0,
  },
  {
    id: "rc-007",
    docId: "CFR-21",
    source: "CFR",
    sectionPath: ["Title 21", "Part 117", "Subpart C", "117.135"],
    title: "Preventive Controls",
    text: "Preventive controls required under this section include, as appropriate to the facility and the food: process controls, food allergen controls, sanitation controls, supply-chain controls, and a recall plan. Each preventive control must be written and must provide assurances that hazards requiring a preventive control will be significantly minimized or prevented. Environmental monitoring must be conducted for an environmental pathogen or for an appropriate indicator organism whenever a ready-to-eat food is exposed to the environment prior to packaging and the packaged food does not receive a treatment that would adequately minimize the pathogen.",
    pageStart: 0,
    pageEnd: 0,
  },
  {
    id: "rc-008",
    docId: "CFR-21",
    source: "CFR",
    sectionPath: ["Title 21", "Part 820", "Subpart C", "820.30"],
    title: "Design Controls",
    text: "Each manufacturer shall establish and maintain procedures to control the design of the device in order to ensure that specified design requirements are met. Each manufacturer shall establish and maintain procedures for changes to a design. Before a design change is implemented in production, the change shall be reviewed, verified or where appropriate validated, documented, and approved before implementation. Design changes, including changes to components or ingredients, shall be identified, documented, and controlled.",
    pageStart: 0,
    pageEnd: 0,
  },
];

export const districtOffices: string[] = [
  "Atlanta District Office",
  "Baltimore District Office",
  "Central Pennsylvania District Office",
  "Chicago District Office",
  "Cincinnati District Office",
  "Dallas District Office",
  "Denver District Office",
  "Detroit District Office",
  "Florida District Office",
  "Kansas City District Office",
  "Los Angeles District Office",
  "Minneapolis District Office",
  "New England District Office",
  "New Jersey District Office",
  "New Orleans District Office",
  "New York District Office",
  "Philadelphia District Office",
  "San Francisco District Office",
  "San Juan District Office",
  "Seattle District Office",
];
