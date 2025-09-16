// Enhanced PDF Viewer with Direct Text Highlighting - FIXED VERSION
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
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
    const [customColors, setCustomColors] = useState<ColorOption[]>([]);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Refs
    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
    const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const highlightLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Color options with ability to add custom colors
    const defaultColors: ColorOption[] = [
        { name: 'Yellow', value: '#fbbf24', bg: '#fef3c7' },
        { name: 'Blue', value: '#3b82f6', bg: '#dbeafe' },
        { name: 'Green', value: '#10b981', bg: '#d1fae5' },
        { name: 'Pink', value: '#ec4899', bg: '#fce7f3' },
        { name: 'Purple', value: '#8b5cf6', bg: '#ede9fe' },
        { name: 'Orange', value: '#f97316', bg: '#fed7aa' },
    ];

    // All colors (default + custom)
    const allColors = [...defaultColors, ...customColors];

    // Helper function to generate background color from main color
    const generateBackgroundColor = (mainColor: string) => {
        // Convert hex to RGB
        const hex = mainColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Create a lighter version (increase brightness)
        const lighten = (color: number) => Math.min(255, Math.floor(color + (255 - color) * 0.7));

        const lightR = lighten(r);
        const lightG = lighten(g);
        const lightB = lighten(b);

        return `rgb(${lightR}, ${lightG}, ${lightB})`;
    };

    // Add custom color
    const addCustomColor = (colorHex: string) => {
        const backgroundColor = generateBackgroundColor(colorHex);
        const colorName = `Custom ${customColors.length + 1}`;

        const newColor: ColorOption = {
            name: colorName,
            value: colorHex,
            bg: backgroundColor,
        };

        setCustomColors(prev => [...prev, newColor]);
        setShowColorPicker(false);

        // Auto-select the new color
        setSelectedColor(colorHex);
        setSelectedBackground(backgroundColor);

        showToast(`Added custom color: ${colorHex}`);
    };

    // Remove custom color
    const removeCustomColor = (colorValue: string) => {
        setCustomColors(prev => prev.filter(color => color.value !== colorValue));

        // If we're removing the currently selected color, switch to yellow
        if (selectedColor === colorValue) {
            setSelectedColor('#fbbf24');
            setSelectedBackground('#fef3c7');
        }

        showToast('Custom color removed');
    };

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
        setRenderedPages(new Set());

        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);

            // Render first few pages
            renderPage(pdf, 1);
            if (pdf.numPages > 1) renderPage(pdf, 2);
            if (pdf.numPages > 2) renderPage(pdf, 3);
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file');
        } finally {
            setIsLoading(false);
        }
    };

    // Render PDF page
    const renderPage = async (pdf: any, pageNum: number) => {
        if (!pdf || renderedPages.has(pageNum)) return;

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRefs.current.get(pageNum);
            const textLayer = textLayerRefs.current.get(pageNum);

            if (!canvas || !textLayer) return;

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

            // Mark as rendered
            setRenderedPages(prev => new Set([...prev, pageNum]));

            // Render existing highlights for this page
            setTimeout(() => renderHighlights(pageNum), 200);
        } catch (error) {
            console.error('Error rendering page:', error);
        }
    };

    // Render highlights - Force re-render with current highlights state
    const renderHighlights = useCallback((pageNum: number, highlightsToRender?: Highlight[]) => {
        const highlightLayer = highlightLayerRefs.current.get(pageNum);
        if (!highlightLayer) return;

        // Force clear the layer
        while (highlightLayer.firstChild) {
            highlightLayer.removeChild(highlightLayer.firstChild);
        }

        // Use provided highlights or current state
        const currentHighlights = highlightsToRender || highlights;
        const pageHighlights = currentHighlights.filter(h => h.pageNumber === pageNum);

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
                highlightDiv.style.borderRadius = '2px';
                highlightDiv.className = 'pdf-highlight';
                highlightLayer.appendChild(highlightDiv);
            }
        });
    }, [highlights]);

    // Create highlight function - Fixed to immediately render
    const createHighlight = useCallback((text: string, color: string, background: string) => {
        if (!text || text.length < 2) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Find which text layer this selection is in
        let selectedPageNum = currentPage;
        let textLayer = textLayerRefs.current.get(currentPage);

        // Check if selection is in a different page's text layer
        for (let [pageNum, layer] of textLayerRefs.current) {
            const layerRect = layer.getBoundingClientRect();
            if (rect.top >= layerRect.top && rect.bottom <= layerRect.bottom) {
                selectedPageNum = pageNum;
                textLayer = layer;
                break;
            }
        }

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
            id: Date.now().toString() + Math.random().toString(36),
            text: text.trim(),
            color: color,
            background: background,
            pageNumber: selectedPageNum,
            position,
            created: new Date().toLocaleTimeString(),
        };

        // Update highlights state
        const updatedHighlights = [...highlights, newHighlight];
        setHighlights(updatedHighlights);

        // Force immediate re-render with the new highlights
        renderHighlights(selectedPageNum, updatedHighlights);

        showToast(`Highlighted: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);

        // Clear selection
        selection.removeAllRanges();
    }, [currentPage, highlights, renderHighlights]);

    // Handle color selection - this now creates the highlight
    const handleColorSelection = useCallback((color: ColorOption) => {
        setSelectedColor(color.value);
        setSelectedBackground(color.bg);

        // Get current selection and create highlight immediately
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 2) {
            createHighlight(text, color.value, color.bg);
        }
    }, [createHighlight]);

    // Handle text selection for preview
    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            setSelectedText(text || '');
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('touchend', handleSelection);

        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('touchend', handleSelection);
        };
    }, []);

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

    // Scroll handling for page navigation
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || !pdfDoc) return;

        const container = scrollContainerRef.current;
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;

        // Find which page is most visible
        let mostVisiblePage = 1;
        let maxVisibleHeight = 0;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const pageContainer = pageContainerRefs.current.get(pageNum);
            if (!pageContainer) continue;

            const pageRect = pageContainer.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Calculate visible portion of this page
            const pageTop = pageRect.top - containerRect.top;
            const pageBottom = pageRect.bottom - containerRect.top;

            const visibleTop = Math.max(0, pageTop);
            const visibleBottom = Math.min(containerHeight, pageBottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);

            if (visibleHeight > maxVisibleHeight) {
                maxVisibleHeight = visibleHeight;
                mostVisiblePage = pageNum;
            }
        }

        if (mostVisiblePage !== currentPage) {
            setCurrentPage(mostVisiblePage);
        }

        // Lazy load nearby pages
        for (let i = Math.max(1, mostVisiblePage - 1); i <= Math.min(totalPages, mostVisiblePage + 1); i++) {
            if (!renderedPages.has(i)) {
                renderPage(pdfDoc, i);
            }
        }
    }, [currentPage, totalPages, pdfDoc, renderedPages, renderPage]);

    // Add scroll listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Navigation with smooth scrolling
    const goToPage = (pageNum: number) => {
        if (pageNum < 1 || pageNum > totalPages) return;

        const pageContainer = pageContainerRefs.current.get(pageNum);
        const scrollContainer = scrollContainerRef.current;

        if (pageContainer && scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const pageRect = pageContainer.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop + (pageRect.top - containerRect.top) - 20; // 20px offset

            scrollContainer.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            });
        }

        setCurrentPage(pageNum);
    };

    // Zoom - Re-render all visible pages
    const handleZoom = (newScale: number) => {
        setScale(newScale);
        setRenderedPages(new Set()); // Clear rendered pages to force re-render
        if (pdfDoc) {
            // Re-render current and nearby pages
            for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
                renderPage(pdfDoc, i);
            }
        }
    };

    // Export highlights - Enhanced with color information
    const exportHighlights = () => {
        if (highlights.length === 0) {
            showToast('No highlights to export');
            return;
        }

        const data = {
            filename: file?.name,
            highlights: highlights,
            customColors: customColors, // Include custom colors in export
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

        showToast(`Exported ${highlights.length} highlights + ${customColors.length} custom colors`);
    };

    // Delete highlight - Fixed to immediately update display
    const deleteHighlight = useCallback((highlightId: string) => {
        const highlightToDelete = highlights.find(h => h.id === highlightId);
        const updatedHighlights = highlights.filter(h => h.id !== highlightId);
        setHighlights(updatedHighlights);
        // Force immediate re-render with updated highlights on the correct page
        if (highlightToDelete) {
            renderHighlights(highlightToDelete.pageNumber, updatedHighlights);
        }
    }, [highlights, renderHighlights]);

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
                </div>

                {/* Selection Status */}
                {selectedText && (
                    <div style={{
                        padding: '1rem 1.5rem',
                        backgroundColor: '#f0f9ff',
                        borderBottom: '1px solid #3b82f6',
                        fontSize: '0.875rem',
                        color: '#1e40af',
                    }}>
                        <strong>Selected:</strong> "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                            👆 Click a color below to highlight
                        </div>
                    </div>
                )}

                {/* Color Picker */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem'
                    }}>
                        <label style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#374151',
                        }}>
                            {selectedText ? 'Choose Highlight Color:' : 'Highlight Colors:'}
                        </label>

                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                            }}
                        >
                            <Palette size={12} />
                            Add Color
                        </button>
                    </div>

                    {/* Custom Color Picker */}
                    {showColorPicker && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem',
                            border: '1px solid #e5e7eb',
                        }}>
                            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                                Pick a custom color:
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="color"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                    }}
                                    onChange={(e) => {
                                        const color = e.target.value;
                                        addCustomColor(color);
                                    }}
                                />
                                <button
                                    onClick={() => setShowColorPicker(false)}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.25rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Color Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                        maxHeight: '200px',
                        overflowY: 'auto',
                    }}>
                        {allColors.map((color, index) => {
                            const isCustom = index >= defaultColors.length;
                            return (
                                <div key={color.value} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => handleColorSelection(color)}
                                        disabled={!selectedText}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '0.5rem',
                                            backgroundColor: color.bg,
                                            border: selectedColor === color.value ? `3px solid ${color.value}` : '2px solid #e5e7eb',
                                            cursor: selectedText ? 'pointer' : 'not-allowed',
                                            opacity: selectedText ? 1 : 0.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                        }}
                                        title={selectedText ? `Highlight with ${color.name}` : `Select text first - ${color.name}`}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '4px',
                                            backgroundColor: color.value,
                                            borderRadius: '2px',
                                        }} />
                                    </button>

                                    {/* Remove button for custom colors */}
                                    {isCustom && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCustomColor(color.value);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '-4px',
                                                right: '-4px',
                                                width: '16px',
                                                height: '16px',
                                                borderRadius: '50%',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                            }}
                                            title={`Remove ${color.name}`}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {customColors.length > 0 && (
                        <div style={{
                            marginTop: '0.75rem',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                        }}>
                            💡 Custom colors have × button to remove
                        </div>
                    )}
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
                                // Clear all highlights immediately from all pages
                                setHighlights([]);
                                // Re-render all currently visible pages
                                for (let pageNum of renderedPages) {
                                    renderHighlights(pageNum, []);
                                }
                                showToast('All highlights cleared');
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
                            {highlights.length === 0 ? (
                                <div>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✨</div>
                                    <div>No highlights yet</div>
                                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                        Select text and click a color to start
                                    </div>
                                </div>
                            ) : 'No matching highlights'}
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
                                    transition: 'transform 0.1s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteHighlight(highlight.id);
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
                                    lineHeight: '1.4',
                                }}>
                                    "{highlight.text.substring(0, 150)}
                                    {highlight.text.length > 150 ? '...' : ''}"
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

                {/* PDF Canvas - Scrollable Multi-Page */}
                <div
                    ref={scrollContainerRef}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        backgroundColor: '#e5e7eb',
                        padding: '2rem',
                    }}
                >
                    {isLoading ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '400px'
                        }}>
                            <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading PDF...</div>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2rem'
                        }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                <div
                                    key={pageNum}
                                    ref={(el) => {
                                        if (el) pageContainerRefs.current.set(pageNum, el);
                                    }}
                                    style={{
                                        position: 'relative',
                                        backgroundColor: 'white',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                        userSelect: 'text',
                                        border: currentPage === pageNum ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Page Number Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '-10px',
                                        left: '20px',
                                        backgroundColor: currentPage === pageNum ? '#3b82f6' : '#6b7280',
                                        color: 'white',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        zIndex: 10,
                                    }}>
                                        Page {pageNum}
                                    </div>

                                    <canvas
                                        ref={(el) => {
                                            if (el) canvasRefs.current.set(pageNum, el);
                                        }}
                                        style={{
                                            display: 'block',
                                        }}
                                    />
                                    <div
                                        ref={(el) => {
                                            if (el) textLayerRefs.current.set(pageNum, el);
                                        }}
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
                                            userSelect: 'text',
                                            cursor: 'text',
                                        }}
                                    />
                                    <div
                                        ref={(el) => {
                                            if (el) highlightLayerRefs.current.set(pageNum, el);
                                        }}
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
                            ))}
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