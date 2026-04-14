"use client";

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Printer, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Form483Preview from '@/components/inspection/Form483Preview';
import { downloadDocument, getLibraryItem } from '@/lib/api';
import type { InspectionMetadata, DraftObservation } from '@/types/inspection';

export default function Form483View() {
  const params = useParams();
  const id = params.id as string | undefined;
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const docQuery = useQuery({
    queryKey: ['library-item', id],
    queryFn: () => getLibraryItem(Number(id)),
    enabled: Boolean(id),
  });

  const inspection: InspectionMetadata = (docQuery.data?.metadata ?? {
    firm_name: '',
    fei_number: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    establishment_type: '',
    inspection_start: '',
    inspection_end: '',
    district_office: '',
    investigators: [],
    report_issued_to_name: '',
    report_issued_to_title: '',
  }) as InspectionMetadata;

  const observations: DraftObservation[] = (docQuery.data?.observations ?? []) as DraftObservation[];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDocument('483', { form_data: inspection, observations });
    } catch {
      // error handled by API interceptor
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (docQuery.isLoading) {
    return (
      <div className="p-8">
        <div className="inline-flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading FDA 483 document preview...
        </div>
      </div>
    );
  }

  if (docQuery.isError || !docQuery.data) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Form FDA 483 Preview</h1>
        <p className="mt-2 text-sm text-gray-600">Unable to load this document.</p>
        <button
          onClick={() => router.push('/library')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @page {
          size: 8.5in 11in;
          margin: 0;
        }
        @media print {
          body {
            margin: 0 !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .print-shell {
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-483 {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form FDA 483 Preview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Document ID: {id ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download .docx
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      <div className="print-shell">
        <Form483Preview
          metadata={inspection}
          observations={observations}
          watermark="DRAFT"
        />
      </div>
    </div>
  );
}



