"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface SignatureCaptureProps {
  open: boolean;
  onClose: () => void;
  onSign: (data: {
    signatureImage: string;
    signatureText?: string;
    signatureType: "draw" | "type";
    signedName: string;
    signedAt: string;
  }) => void;
  investigatorName: string;
  title: string;
}

type Tab = "draw" | "type";

export default function SignatureCapture({
  open,
  onClose,
  onSign,
  investigatorName,
  title,
}: SignatureCaptureProps) {
  const [activeTab, setActiveTab] = useState<Tab>("draw");
  const [typedName, setTypedName] = useState(investigatorName);
  const modalRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (open) {
      modalRef.current?.querySelector<HTMLElement>("button")?.focus();
    }
  }, [open]);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return { canvas, ctx };
  };

  const ensureCanvas = () => {
    const bundle = getCanvasContext();
    if (!bundle) return;
    const { canvas, ctx } = bundle;
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
  };

  useEffect(() => {
    if (open && activeTab === "draw") {
      setTimeout(ensureCanvas, 0);
    }
  }, [open, activeTab]);

  if (!open) return null;

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bundle = getCanvasContext();
    if (!bundle) return;
    ensureCanvas();
    const { ctx } = bundle;
    const { x, y } = point(event);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const bundle = getCanvasContext();
    if (!bundle) return;
    const { ctx } = bundle;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const bundle = getCanvasContext();
    if (!bundle) return;
    const { canvas, ctx } = bundle;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  };

  const handleApply = () => {
    const signatureImage =
      activeTab === "draw"
        ? canvasRef.current?.toDataURL("image/png") || ""
        : "";
    onSign({
      signatureImage,
      signatureText: activeTab === "type" ? typedName : undefined,
      signatureType: activeTab,
      signedName: typedName || investigatorName,
      signedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-lg border border-border bg-surface-elevated shadow-xl"
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-serif text-lg font-semibold text-text-primary">
            Capture Signature
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">{title}</p>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-1 rounded-md bg-background p-1">
            {(["draw", "type"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  activeTab === tab
                    ? "bg-surface-elevated text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4">
          {activeTab === "draw" ? (
            <div className="space-y-3">
              <canvas
                ref={canvasRef}
                className="h-[150px] w-full rounded-md border-2 border-dashed border-border bg-white"
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="rounded px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your full name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
              />
              <div className="flex h-[150px] items-center justify-center rounded-md border border-border bg-background">
                <span className="font-serif text-2xl italic text-text-primary">
                  {typedName || investigatorName}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
}
