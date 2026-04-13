import type { AuditEntry } from '@/components/workflow/AuditTrailTimeline';

export const sampleAuditTrail: AuditEntry[] = [
  {
    id: '1',
    timestamp: '2026-04-10T09:15:00Z',
    action: 'Created',
    user: 'Inspector A',
    details: 'Created new inspection for ABC Pharmaceuticals',
  },
  {
    id: '2',
    timestamp: '2026-04-10T10:30:00Z',
    action: 'Generated',
    user: 'Inspector A',
    details: 'Generated FDA 483 observations from raw notes',
  },
  {
    id: '3',
    timestamp: '2026-04-10T11:45:00Z',
    action: 'Edited',
    user: 'Inspector B',
    details: 'Refined observation #2 CFR citation',
  },
  {
    id: '4',
    timestamp: '2026-04-11T08:00:00Z',
    action: 'Generated',
    user: 'Inspector A',
    details: 'Generated EIR narrative document',
  },
  {
    id: '5',
    timestamp: '2026-04-11T14:20:00Z',
    action: 'Published',
    user: 'Supervisor C',
    details: 'Published final FDA 483 to library',
  },
];
