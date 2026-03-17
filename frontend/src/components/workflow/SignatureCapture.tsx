import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import type ReactSignatureCanvas from 'react-signature-canvas';
import { Eraser, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SignatureCaptureProps {
  onCapture: (signatureImage: string) => void;
  label?: string;
  width?: number;
  height?: number;
}

export default function SignatureCapture({
  onCapture,
  label = 'EMPLOYEE(S) SIGNATURE:',
  width = 400,
  height = 150,
}: SignatureCaptureProps) {
  const sigRef = useRef<ReactSignatureCanvas>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const handleClear = () => {
    sigRef.current?.clear();
    setHasDrawn(false);
  };

  const handleAccept = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error('Please provide a signature before accepting.');
      return;
    }
    const dataUrl = sigRef.current.toDataURL('image/png');
    onCapture(dataUrl);
    toast.success('Signature captured successfully.');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <div
        className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white"
        style={{ width, height }}
      >
        {!hasDrawn && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Sign here
          </span>
        )}
        <SignatureCanvas
          ref={sigRef}
          penColor="#1e293b"
          canvasProps={{
            width,
            height,
            className: 'rounded-lg cursor-crosshair',
          }}
          onBegin={() => setHasDrawn(true)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <Eraser className="h-4 w-4" />
          Clear
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#003366] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#002244]"
        >
          <CheckCircle className="h-4 w-4" />
          Accept Signature
        </button>
      </div>
    </div>
  );
}
