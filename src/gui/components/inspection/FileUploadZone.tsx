"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { processOCR } from "@/lib/api";
import type { OCRResult } from "@/types/inspection";

interface UploadedFile {
  file: File;
  ocrResult?: OCRResult;
  ocrText?: string;
  processing: boolean;
}

interface FileUploadZoneProps {
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileTypeBadge(type: string) {
  if (type.includes("pdf"))
    return { label: "PDF", cls: "bg-red-100 text-red-700" };
  if (type.includes("image"))
    return { label: "Image", cls: "bg-blue-100 text-blue-700" };
  if (type.includes("word") || type.includes("document"))
    return { label: "DOCX", cls: "bg-indigo-100 text-indigo-700" };
  return { label: "File", cls: "bg-gray-100 text-gray-700" };
}

export type { UploadedFile };

export default function FileUploadZone({
  onFilesChange,
  files,
}: FileUploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const next = [
        ...files,
        ...accepted.map((file) => ({ file, processing: false })),
      ];
      onFilesChange(next);
    },
    [files, onFilesChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".bmp"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
  });

  const handleOCR = async (index: number) => {
    const entry = files[index];
    const updated = files.map((f, i) =>
      i === index ? { ...f, processing: true } : f,
    );
    onFilesChange(updated);

    try {
      const result = await processOCR(entry.file);
      onFilesChange(
        files.map((f, i) =>
          i === index
            ? { ...f, processing: false, ocrResult: result, ocrText: result.full_text }
            : f,
        ),
      );
      toast.success("OCR processing complete");
    } catch {
      onFilesChange(
        files.map((f, i) =>
          i === index ? { ...f, processing: false } : f,
        ),
      );
      toast.error("OCR processing failed");
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const updateOcrText = (index: number, text: string) => {
    onFilesChange(
      files.map((f, i) => (i === index ? { ...f, ocrText: text } : f)),
    );
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive
            ? "border-navy-500 bg-navy-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">
          Drop inspection notes, images, or PDFs here
        </p>
        <p className="mt-1 text-xs text-gray-400">
          PDF, images, Word documents, or plain text
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-5 space-y-3">
          {files.map((uf, i) => {
            const badge = fileTypeBadge(uf.file.type);
            return (
              <div key={i} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {uf.file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(uf.file.size)}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!uf.ocrResult && (
                      <button
                        onClick={() => handleOCR(i)}
                        disabled={uf.processing}
                        className="flex items-center gap-1.5 rounded-md bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50"
                      >
                        {uf.processing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        Process OCR
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1.5 text-gray-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {uf.ocrResult && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {uf.ocrResult.text_blocks.slice(0, 5).map((block, bi) => (
                        <span
                          key={bi}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          {block.confidence.toFixed(0)}% confidence
                        </span>
                      ))}
                    </div>
                    <textarea
                      value={uf.ocrText ?? ""}
                      onChange={(e) => updateOcrText(i, e.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
