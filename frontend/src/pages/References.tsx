import { useState, useMemo } from 'react';
import { Search, BookOpen, Scale } from 'lucide-react';
import EirWorkflowGuide from '../components/EirWorkflowGuide';

interface CFREntry {
  part: string;
  title: string;
  description: string;
}

const PART_211_ENTRIES: CFREntry[] = [
  {
    part: '21 CFR 211.22',
    title: 'Responsibilities of Quality Control Unit',
    description:
      'The quality control unit shall have the authority to approve or reject all components, drug product containers, closures, in-process materials, packaging material, labeling, and drug products.',
  },
  {
    part: '21 CFR 211.42',
    title: 'Design and Construction Features',
    description:
      'Buildings used in the manufacture, processing, packing, or holding of a drug product shall be of suitable size, construction, and location to facilitate cleaning, maintenance, and proper operations.',
  },
  {
    part: '21 CFR 211.56',
    title: 'Sanitation',
    description:
      'Any building used for manufacture, processing, packing, or holding shall be maintained in a clean and sanitary condition. Written procedures shall be established and followed.',
  },
  {
    part: '21 CFR 211.67',
    title: 'Equipment Cleaning and Maintenance',
    description:
      'Equipment and utensils shall be cleaned, maintained, and sanitized at appropriate intervals to prevent malfunctions or contamination.',
  },
  {
    part: '21 CFR 211.68',
    title: 'Automatic, Mechanical, and Electronic Equipment',
    description:
      'Automatic, mechanical, or electronic equipment used in manufacturing shall be routinely calibrated, inspected, or checked according to a written program.',
  },
  {
    part: '21 CFR 211.100',
    title: 'Written Procedures; Deviations',
    description:
      'Written production and process control procedures shall be established and followed. Any deviation shall be recorded and justified.',
  },
  {
    part: '21 CFR 211.113',
    title: 'Control of Microbiological Contamination',
    description:
      'Appropriate written procedures shall be established to prevent objectionable microorganisms in non-sterile drug products and to prevent microbial contamination of sterile drug products.',
  },
  {
    part: '21 CFR 211.160',
    title: 'General Requirements for Laboratory Controls',
    description:
      'Laboratory controls shall include scientifically sound and appropriate specifications, standards, sampling plans, and test procedures to assure conformance to standards.',
  },
  {
    part: '21 CFR 211.166',
    title: 'Stability Testing',
    description:
      'There shall be a written testing program designed to assess the stability characteristics of drug products, used to determine appropriate storage conditions and expiration dates.',
  },
  {
    part: '21 CFR 211.186',
    title: 'Master Production and Control Records',
    description:
      'Master production and control records shall be prepared, dated, and signed by one person and independently checked, dated, and signed by a second person.',
  },
  {
    part: '21 CFR 211.192',
    title: 'Production Record Review',
    description:
      'All drug product production and control records shall be reviewed and approved by the quality control unit to determine compliance with established procedures before batch release.',
  },
  {
    part: '21 CFR 211.194',
    title: 'Laboratory Records',
    description:
      'Laboratory records shall include complete data derived from all tests, examinations, and assays, including a description of the sample and its source.',
  },
  {
    part: '21 CFR 211.198',
    title: 'Complaint Files',
    description:
      'Written procedures shall be established and followed for handling all written and oral complaints regarding a drug product, including investigation and documentation.',
  },
];

const PART_820_ENTRIES: CFREntry[] = [
  {
    part: '21 CFR 820.22',
    title: 'Quality Audit',
    description:
      'Each manufacturer shall establish procedures for quality audits and conduct such audits to assure that the quality system is in compliance with established requirements.',
  },
  {
    part: '21 CFR 820.30',
    title: 'Design Controls',
    description:
      'Each manufacturer shall establish and maintain procedures to control the design of the device in order to ensure that specified design requirements are met.',
  },
  {
    part: '21 CFR 820.70',
    title: 'Production and Process Controls',
    description:
      'Each manufacturer shall develop, conduct, control, and monitor production processes to ensure a device conforms to its specifications.',
  },
  {
    part: '21 CFR 820.90',
    title: 'Nonconforming Product',
    description:
      'Each manufacturer shall establish and maintain procedures to control product that does not conform to specified requirements. Procedures shall address identification, documentation, evaluation, and disposition.',
  },
  {
    part: '21 CFR 820.198',
    title: 'Complaint Files',
    description:
      'Each manufacturer shall maintain complaint files and establish procedures for receiving, reviewing, and evaluating complaints by a formally designated unit.',
  },
];

const ALL_ENTRIES = [...PART_211_ENTRIES, ...PART_820_ENTRIES];

export default function References() {
  const [search, setSearch] = useState('');

  const filtered211 = useMemo(() => {
    if (!search.trim()) return PART_211_ENTRIES;
    const q = search.toLowerCase();
    return PART_211_ENTRIES.filter(
      (e) =>
        e.part.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [search]);

  const filtered820 = useMemo(() => {
    if (!search.trim()) return PART_820_ENTRIES;
    const q = search.toLowerCase();
    return PART_820_ENTRIES.filter(
      (e) =>
        e.part.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [search]);

  const totalResults = filtered211.length + filtered820.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Regulatory References</h1>
        <p className="mt-1 text-sm text-gray-500">
          CFR citations commonly referenced in FDA 483 observations.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by CFR part, title, or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
        />
        {search.trim() && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {totalResults} of {ALL_ENTRIES.length} entries
          </span>
        )}
      </div>

      {filtered211.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Scale className="h-5 w-5 text-navy-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              21 CFR Part 211 — Current Good Manufacturing Practice
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered211.map((entry) => (
              <div
                key={entry.part}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-bold text-navy-700">{entry.part}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{entry.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{entry.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {filtered820.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-navy-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              21 CFR Part 820 — Quality System Regulation
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered820.map((entry) => (
              <div
                key={entry.part}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-bold text-navy-700">{entry.part}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{entry.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{entry.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {totalResults === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Search className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">No matching references found.</p>
          <p className="mt-1 text-sm text-gray-400">Try a different search term.</p>
        </div>
      )}

      <EirWorkflowGuide />
    </div>
  );
}
