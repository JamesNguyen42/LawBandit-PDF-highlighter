// src/components/SimplePDFViewer.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface PDFViewerProps {
  file: File;
}

interface Highlight {
  id: string;
  text: string;
  color: string;
  created: string;
  manual?: boolean;
}

export default function SimplePDFViewer({ file }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedColor, setSelectedColor] = useState("#fbbf24");
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const colors = [
    { name: "Yellow", value: "#fbbf24", bg: "#fef3c7" },
    { name: "Blue", value: "#3b82f6", bg: "#dbeafe" },
    { name: "Green", value: "#10b981", bg: "#d1fae5" },
    { name: "Pink", value: "#ec4899", bg: "#fce7f3" },
    { name: "Purple", value: "#8b5cf6", bg: "#ede9fe" },
    { name: "Orange", value: "#f97316", bg: "#fed7aa" },
  ];

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const addManualHighlight = () => {
    if (!manualText.trim()) return;
    
    const newHighlight: Highlight = {
      id: Date.now().toString(),
      text: manualText.trim(),
      color: selectedColor,
      created: new Date().toLocaleString(),
      manual: true,
    };
    
    setHighlights(prev => [...prev, newHighlight]);
    setManualText("");
    setShowManualInput(false);
    
    // Simple success message
    alert(`Added highlight: "${manualText.trim().substring(0, 50)}..."`);
  };

  const removeHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const clearHighlights = () => {
    setHighlights([]);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div style={{
        width: "320px",
        backgroundColor: "white",
        borderRight: "1px solid #e5e7eb",
        padding: "1.5rem",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <h3 style={{ 
          fontSize: "1.25rem", 
          fontWeight: "700", 
          marginBottom: "1rem",
          color: "#1f2937"
        }}>
          Highlights ({highlights.length})
        </h3>
        
        {/* Color Picker */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ 
            fontSize: "0.875rem", 
            fontWeight: "600", 
            color: "#374151",
            display: "block",
            marginBottom: "0.5rem"
          }}>
            Highlight Color:
          </label>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: "0.5rem"
          }}>
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color.value)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: color.bg,
                  border: selectedColor === color.value ? `3px solid ${color.value}` : "2px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  transform: selectedColor === color.value ? "scale(1.05)" : "scale(1)",
                }}
                title={color.name}
              >
                <div style={{
                  width: "20px",
                  height: "4px",
                  backgroundColor: color.value,
                  margin: "0 auto",
                  borderRadius: "2px"
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="btn btn-primary"
            style={{ 
              width: "100%",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}
          >
            Add Text to Highlight
          </button>
          
          {highlights.length > 0 && (
            <button
              onClick={clearHighlights}
              className="btn"
              style={{ 
                width: "100%",
                backgroundColor: "#ef4444",
                color: "white",
                fontSize: "0.875rem"
              }}
            >
              Clear All Highlights
            </button>
          )}
        </div>

        {/* Manual Text Input */}
        {showManualInput && (
          <div style={{ 
            marginBottom: "1.5rem", 
            padding: "1rem", 
            backgroundColor: "#f8fafc", 
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0"
          }}>
            <label style={{ 
              fontSize: "0.875rem", 
              fontWeight: "600", 
              color: "#374151",
              display: "block",
              marginBottom: "0.5rem"
            }}>
              Enter text to highlight:
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Copy and paste text from the PDF here..."
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                resize: "vertical",
                minHeight: "80px"
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button
                onClick={addManualHighlight}
                className="btn btn-primary"
                style={{ fontSize: "0.75rem", padding: "0.5rem 1rem" }}
              >
                Add Highlight
              </button>
              <button
                onClick={() => setShowManualInput(false)}
                className="btn"
                style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", backgroundColor: "#6b7280", color: "white" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          padding: "1rem",
          backgroundColor: "#f8fafc",
          borderRadius: "0.75rem",
          marginBottom: "1rem",
          fontSize: "0.825rem",
          color: "#475569",
          border: "1px solid #e2e8f0"
        }}>
          <strong>How to highlight:</strong><br/>
          1. Copy text from the PDF (Ctrl+C)<br/>
          2. Click "Add Text to Highlight"<br/>
          3. Paste the text and click "Add Highlight"
        </div>
        
        {/* Highlights List */}
        <div style={{ flex: 1 }}>
          {highlights.length === 0 ? (
            <p style={{ 
              color: "#9ca3af", 
              fontSize: "0.875rem", 
              textAlign: "center", 
              padding: "2rem 1rem",
              fontStyle: "italic"
            }}>
              No highlights yet. Copy text from the PDF and add it using the button above!
            </p>
          ) : (
            highlights.map((highlight, index) => (
              <div
                key={highlight.id}
                style={{
                  padding: "1rem",
                  marginBottom: "0.75rem",
                  backgroundColor: colors.find(c => c.value === highlight.color)?.bg || "#fef3c7",
                  border: `2px solid ${highlight.color}`,
                  borderRadius: "0.75rem",
                  fontSize: "0.875rem",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => removeHighlight(highlight.id)}
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.5rem",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Remove highlight"
                >
                  ×
                </button>
                
                <div style={{ 
                  fontSize: "0.75rem", 
                  color: "#6b7280", 
                  marginBottom: "0.5rem",
                  fontWeight: "500"
                }}>
                  #{index + 1} • {highlight.created}
                </div>
                <div style={{ 
                  color: "#1f2937",
                  lineHeight: "1.4",
                  paddingRight: "1.5rem"
                }}>
                  "{highlight.text.length > 150 ? highlight.text.substring(0, 150) + "..." : highlight.text}"
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main PDF Viewer */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#f3f4f6" }}>
        <iframe
          ref={iframeRef}
          src={pdfUrl}
          style={{
            flex: 1,
            border: "none",
            width: "100%",
            height: "100%",
            backgroundColor: "white",
          }}
          title="PDF Document Viewer"
        />
      </div>
    </div>
  );
}
