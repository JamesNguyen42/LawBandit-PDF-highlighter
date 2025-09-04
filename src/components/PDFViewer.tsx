// Enhanced PDF Viewer with Direct Text Highlighting
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Highlighter, Trash2, Download, Search, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Copy, Palette } from 'lucide-react';

// Types
interface Highlight {
    id: string;
    text: string;
    color: string;
    background: string;
    pageNumber: number;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    created: string;
}

interface ColorOption {
    name: string;
    value: string;
    bg: string;
}

const PDFHighlighter = () => {
    // State
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [selectedColor, setSelectedColor] = useState('#fbbf24');
    const [selectedBackground, setSelectedBackground] = useState('#fef3c7');
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedText, setSelectedText] = useState('');

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const highlightLayerRef = useRef<HTMLDivElement>(null);

    // Color options
    const colors: ColorOption[] = [
        { name: 'Yellow', value: '#fbbf24', bg: '#fef3c7' },
        { name: 'Blue', value: '#3b82f6', bg: '#dbeafe' },
        { name: 'Green', value: '#10b981', bg: '#d1fae5' },
        { name: 'Pink', value: '#ec4899', bg: '#fce7f3' },
        { name: 'Purple', value: '#8b5cf6', bg: '#ede9fe' },
        { name: 'Orange', value: '#f97316', bg: '#fed7aa' },
    ];

    // Load PDF.js
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.async = true;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Handle file upload
    const handleFileUpload = async (uploadedFile: File) => {
        if (uploadedFile.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        setFile(uploadedFile);
        setIsLoading(true);

        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);

            // Render first page
            renderPage(pdf, 1);
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file');
        } finally {
            setIsLoading(false);
        }
    };

    // Render PDF page
    const renderPage = async (pdf: any, pageNum: number) => {
        if (!pdf || !canvasRef.current || !textLayerRef.current) return;

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            await page.render(renderContext).promise;

            // Render text layer for selection
            const textContent = await page.getTextContent();
            const textLayer = textLayerRef.current;

            // Clear previous text layer
            textLayer.innerHTML = '';
            textLayer.style.width = viewport.width + 'px';
            textLayer.style.height = viewport.height + 'px';

            // Build text layer
            window.pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayer,
                viewport: viewport,
                textDivs: [],
            });

            // Render existing highlights for this page
            renderHighlights(pageNum);
        } catch (error) {
            console.error('Error rendering page:', error);
        }
    };

    // Render highlights
    const renderHighlights = (pageNum: number) => {
        if (!highlightLayerRef.current) return;

        const layer = highlightLayerRef.current;
        layer.innerHTML = '';

        const pageHighlights = highlights.filter(h => h.pageNumber === pageNum);

        pageHighlights.forEach(highlight => {
            if (highlight.position) {
                const highlightDiv = document.createElement('div');
                highlightDiv.style.position = 'absolute';
                highlightDiv.style.left = highlight.position.x + 'px';
                highlightDiv.style.top = highlight.position.y + 'px';
                highlightDiv.style.width = highlight.position.width + 'px';
                highlightDiv.style.height = highlight.position.height + 'px';
                highlightDiv.style.backgroundColor = highlight.background;
                highlightDiv.style.opacity = '0.4';
                highlightDiv.style.pointerEvents = 'none';
                layer.appendChild(highlightDiv);
            }
        });
    };

    // Handle text selection
    useEffect(() => {
        const handleSelection = () => {
            if (!isHighlighting) return;

            const selection = window.getSelection();
            const text = selection?.toString().trim();

            if (text && text.length > 2) {
                setSelectedText(text);

                // Auto-highlight after a brief delay
                setTimeout(() => {
                    if (window.getSelection()?.toString().trim() === text) {
                        createHighlight(text);
                        window.getSelection()?.removeAllRanges();
                    }
                }, 500);
            }
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('touchend', handleSelection);

        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('touchend', handleSelection);
        };
    }, [isHighlighting, selectedColor, selectedBackground, currentPage]);

    // Create highlight
    const createHighlight = (text: string) => {
        if (!text || text.length < 3) return;

        // Get selection position
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const textLayer = textLayerRef.current;

        let position = undefined;
        if (textLayer) {
            const textLayerRect = textLayer.getBoundingClientRect();
            position = {
                x: rect.left - textLayerRect.left,
                y: rect.top - textLayerRect.top,
                width: rect.width,
                height: rect.height,
            };
        }

        const newHighlight: Highlight = {
            id: Date.now().toString(),
            text: text.trim(),
            color: selectedColor,
            background: selectedBackground,
            pageNumber: currentPage,
            position,
            created: new Date().toLocaleTimeString(),
        };

        setHighlights(prev => [...prev, newHighlight]);
        showToast(`Highlighted: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);

        // Re-render highlights
        renderHighlights(currentPage);
    };

    // Toast notification
    const showToast = (message: string) => {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };

    // Navigation
    const goToPage = (pageNum: number) => {
        if (pageNum < 1 || pageNum > totalPages || !pdfDoc) return;
        setCurrentPage(pageNum);
        renderPage(pdfDoc, pageNum);
    };

    // Zoom
    const handleZoom = (newScale: number) => {
        setScale(newScale);
        if (pdfDoc) {
            renderPage(pdfDoc, currentPage);
        }
    };

    // Export highlights
    const exportHighlights = () => {
        if (highlights.length === 0) {
            showToast('No highlights to export');
            return;
        }

        const data = {
            filename: file?.name,
            highlights: highlights,
            totalPages: totalPages,
            exported: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `highlights-${file?.name?.replace('.pdf', '')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast(`Exported ${highlights.length} highlights`);
    };

    // Filter highlights
    const filteredHighlights = highlights.filter(h =>
        h.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Main render
    if (!file) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#f9fafb',
                padding: '2rem',
            }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    textAlign: 'center',
                }}>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: '1rem',
                    }}>
                        LawBandit PDF Highlighter
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: '#6b7280',
                        marginBottom: '3rem',
                    }}>
                        Enhanced PDF reader with smooth, direct text highlighting
                    </p>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed #d1d5db',
                            borderRadius: '1rem',
                            padding: '4rem 2rem',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.backgroundColor = '#f0f9ff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.backgroundColor = 'white';
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Upload PDF Document
                        </h3>
                        <p style={{ color: '#6b7280' }}>
                            Click to browse or drag and drop your PDF here
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6' }}>
            {/* Sidebar */}
            <div style={{
                width: '360px',
                backgroundColor: 'white',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <Highlighter size={20} />
                        Highlights ({highlights.length})
                    </h3>

                    <button
                        onClick={() => setIsHighlighting(!isHighlighting)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: isHighlighting ? '#ef4444' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <Highlighter size={16} />
                        {isHighlighting ? 'Stop Highlighting' : 'Start Highlighting'}
                    </button>
                </div>

                {/* Status */}
                {isHighlighting && (
                    <div style={{
                        padding: '1rem 1.5rem',
                        backgroundColor: '#fef3c7',
                        borderBottom: '1px solid #fbbf24',
                        fontSize: '0.875rem',
                        color: '#92400e',
                    }}>
                        <strong>🎯 Active:</strong> Select text to highlight
                    </div>
                )}

                {/* Color Picker */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <label style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.75rem',
                        display: 'block',
                    }}>
                        Highlight Color:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {colors.map((color) => (
                            <button
                                key={color.name}
                                onClick={() => {
                                    setSelectedColor(color.value);
                                    setSelectedBackground(color.bg);
                                }}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '0.5rem',
                                    backgroundColor: color.bg,
                                    border: selectedColor === color.value ? `3px solid ${color.value}` : '2px solid #e5e7eb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title={color.name}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '4px',
                                    backgroundColor: color.value,
                                    borderRadius: '2px',
                                }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <input
                        type="text"
                        placeholder="Search highlights..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            marginBottom: '0.75rem',
                        }}
                    />

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={exportHighlights}
                            disabled={highlights.length === 0}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                backgroundColor: highlights.length > 0 ? '#3b82f6' : '#9ca3af',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: highlights.length > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                            }}
                        >
                            <Download size={14} />
                            Export
                        </button>

                        <button
                            onClick={() => {
                                setHighlights([]);
                                renderHighlights(currentPage);
                            }}
                            disabled={highlights.length === 0}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                backgroundColor: highlights.length > 0 ? '#ef4444' : '#9ca3af',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: highlights.length > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                            }}
                        >
                            <Trash2 size={14} />
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Highlights List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {filteredHighlights.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#9ca3af',
                        }}>
                            {highlights.length === 0 ? 'No highlights yet' : 'No matching highlights'}
                        </div>
                    ) : (
                        filteredHighlights.map((highlight, index) => (
                            <div
                                key={highlight.id}
                                onClick={() => goToPage(highlight.pageNumber)}
                                style={{
                                    padding: '1rem',
                                    marginBottom: '0.75rem',
                                    backgroundColor: highlight.background,
                                    borderLeft: `4px solid ${highlight.color}`,
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHighlights(prev => prev.filter(h => h.id !== highlight.id));
                                        renderHighlights(currentPage);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    ×
                                </button>

                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    marginBottom: '0.5rem',
                                }}>
                                    Page {highlight.pageNumber} • {highlight.created}
                                </div>

                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#1f2937',
                                    paddingRight: '2rem',
                                }}>
                                    "{highlight.text.substring(0, 100)}
                                    {highlight.text.length > 100 ? '...' : ''}"
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PDF Viewer */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Controls */}
                <div style={{
                    padding: '1rem 1.5rem',
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setFile(null)}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                            }}
                        >
                            ← Back
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage <= 1}
                                style={{
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'white',
                                    cursor: currentPage > 1 ? 'pointer' : 'not-allowed',
                                    opacity: currentPage > 1 ? 1 : 0.5,
                                }}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <span style={{ padding: '0 1rem', fontSize: '0.875rem' }}>
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                style={{
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'white',
                                    cursor: currentPage < totalPages ? 'pointer' : 'not-allowed',
                                    opacity: currentPage < totalPages ? 1 : 0.5,
                                }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => handleZoom(Math.max(0.5, scale - 0.25))}
                                style={{
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                }}
                            >
                                <ZoomOut size={16} />
                            </button>

                            <span style={{ padding: '0 0.5rem', fontSize: '0.875rem', minWidth: '60px', textAlign: 'center' }}>
                                {Math.round(scale * 100)}%
                            </span>

                            <button
                                onClick={() => handleZoom(Math.min(3, scale + 0.25))}
                                style={{
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                }}
                            >
                                <ZoomIn size={16} />
                            </button>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {file.name}
                    </div>
                </div>

                {/* PDF Canvas */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '2rem',
                    backgroundColor: '#e5e7eb',
                }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading PDF...</div>
                        </div>
                    ) : (
                        <div style={{
                            position: 'relative',
                            backgroundColor: 'white',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            userSelect: isHighlighting ? 'text' : 'none',
                        }}>
                            <canvas
                                ref={canvasRef}
                                style={{
                                    display: 'block',
                                }}
                            />
                            <div
                                ref={textLayerRef}
                                className="textLayer"
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    right: 0,
                                    bottom: 0,
                                    overflow: 'hidden',
                                    opacity: 0.2,
                                    lineHeight: 1,
                                    userSelect: isHighlighting ? 'text' : 'none',
                                    cursor: isHighlighting ? 'text' : 'default',
                                }}
                            />
                            <div
                                ref={highlightLayerRef}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    right: 0,
                                    bottom: 0,
                                    pointerEvents: 'none',
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .textLayer {
          font-family: sans-serif;
        }
        .textLayer > span {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .textLayer ::selection {
          background: rgba(59, 130, 246, 0.3);
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
};

// Extend window to include PDF.js
declare global {
    interface Window {
        pdfjsLib: any;
    }
}

export default PDFHighlighter;