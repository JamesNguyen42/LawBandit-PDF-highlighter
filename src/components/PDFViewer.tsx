// src/components/PDFViewer.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-pdf components to avoid SSR issues
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

interface PDFViewerProps {
  file: File;
}

export default function PDFViewer({ file }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Configure PDF.js worker on client side only
    if (typeof window !== "undefined") {
      const pdfjs = require("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    }
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  if (!isClient) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading PDF viewer...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem",
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
            className="btn"
            style={{ border: "1px solid #d1d5db", backgroundColor: "white" }}
          >
            Zoom Out
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.2, 3))}
            className="btn"
            style={{ border: "1px solid #d1d5db", backgroundColor: "white" }}
          >
            Zoom In
          </button>
        </div>
        
        <div>Page {currentPage} of {numPages}</div>
      </div>

      {/* PDF Document */}
      <div style={{ padding: "2rem", display: "flex", justifyContent: "center" }}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div style={{ padding: "2rem" }}>Loading PDF...</div>}
          error={<div style={{ padding: "2rem", color: "red" }}>Failed to load PDF</div>}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            loading={<div>Loading page...</div>}
          />
        </Document>
      </div>

      {/* Page Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "1rem",
        padding: "1rem",
        backgroundColor: "white",
        borderTop: "1px solid #e5e7eb",
      }}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage <= 1}
          className="btn"
          style={{
            border: "1px solid #d1d5db",
            backgroundColor: currentPage <= 1 ? "#f9fafb" : "white",
            color: currentPage <= 1 ? "#9ca3af" : "#374151",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
          }}
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages))}
          disabled={currentPage >= numPages}
          className="btn"
          style={{
            border: "1px solid #d1d5db",
            backgroundColor: currentPage >= numPages ? "#f9fafb" : "white",
            color: currentPage >= numPages ? "#9ca3af" : "#374151",
            cursor: currentPage >= numPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
