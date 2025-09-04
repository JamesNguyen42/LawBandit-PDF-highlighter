// src/components/PDFViewer.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Highlighter, Trash2, Download } from "lucide-react";

interface PDFViewerProps {
    file: File;
}

interface Highlight {
    id: string;
    text: string;
    color: string;
    background: string;
    created: string;
}

export default function PDFViewer({ file }: PDFViewerProps) {
    const [pdfUrl, setPdfUrl] = useState<string>("");
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [selectedColor, setSelectedColor] = useState("#fbbf24");
    const [selectedBackground, setSelectedBackground] = useState("#fef3c7");
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [scale, setScale] = useState(1.2);
    const [searchTerm, setSearchTerm] = useState("");
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

    // Handle text selection and highlighting
    const handleTextSelection = useCallback(() => {
        if (!isHighlighting) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();

        if (selectedText.length === 0) return;
        if (selectedText.length < 3) return; // Avoid highlighting single characters

        // Check if text is already highlighted
        const existingHighlight = highlights.find(h => h.text === selectedText);
        if (existingHighlight) {
            showToast("Text already highlighted!", 'warning');
            selection.removeAllRanges();
            return;
        }

        // Create highlight
        const newHighlight: Highlight = {
            id: Date.now().toString(),
            text: selectedText,
            color: selectedColor,
            background: selectedBackground,
            created: new Date().toLocaleString(),
        };

        // Get iframe content for highlighting
        const iframe = iframeRef.current;
        if (iframe && iframe.contentDocument) {
            try {
                // Try to highlight within iframe content
                const iframeSelection = iframe.contentWindow?.getSelection();
                if (iframeSelection && iframeSelection.rangeCount > 0) {
                    const iframeRange = iframeSelection.getRangeAt(0);
                    const span = iframe.contentDocument.createElement("span");

                    span.style.backgroundColor = selectedBackground;
                    span.style.color = "inherit";
                    span.style.padding = "1px 0";
                    span.style.borderRadius = "2px";
                    span.style.cursor = "pointer";
                    span.style.boxShadow = `0 0 0 1px ${selectedColor}40`;
                    span.dataset.highlightId = newHighlight.id;
                    span.title = "Click to view in sidebar";

                    // Add click handler for navigation
                    span.addEventListener('click', (e) => {
                        e.preventDefault();
                        scrollToHighlight(newHighlight);
                    });

                    try {
                        iframeRange.surroundContents(span);
                        setHighlights(prev => [...prev, newHighlight]);
                        iframeSelection.removeAllRanges();
                        showToast(`✨ Highlighted: "${selectedText.substring(0, 25)}${selectedText.length > 25 ? '...' : ''}"`);
                    } catch (e) {
                        // Fallback for complex selections
                        const contents = iframeRange.extractContents();
                        span.appendChild(contents);
                        iframeRange.insertNode(span);
                        setHighlights(prev => [...prev, newHighlight]);
                        iframeSelection.removeAllRanges();
                        showToast(`✨ Highlighted: "${selectedText.substring(0, 25)}${selectedText.length > 25 ? '...' : ''}"`);
                    }
                }
            } catch (error) {
                console.error("PDF highlighting failed:", error);
                // Fallback to sidebar-only highlight
                setHighlights(prev => [...prev, newHighlight]);
                showToast(`📝 Added to sidebar: "${selectedText.substring(0, 25)}${selectedText.length > 25 ? '...' : ''}"`);
            }
        } else {
            // Fallback for main document highlighting
            try {
                const span = document.createElement("span");
                span.style.backgroundColor = selectedBackground;
                span.style.color = "inherit";
                span.style.padding = "1px 2px";
                span.style.borderRadius = "2px";
                span.style.cursor = "pointer";
                span.style.boxShadow = `0 0 0 1px ${selectedColor}40`;
                span.dataset.highlightId = newHighlight.id;

                range.surroundContents(span);
                setHighlights(prev => [...prev, newHighlight]);
                selection.removeAllRanges();
                showToast(`✨ Highlighted: "${selectedText.substring(0, 25)}${selectedText.length > 25 ? '...' : ''}"`);
            } catch (error) {
                console.error("Main document highlighting failed:", error);
                setHighlights(prev => [...prev, newHighlight]);
                showToast(`📝 Added to sidebar: "${selectedText.substring(0, 25)}${selectedText.length > 25 ? '...' : ''}"`);
            }
        }

        // Clear any remaining selections
        selection.removeAllRanges();
    }, [isHighlighting, selectedColor, selectedBackground, highlights]);

    // Toast notification system with better styling
    const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
        const colors = {
            success: { bg: '#10b981', icon: '✨' },
            warning: { bg: '#f59e0b', icon: '⚠️' },
            info: { bg: '#3b82f6', icon: 'ℹ️' }
        };

        const toast = document.createElement('div');
        toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type].bg};
      color: white;
      padding: 14px 20px;
      border-radius: 10px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      max-width: 350px;
      font-size: 14px;
      backdrop-filter: blur(10px);
    `;
        toast.innerHTML = `<span style="margin-right: 8px;">${colors[type].icon}</span>${message}`;

        // Add animation styles
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
        @keyframes slideIn {
          from { 
            transform: translateX(120%) scale(0.8); 
            opacity: 0; 
          }
          to { 
            transform: translateX(0) scale(1); 
            opacity: 1; 
          }
        }
        @keyframes slideOut {
          from { 
            transform: translateX(0) scale(1); 
            opacity: 1; 
          }
          to { 
            transform: translateX(120%) scale(0.8); 
            opacity: 0; 
          }
        }
      `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Auto remove with slide out animation
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // Listen for text selection with better handling
    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => {
            // Small delay to ensure selection is complete
            setTimeout(() => {
                handleTextSelection();
            }, 50);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Handle keyboard selection (Shift+Arrow keys, etc.)
            if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                setTimeout(handleTextSelection, 50);
            }

            // Quick shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'h':
                        e.preventDefault();
                        setIsHighlighting(!isHighlighting);
                        break;
                    case 's':
                        e.preventDefault();
                        if (highlights.length > 0) exportHighlights();
                        break;
                }
            }
        };

        if (isHighlighting) {
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('keyup', handleKeyUp);

            // Change cursor for better UX
            document.body.style.cursor = 'text';

            return () => {
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('keyup', handleKeyUp);
                document.body.style.cursor = 'default';
            };
        }
    }, [isHighlighting, handleTextSelection, highlights]);

    const removeHighlight = (id: string) => {
        // Remove from state
        setHighlights(prev => prev.filter(h => h.id !== id));

        // Remove from DOM (try both iframe and main document)
        const removeFromDocument = (doc: Document) => {
            const highlightElement = doc.querySelector(`[data-highlight-id="${id}"]`);
            if (highlightElement) {
                const parent = highlightElement.parentNode;
                if (parent) {
                    const textContent = highlightElement.textContent;
                    parent.replaceChild(doc.createTextNode(textContent || ''), highlightElement);
                    parent.normalize(); // Merge adjacent text nodes
                    return true;
                }
            }
            return false;
        };

        // Try iframe first
        let removed = false;
        const iframe = iframeRef.current;
        if (iframe && iframe.contentDocument) {
            removed = removeFromDocument(iframe.contentDocument);
        }

        // If not found in iframe, try main document
        if (!removed) {
            removeFromDocument(document);
        }

        showToast("🗑️ Highlight removed", 'info');
    };

    const clearHighlights = () => {
        if (highlights.length === 0) return;

        const clearFromDocument = (doc: Document) => {
            highlights.forEach(highlight => {
                const element = doc.querySelector(`[data-highlight-id="${highlight.id}"]`);
                if (element) {
                    const parent = element.parentNode;
                    if (parent) {
                        parent.replaceChild(doc.createTextNode(element.textContent || ''), element);
                        parent.normalize();
                    }
                }
            });
        };

        // Clear from iframe
        const iframe = iframeRef.current;
        if (iframe && iframe.contentDocument) {
            clearFromDocument(iframe.contentDocument);
        }

        // Clear from main document
        clearFromDocument(document);

        setHighlights([]);
        showToast(`🧹 Cleared ${highlights.length} highlights`, 'info');
    };

    const exportHighlights = () => {
        if (highlights.length === 0) {
            showToast("⚠️ No highlights to export", 'warning');
            return;
        }

        const data = {
            filename: file.name,
            highlights: highlights,
            exported: new Date().toISOString(),
            totalHighlights: highlights.length,
            colorBreakdown: colors.reduce((acc, color) => {
                acc[color.name] = highlights.filter(h => h.color === color.value).length;
                return acc;
            }, {} as Record<string, number>)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name.replace('.pdf', '')}-highlights-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`💾 Exported ${highlights.length} highlights successfully!`);
    };

    const scrollToHighlight = (highlight: Highlight) => {
        // Try to find the highlight in iframe first
        const iframe = iframeRef.current;
        let element: Element | null = null;

        if (iframe && iframe.contentDocument) {
            element = iframe.contentDocument.querySelector(`[data-highlight-id="${highlight.id}"]`);
        }

        // Fallback to main document
        if (!element) {
            element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
        }

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Enhanced highlight animation
            const htmlElement = element as HTMLElement;
            const originalBg = htmlElement.style.backgroundColor;
            const originalShadow = htmlElement.style.boxShadow;

            // Pulse animation
            htmlElement.style.backgroundColor = highlight.color;
            htmlElement.style.boxShadow = `0 0 20px ${highlight.color}60`;
            htmlElement.style.transform = 'scale(1.02)';
            htmlElement.style.transition = 'all 0.3s ease';

            setTimeout(() => {
                htmlElement.style.backgroundColor = originalBg;
                htmlElement.style.boxShadow = originalShadow;
                htmlElement.style.transform = 'scale(1)';
            }, 1500);

            showToast(`🎯 Navigated to highlight`);
        } else {
            showToast(`⚠️ Highlight not found in current view`, 'warning');
        }
    };

    // Filter highlights based on search
    const filteredHighlights = highlights.filter(highlight =>
        highlight.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectColor = (color: typeof colors[0]) => {
        setSelectedColor(color.value);
        setSelectedBackground(color.bg);
    };

    return (
        <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
            {/* Sidebar */}
            <div style={{
                width: "360px",
                backgroundColor: "white",
                borderRight: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                boxShadow: "2px 0 4px rgba(0,0,0,0.05)"
            }}>
                {/* Header */}
                <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    <h3 style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        marginBottom: "1rem",
                        color: "#1f2937",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                    }}>
                        <Highlighter size={20} />
                        Highlights ({highlights.length})
                    </h3>

                    {/* Highlighting Toggle */}
                    <button
                        onClick={() => setIsHighlighting(!isHighlighting)}
                        style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            backgroundColor: isHighlighting ? "#dc2626" : "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer",
                            marginBottom: "1rem",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem"
                        }}
                    >
                        <Highlighter size={16} />
                        {isHighlighting ? "Stop Highlighting" : "Start Highlighting"}
                    </button>

                    {isHighlighting && (
                        <div style={{
                            padding: "0.75rem",
                            backgroundColor: "#fef3c7",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            color: "#92400e",
                            border: "1px solid #fbbf24"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                <span style={{ fontSize: "1.2rem" }}>✨</span>
                                <strong>Highlighting Mode Active!</strong>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.8rem" }}>
                                Select any text in the PDF to highlight it instantly.
                            </p>
                            <div style={{
                                marginTop: "0.5rem",
                                fontSize: "0.75rem",
                                opacity: 0.8,
                                fontStyle: "italic"
                            }}>
                                💡 Shortcuts: Ctrl+H (toggle) • Ctrl+S (export)
                            </div>
                        </div>
                    )}
                </div>

                {/* Color Picker */}
                <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    <label style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "0.75rem"
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
                                onClick={() => selectColor(color)}
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "8px",
                                    backgroundColor: color.bg,
                                    border: selectedColor === color.value ? `3px solid ${color.value}` : "2px solid #e5e7eb",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    transform: selectedColor === color.value ? "scale(1.05)" : "scale(1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative"
                                }}
                                title={color.name}
                            >
                                <div style={{
                                    width: "24px",
                                    height: "6px",
                                    backgroundColor: color.value,
                                    borderRadius: "3px"
                                }} />
                                {selectedColor === color.value && (
                                    <div style={{
                                        position: "absolute",
                                        top: "2px",
                                        right: "2px",
                                        width: "8px",
                                        height: "8px",
                                        backgroundColor: color.value,
                                        borderRadius: "50%"
                                    }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search and Actions */}
                <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
                    <input
                        type="text"
                        placeholder="Search highlights..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            marginBottom: "0.75rem"
                        }}
                    />

                    {/* Statistics */}
                    {highlights.length > 0 && (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.5rem",
                            marginBottom: "0.75rem",
                            fontSize: "0.75rem"
                        }}>
                            <div style={{
                                padding: "0.5rem",
                                backgroundColor: "#f8fafc",
                                borderRadius: "4px",
                                textAlign: "center"
                            }}>
                                <div style={{ fontWeight: "600", color: "#1f2937" }}>{highlights.length}</div>
                                <div style={{ color: "#6b7280" }}>Total</div>
                            </div>
                            <div style={{
                                padding: "0.5rem",
                                backgroundColor: "#f8fafc",
                                borderRadius: "4px",
                                textAlign: "center"
                            }}>
                                <div style={{ fontWeight: "600", color: "#1f2937" }}>
                                    {new Set(highlights.map(h => h.color)).size}
                                </div>
                                <div style={{ color: "#6b7280" }}>Colors</div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                            onClick={exportHighlights}
                            disabled={highlights.length === 0}
                            style={{
                                flex: 1,
                                padding: "0.5rem",
                                backgroundColor: highlights.length > 0 ? "#3b82f6" : "#9ca3af",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                cursor: highlights.length > 0 ? "pointer" : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.25rem"
                            }}
                        >
                            <Download size={12} />
                            Export
                        </button>

                        <button
                            onClick={clearHighlights}
                            disabled={highlights.length === 0}
                            style={{
                                flex: 1,
                                padding: "0.5rem",
                                backgroundColor: highlights.length > 0 ? "#ef4444" : "#9ca3af",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                cursor: highlights.length > 0 ? "pointer" : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.25rem"
                            }}
                        >
                            <Trash2 size={12} />
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Highlights List */}
                <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
                    {filteredHighlights.length === 0 ? (
                        <div style={{
                            color: "#9ca3af",
                            fontSize: "0.875rem",
                            textAlign: "center",
                            padding: "2rem 1rem",
                            fontStyle: "italic"
                        }}>
                            {highlights.length === 0 ? (
                                <>
                                    <Highlighter size={48} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
                                    <p>No highlights yet!</p>
                                    <p style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                                        Click "Start Highlighting" and select text in the PDF.
                                    </p>
                                </>
                            ) : (
                                <p>No highlights match your search.</p>
                            )}
                        </div>
                    ) : (
                        filteredHighlights.map((highlight, index) => (
                            <div
                                key={highlight.id}
                                onClick={() => scrollToHighlight(highlight)}
                                style={{
                                    padding: "1rem",
                                    marginBottom: "0.75rem",
                                    backgroundColor: highlight.background,
                                    border: `2px solid ${highlight.color}`,
                                    borderRadius: "8px",
                                    fontSize: "0.875rem",
                                    position: "relative",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeHighlight(highlight.id);
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: "0.5rem",
                                        right: "0.5rem",
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "50%",
                                        border: "none",
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: 0.8,
                                        transition: "opacity 0.2s"
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
                                    title="Remove highlight"
                                >
                                    ×
                                </button>

                                <div style={{
                                    fontSize: "0.75rem",
                                    color: "#6b7280",
                                    marginBottom: "0.5rem",
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem"
                                }}>
                                    <div style={{
                                        width: "12px",
                                        height: "12px",
                                        backgroundColor: highlight.color,
                                        borderRadius: "2px"
                                    }} />
                                    #{index + 1} • {highlight.created}
                                </div>
                                <div style={{
                                    color: "#1f2937",
                                    lineHeight: "1.4",
                                    paddingRight: "2rem"
                                }}>
                                    "{highlight.text.length > 120 ? highlight.text.substring(0, 120) + "..." : highlight.text}"
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PDF Viewer */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#f3f4f6" }}>
                {/* PDF Controls */}
                <div style={{
                    padding: "1rem 1.5rem",
                    backgroundColor: "white",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <button
                            onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}
                            style={{
                                padding: "0.5rem 1rem",
                                border: "1px solid #d1d5db",
                                backgroundColor: "white",
                                borderRadius: "6px",
                                cursor: "pointer"
                            }}
                        >
                            Zoom Out
                        </button>
                        <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => setScale(prev => Math.min(prev + 0.1, 3))}
                            style={{
                                padding: "0.5rem 1rem",
                                border: "1px solid #d1d5db",
                                backgroundColor: "white",
                                borderRadius: "6px",
                                cursor: "pointer"
                            }}
                        >
                            Zoom In
                        </button>
                    </div>

                    <div style={{
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#6b7280"
                    }}>
                        {file.name} • {(file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                </div>

                {/* PDF Display */}
                <div style={{
                    flex: 1,
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    overflowY: "auto",
                    userSelect: isHighlighting ? "text" : "auto",
                    cursor: isHighlighting ? "crosshair" : "default"
                }}>
                    <div style={{
                        maxWidth: "100%",
                        transform: `scale(${scale})`,
                        transformOrigin: "top center",
                        transition: "transform 0.2s ease"
                    }}>
                        <iframe
                            ref={iframeRef}
                            src={pdfUrl}
                            style={{
                                width: "800px",
                                height: "1000px",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                backgroundColor: "white",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                            title="PDF Document Viewer"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}