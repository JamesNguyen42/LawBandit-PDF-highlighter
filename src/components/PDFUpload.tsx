// src/components/PDFUpload.tsx
"use client";

import { useCallback, useState } from "react";

interface PDFUploadProps {
  onPDFLoad: (file: File) => void;
}

export default function PDFUpload({ onPDFLoad }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === "application/pdf");
    if (pdfFile) onPDFLoad(pdfFile);
  }, [onPDFLoad]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") onPDFLoad(file);
  }, [onPDFLoad]);

  return (
    <div
      style={{
        border: `2px dashed ${isDragging ? "#3b82f6" : "#d1d5db"}`,
        borderRadius: "0.75rem",
        padding: "3rem",
        textAlign: "center",
        backgroundColor: isDragging ? "#eff6ff" : "white",
        transition: "all 0.2s",
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>??</div>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>
        Upload PDF Document
      </h3>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Drag and drop your PDF here, or click to browse
      </p>
      <label className="btn btn-primary">
        Choose PDF File
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}
