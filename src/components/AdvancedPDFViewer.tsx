// src/components/AdvancedPDFViewer.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface PDFViewerProps {
    file: File;
}

interface Highlight {
    id: string;
    text: string;
    color: string;
    created: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
    };
}

export default function AdvancedPDFViewer({ file }: PDFViewerProps) {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.2);
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [selectedColor, setSelectedColor] = useState("#fbbf24");
    const [isSelecting, setIsSelecting] = useState(false);
    const [selection, setSelection] = useState<{
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const colors = [
        { name: "Yellow", value: "#fbbf24", bg: "#fef3c7" },
        { name: "Blue", value: "#3b82f6", bg: "#dbeafe" },
        { name: "Green", value: "#10b981", bg: "#d1fae5" },
        { name: "Pink", value: "#ec4899", bg: "#fce7f3" },
        { name: "Purple", value: "#8b5cf6", bg: "#ede9fe" },
        { name: "Orange", value: "#f97316", bg: "#fed7aa" },
    ];

    useEffect(() => {
        const loadPDF = async () => {
            try {
                // Dynamically import PDF.js to avoid SSR issues
                const pdfjsLib = await import('pdfjs-dist/build/pdf');

                // Set worker
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                setPdfDoc(pdf);
                setNumPages(pdf.numPages);

                // Render first page
                renderPage(pdf, 1);
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
        };

        if (file) {
            loadPDF();
        }
    }, [file]);

    const renderPage = async (pdf: any, pageNum: number) => {
        if (!pdf || !canvasRef.current || !textLayerRef.current) return;

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.width = viewport.width + 'px';
            canvas.style.height = viewport.height + 'px';

            // Render PDF page
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Clear and set up text layer
            const textLayer = textLayerRef.current;
            textLayer.innerHTML = '';
            textLayer.style.width = viewport.width + 'px';
            textLayer.style.height = viewport.height + 'px';

            // Get text content
            const textContent = await page.getTextContent();

            // Create text elements for selection
            textContent.items.forEach((item: any, index: number) => {
                const textDiv = document.createElement('div');
                textDiv.style.position = 'absolute';
                textDiv.style.left = (item.transform[4] * scale) + 'px';
                textDiv.style.top = (viewport.height - item.transform[5] * scale) + 'px';
                textDiv.style.fontSize = (item.height * scale) + 'px';
                textDiv.style.fontFamily = item.fontName;
                textDiv.style.transform = `scaleX(${item.transform[0] / item.height})`;
                textDiv.style.color = 'transparent';
                textDiv.style.cursor = 'text';
                textDiv.style.userSelect = 'text';
                textDiv.textContent = item.str;
                textDiv.dataset.textIndex = index.toString();

                textLayer.appendChild(textDiv);
            });

            // Redraw highlights for this page
            drawHighlights();

        } catch (error) {
            console.error('Error rendering page:', error);
        }
    };

    const drawHighlights = () => {
        const pageHighlights = highlights.filter(h => h.page === currentPage);

        pageHighlights.forEach(highlight => {
            const highlightDiv = document.createElement('div');
            highlightDiv.style.position = 'absolute';
            highlightDiv.style.left = highlight.position.x + 'px';
            highlightDiv.style.top = highlight.position.y + 'px';
            highlightDiv.style.width = highlight.position.width + 'px';
            highlightDiv.style.height = highlight.position.height + 'px';
            highlightDiv.style.backgroundColor = highlight.color + '40';
            highlightDiv.style.border = `1px solid ${highlight.color}`;
            highlightDiv.style.pointerEvents = 'none';
            highlightDiv.style.borderRadius = '2px';

            if (containerRef.current) {
                containerRef.current.appendChild(highlightDiv);
            }
        });
    };

    useEffect(() => {
        if (pdfDoc && currentPage) {
            renderPage(pdfDoc, currentPage);
        }
    }, [pdfDoc, currentPage, scale, highlights]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        setIsSelecting(true);
        setSelection({
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top,
            endX: e.clientX - rect.left,
            endY: e.clientY - rect.top,
        });
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isSelecting || !selection) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        setSelection(prev => prev ? {
            ...prev,
            endX: e.clientX - rect.left,
            endY: e.clientY - rect.top,
        } : null);
    }, [isSelecting, selection]);

    const handleMouseUp = useCallback(() => {
        if (!isSelecting || !selection) return;

        const selectedText = window.getSelection()?.toString().trim();

        if (selectedText && selectedText.length > 0) {
            const newHighlight: Highlight = {
                id: Date.now().toString(),
                text: selectedText,
                color: selectedColor,
                created: new Date().toLocaleString(),
                position: {
                    x: Math.min(selection.startX, selection.endX),
                    y: Math.min(selection.startY, selection.endY),
                    width: Math.abs(selection.endX - selection.startX),
                    height: Math.abs(selection.endY - selection.startY),
                    page: currentPage,
                },
            };

            setHighlights(prev => [...prev, newHighlight]);
        }

        setIsSelecting(false);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    }, [isSelecting, selection, selectedColor, currentPage]);

    const removeHighlight = (id: string) => {
        setHighlights(prev => prev.filter(h => h.id !== id));
    };

    const clearHighlights = () => {
        setHighlights([]);
    };

    const goToNextPage = () => {
        if (currentPage < numPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    if (!pdfDoc) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1.25rem',
                color: '#6b7280'
            }}>
                Loading PDF...
            </div>
        );
    }

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

                {/* Controls */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                        <button
                            onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))}
                            className="btn"
                            style={{ flex: 1, border: "1px solid #d1d5db", backgroundColor: "white" }}
                        >
                            Zoom Out
                        </button>
                        <button
                            onClick={() => setScale(prev => Math.min(3, prev + 0.2))}
                            className="btn"
                            style={{ flex: 1, border: "1px solid #d1d5db", backgroundColor: "white" }}
                        >
                            Zoom In
                        </button>
                    </div>

                    <div style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
                        {Math.round(scale * 100)}% • Page {currentPage} of {numPages}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                            onClick={goToPrevPage}
                            disabled={currentPage <= 1}
                            className="btn"
                            style={{
                                flex: 1,
                                border: "1px solid #d1d5db",
                                backgroundColor: currentPage <= 1 ? "#f9fafb" : "white",
                                color: currentPage <= 1 ? "#9ca3af" : "#374151",
                                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                            }}
                        >
                            Previous
                        </button>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage >= numPages}
                            className="btn"
                            style={{
                                flex: 1,
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

                {/* Action Buttons */}
                {highlights.length > 0 && (
                    <button
                        onClick={clearHighlights}
                        className="btn"
                        style={{
                            width: "100%",
                            backgroundColor: "#ef4444",
                            color: "white",
                            fontSize: "0.875rem",
                            marginBottom: "1.5rem"
                        }}
                    >
                        Clear All Highlights
                    </button>
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
                    <strong>How to highlight:</strong><br />
                    1. Click and drag to select text in the PDF<br />
                    2. Choose your highlight color above<br />
                    3. Text will be highlighted automatically
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
                            No highlights yet. Click and drag to select text in the PDF!
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
                                    cursor: "pointer",
                                }}
                                onClick={() => {
                                    if (highlight.position.page !== currentPage) {
                                        setCurrentPage(highlight.position.page);
                                    }
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
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "50%",
                                        border: "none",
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        cursor: "pointer",
                                        fontSize: "12px",
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
                                    Page {highlight.position.page} • {highlight.created}
                                </div>
                                <div style={{
                                    color: "#1f2937",
                                    lineHeight: "1.4",
                                    paddingRight: "1.5rem"
                                }}>
                                    "{highlight.text.length > 100 ? highlight.text.substring(0, 100) + "..." : highlight.text}"
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main PDF Viewer */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#f3f4f6" }}>
                <div
                    ref={containerRef}
                    style={{
                        flex: 1,
                        overflow: "auto",
                        padding: "2rem",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "flex-start",
                        position: "relative"
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                >
                    <div style={{ position: "relative", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
                        <canvas
                            ref={canvasRef}
                            style={{
                                display: "block",
                                backgroundColor: "white",
                                borderRadius: "4px"
                            }}
                        />
                        <div
                            ref={textLayerRef}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                pointerEvents: "auto",
                                userSelect: "text"
                            }}
                        />

                        {/* Current selection overlay */}
                        {isSelecting && selection && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: Math.min(selection.startX, selection.endX),
                                    top: Math.min(selection.startY, selection.endY),
                                    width: Math.abs(selection.endX - selection.startX),
                                    height: Math.abs(selection.endY - selection.startY),
                                    backgroundColor: selectedColor + "30",
                                    border: `2px solid ${selectedColor}`,
                                    pointerEvents: "none",
                                    borderRadius: "2px"
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}