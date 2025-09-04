// src/components/PDFViewer.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Highlighter, Trash2, Download, Plus, Copy } from "lucide-react";

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
    const [showAddText, setShowAddText] = useState(false);
    const [manualText, setManualText] = useState("");
    const [lastSelectedText, setLastSelectedText] = useState("");

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const selectionCheckInterval = useRef<NodeJS.Timeout | null>(null);

    const colors = [
        { name: "Yellow", value: "#fbbf24", bg: "#fef3c7" },
        { name: "Blue", value: "#3b82f6", bg: "#dbeafe" },
        { name: "Green", value: "#10b981", bg: "#d1fae5" },
        { name: "Pink", value: "#ec4899", bg: "#fce7f3" },
        { name: "Purple", value: "#8b5cf6", bg: "#ede9fe" },
        { name: "Orange", value: "#f97316", bg: "#fed7aa" },
    ];

    // Initialize PDF URL
    useEffect(() => {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Toast notification system
    const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'success') => {
        const toastColors = {
            success: { bg: '#10b981', icon: '✨' },
            warning: { bg: '#f59e0b', icon: '⚠️' },
            info: { bg: '#3b82f6', icon: 'ℹ️' }
        };

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${toastColors[type].bg};
            color: white;
            padding: 12px 18px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 350px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        toast.innerHTML = `${toastColors[type].icon} ${message}`;
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 50);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }, []);

    // Create highlight function
    const createHighlight = useCallback((text: string) => {
        if (!text || text.length < 3) {
            showToast("Text too short to highlight", 'warning');
            return;
        }

        // Check for duplicates
        const isDuplicate = highlights.some(h =>
            h.text.toLowerCase().trim() === text.toLowerCase().trim()
        );

        if (isDuplicate) {
            showToast("Text already highlighted!", 'warning');
            return;
        }

        const newHighlight: Highlight = {
            id: Date.now().toString(),
            text: text.trim(),
            color: selectedColor,
            background: selectedBackground,
            created: new Date().toLocaleString(),
        };

        setHighlights(prev => [...prev, newHighlight]);
        showToast(`Highlighted: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    }, [highlights, selectedColor, selectedBackground, showToast]);

    // Monitor text selections
    const monitorSelection = useCallback(() => {
        if (!isHighlighting) return;

        const checkForSelection = () => {
            // Check main document selection
            const mainSelection = window.getSelection();
            const mainText = mainSelection?.toString().trim() || "";

            // Try to check iframe selection (may fail due to CORS)
            let iframeText = "";
            try {
                const iframe = iframeRef.current;
                if (iframe?.contentDocument) {
                    const iframeSelection = iframe.contentDocument.getSelection();
                    iframeText = iframeSelection?.toString().trim() || "";
                }
            } catch (e) {
                // CORS restrictions - this is expected
            }

            const selectedText = iframeText || mainText;

            if (selectedText && selectedText.length >= 3 && selectedText !== lastSelectedText) {
                setLastSelectedText(selectedText);
                // Auto-highlight after a brief delay
                setTimeout(() => {
                    if (window.getSelection()?.toString().trim() === selectedText) {
                        createHighlight(selectedText);
                        // Clear selection
                        window.getSelection()?.removeAllRanges();
                        setLastSelectedText("");
                    }
                }, 1000);
            }
        };

        // Check for selections every 300ms
        selectionCheckInterval.current = setInterval(checkForSelection, 300);

        return () => {
            if (selectionCheckInterval.current) {
                clearInterval(selectionCheckInterval.current);
            }
        };
    }, [isHighlighting, lastSelectedText, createHighlight]);

    // Start/stop selection monitoring
    useEffect(() => {
        if (isHighlighting) {
            return monitorSelection();
        } else {
            if (selectionCheckInterval.current) {
                clearInterval(selectionCheckInterval.current);
            }
        }
    }, [isHighlighting, monitorSelection]);

    // Manual highlight functions
    const addManualHighlight = useCallback(() => {
        if (!manualText.trim()) {
            showToast("Please enter some text", 'warning');
            return;
        }
        createHighlight(manualText.trim());
        setManualText("");
        setShowAddText(false);
    }, [manualText, createHighlight, showToast]);

    const copyLastSelected = useCallback(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText && selectedText.length >= 3) {
            setManualText(selectedText);
            setShowAddText(true);
            showToast("Text copied to input", 'info');
        } else {
            showToast("No text selected", 'warning');
        }
    }, [showToast]);

    // Highlight management
    const removeHighlight = useCallback((id: string) => {
        setHighlights(prev => prev.filter(h => h.id !== id));
        showToast("Highlight removed", 'info');
    }, [showToast]);

    const clearHighlights = useCallback(() => {
        if (highlights.length === 0) return;
        const count = highlights.length;
        setHighlights([]);
        showToast(`Cleared ${count} highlights`, 'info');
    }, [highlights.length, showToast]);

    // Export functionality
    const exportHighlights = useCallback(() => {
        if (highlights.length === 0) {
            showToast("No highlights to export", 'warning');
            return;
        }

        const exportData = {
            filename: file.name,
            highlights: highlights,
            exported: new Date().toISOString(),
            totalHighlights: highlights.length,
            colorBreakdown: colors.reduce((acc, color) => {
                acc[color.name] = highlights.filter(h => h.color === color.value).length;
                return acc;
            }, {} as Record<string, number>)
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name.replace('.pdf', '')}-highlights.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Exported ${highlights.length} highlights`);
    }, [highlights, file.name, showToast, colors]);

    // Color selection
    const selectColor = useCallback((color: typeof colors[0]) => {
        setSelectedColor(color.value);
        setSelectedBackground(color.bg);
        showToast(`Selected ${color.name} color`, 'info');
    }, [showToast]);

    // Filter highlights
    const filteredHighlights = highlights.filter(highlight =>
        highlight.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{
            display: "flex",
            height: "100vh",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
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
                <div style={{
                    padding: "20px",
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb"
                }}>
                    <h3 style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        marginBottom: "16px",
                        color: "#1f2937",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <Highlighter size={20} />
                        Highlights ({highlights.length})
                    </h3>

                    {/* Toggle Highlighting */}
                    <button
                        onClick={() => {
                            setIsHighlighting(!isHighlighting);
                            if (!isHighlighting) {
                                showToast("Highlighting mode activated!", 'info');
                            } else {
                                showToast("Highlighting mode deactivated", 'info');
                            }
                        }}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            backgroundColor: isHighlighting ? "#ef4444" : "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.2s ease"
                        }}
                    >
                        <Highlighter size={16} />
                        {isHighlighting ? "Stop Highlighting" : "Start Highlighting"}
                    </button>
                </div>

                {/* Highlighting Status */}
                {isHighlighting && (
                    <div style={{
                        padding: "16px 20px",
                        backgroundColor: "#fef3c7",
                        borderBottom: "1px solid #fbbf24",
                        color: "#92400e",
                        fontSize: "14px"
                    }}>
                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                            🎯 Highlighting Active
                        </div>
                        <div style={{ fontSize: "12px", opacity: 0.9 }}>
                            Select text in the PDF to highlight it automatically
                        </div>
                    </div>
                )}

                {/* Color Picker */}
                <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}>
                    <label style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#374151",
                        display: "block",
                        marginBottom: "12px"
                    }}>
                        Highlight Color:
                    </label>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px"
                    }}>
                        {colors.map((color) => (
                            <button
                                key={color.name}
                                onClick={() => selectColor(color)}
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "8px",
                                    backgroundColor: color.bg,
                                    border: selectedColor === color.value
                                        ? `3px solid ${color.value}`
                                        : "2px solid #e5e7eb",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transform: selectedColor === color.value ? "scale(1.05)" : "scale(1)"
                                }}
                                title={color.name}
                            >
                                <div style={{
                                    width: "20px",
                                    height: "4px",
                                    backgroundColor: color.value,
                                    borderRadius: "2px"
                                }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Manual Input */}
                <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <button
                            onClick={() => setShowAddText(!showAddText)}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                backgroundColor: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px"
                            }}
                        >
                            <Plus size={14} />
                            Add Text
                        </button>

                        <button
                            onClick={copyLastSelected}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                backgroundColor: "#6366f1",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px"
                            }}
                        >
                            <Copy size={14} />
                            Copy
                        </button>
                    </div>

                    {showAddText && (
                        <div style={{
                            padding: "16px",
                            backgroundColor: "#f8fafc",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0"
                        }}>
                            <textarea
                                value={manualText}
                                onChange={(e) => setManualText(e.target.value)}
                                placeholder="Paste or type text to highlight..."
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    resize: "vertical",
                                    minHeight: "80px",
                                    fontFamily: "inherit"
                                }}
                            />
                            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                                <button
                                    onClick={addManualHighlight}
                                    disabled={!manualText.trim()}
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        backgroundColor: manualText.trim() ? "#10b981" : "#9ca3af",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: manualText.trim() ? "pointer" : "not-allowed"
                                    }}
                                >
                                    Add Highlight
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddText(false);
                                        setManualText("");
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        backgroundColor: "#6b7280",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search and Actions */}
                <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}>
                    <input
                        type="text"
                        placeholder="Search highlights..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            marginBottom: "12px"
                        }}
                    />

                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            onClick={exportHighlights}
                            disabled={highlights.length === 0}
                            style={{
                                flex: 1,
                                padding: "8px 12px",
                                backgroundColor: highlights.length > 0 ? "#3b82f6" : "#9ca3af",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: highlights.length > 0 ? "pointer" : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px"
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
                                padding: "8px 12px",
                                backgroundColor: highlights.length > 0 ? "#ef4444" : "#9ca3af",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: highlights.length > 0 ? "pointer" : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px"
                            }}
                        >
                            <Trash2 size={12} />
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Highlights List */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px"
                }}>
                    {filteredHighlights.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "40px 20px",
                            color: "#9ca3af",
                            fontSize: "14px"
                        }}>
                            {highlights.length === 0 ? (
                                <>
                                    <Highlighter size={48} style={{
                                        margin: "0 auto 16px",
                                        opacity: 0.3,
                                        display: "block"
                                    }} />
                                    <p>No highlights yet!</p>
                                    <p style={{ fontSize: "12px", marginTop: "8px", opacity: 0.8 }}>
                                        Start highlighting mode and select text in the PDF
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
                                style={{
                                    padding: "16px",
                                    marginBottom: "12px",
                                    backgroundColor: highlight.background,
                                    border: `2px solid ${highlight.color}`,
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    position: "relative",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeHighlight(highlight.id);
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: "8px",
                                        right: "8px",
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
                                        opacity: 0.8
                                    }}
                                    title="Remove highlight"
                                >
                                    ×
                                </button>

                                <div style={{
                                    fontSize: "12px",
                                    color: "#6b7280",
                                    marginBottom: "8px",
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
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
                                    paddingRight: "32px",
                                    fontWeight: "500"
                                }}>
                                    "{highlight.text.length > 120
                                        ? highlight.text.substring(0, 120) + "..."
                                        : highlight.text}"
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PDF Viewer */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#f3f4f6"
            }}>
                {/* Controls */}
                <div style={{
                    padding: "16px 24px",
                    backgroundColor: "white",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                            onClick={() => setScale(Math.max(scale - 0.1, 0.5))}
                            style={{
                                padding: "8px 12px",
                                border: "1px solid #d1d5db",
                                backgroundColor: "white",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px"
                            }}
                        >
                            Zoom Out
                        </button>
                        <span style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            minWidth: "60px",
                            textAlign: "center"
                        }}>
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => setScale(Math.min(scale + 0.1, 3))}
                            style={{
                                padding: "8px 12px",
                                border: "1px solid #d1d5db",
                                backgroundColor: "white",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px"
                            }}
                        >
                            Zoom In
                        </button>
                    </div>

                    <div style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#6b7280"
                    }}>
                        {file.name} • {(file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                </div>

                {/* PDF Display */}
                <div style={{
                    flex: 1,
                    padding: "24px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    overflowY: "auto",
                    userSelect: isHighlighting ? "text" : "auto",
                    cursor: isHighlighting ? "crosshair" : "default"
                }}>
                    <div style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "top center",
                        transition: "transform 0.2s ease",
                        border: isHighlighting ? "2px solid #fbbf24" : "none",
                        borderRadius: isHighlighting ? "8px" : "0",
                        overflow: "hidden"
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
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                            }}
                            title="PDF Document Viewer"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}