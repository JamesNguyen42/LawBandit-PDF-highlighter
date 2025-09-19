import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Highlighter, Trash2, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Palette } from 'lucide-react';

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
    rects?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    created: string;
}

interface ColorOption {
    name: string;
    value: string;
    bg: string;
}

const PDFHighlighter = () => {
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
    const [pageInputValue, setPageInputValue] = useState('');
    const [zoomInputValue, setZoomInputValue] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
    const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const highlightLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const defaultColors: ColorOption[] = [
        { name: 'Yellow', value: '#fbbf24', bg: '#fef08a' },
        { name: 'Blue', value: '#3b82f6', bg: '#93c5fd' },
        { name: 'Green', value: '#10b981', bg: '#6ee7b7' },
        { name: 'Pink', value: '#ec4899', bg: '#f472b6' },
        { name: 'Purple', value: '#8b5cf6', bg: '#a78bfa' },
        { name: 'Orange', value: '#f97316', bg: '#fb923c' },
    ];

    const allColors = [...defaultColors, ...customColors];

    const generateBackgroundColor = (mainColor: string) => {
        const hex = mainColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        const lighten = (color: number) => Math.min(255, Math.floor(color + (255 - color) * 0.7));

        const lightR = lighten(r);
        const lightG = lighten(g);
        const lightB = lighten(b);

        return `rgb(${lightR}, ${lightG}, ${lightB})`;
    };

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
        setSelectedColor(colorHex);
        setSelectedBackground(backgroundColor);
        showToast(`Added custom color: ${colorHex}`);
    };

    const removeCustomColor = (colorValue: string) => {
        setCustomColors(prev => prev.filter(color => color.value !== colorValue));
        if (selectedColor === colorValue) {
            setSelectedColor('#fbbf24');
            setSelectedBackground('#fef3c7');
        }
        showToast('Custom color removed');
    };

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
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleFileUpload = async (uploadedFile: File) => {
        if (uploadedFile.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        setFile(uploadedFile);
        setIsLoading(true);
        setRenderedPages(new Set());
        setHighlights([]);

        try {
            const arrayBuffer = await uploadedFile.arrayBuffer();
            const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);

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

    const renderPage = async (pdf: any, pageNum: number) => {
        if (!pdf) return;

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRefs.current.get(pageNum);
            const textLayer = textLayerRefs.current.get(pageNum);

            if (!canvas || !textLayer) return;

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            await page.render(renderContext).promise;

            const textContent = await page.getTextContent();

            textLayer.innerHTML = '';
            textLayer.style.width = viewport.width + 'px';
            textLayer.style.height = viewport.height + 'px';

            window.pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayer,
                viewport: viewport,
                textDivs: [],
            });

            setRenderedPages(prev => new Set([...prev, pageNum]));
            setTimeout(() => renderHighlights(pageNum), 200);
        } catch (error) {
            console.error('Error rendering page:', error);
        }
    };

    const getSelectionRects = (selection: Selection): DOMRect[] => {
        const rects: DOMRect[] = [];

        if (selection.rangeCount === 0) return rects;

        const range = selection.getRangeAt(0);

        try {
            const clientRects = range.getClientRects();

            if (clientRects.length === 0) {
                rects.push(range.getBoundingClientRect());
                return rects;
            }

            const validRects: DOMRect[] = [];
            for (let i = 0; i < clientRects.length; i++) {
                const rect = clientRects[i];
                if (rect.width > 2 && rect.height > 2) {
                    validRects.push(rect);
                }
            }

            if (validRects.length === 0) {
                rects.push(range.getBoundingClientRect());
                return rects;
            }

            validRects.sort((a, b) => {
                if (Math.abs(a.top - b.top) < 5) {
                    return a.left - b.left;
                }
                return a.top - b.top;
            });

            const lines: DOMRect[][] = [];
            let currentLine: DOMRect[] = [];
            let currentTop = validRects[0].top;

            for (const rect of validRects) {
                if (Math.abs(rect.top - currentTop) < 5) {
                    currentLine.push(rect);
                } else {
                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                    }
                    currentLine = [rect];
                    currentTop = rect.top;
                }
            }
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }

            for (const lineRects of lines) {
                if (lineRects.length === 1) {
                    rects.push(lineRects[0]);
                } else {
                    const sortedLineRects = lineRects.sort((a, b) => a.left - b.left);

                    const firstRect = sortedLineRects[0];
                    const lastRect = sortedLineRects[sortedLineRects.length - 1];

                    const mergedRect = new DOMRect(
                        firstRect.left,
                        firstRect.top,
                        (lastRect.right - firstRect.left),
                        Math.max(firstRect.height, lastRect.height)
                    );

                    rects.push(mergedRect);
                }
            }

            if (rects.length === 0) {
                rects.push(range.getBoundingClientRect());
            }

        } catch (error) {
            console.warn('Error getting selection rectangles, falling back to bounding rect:', error);
            rects.push(range.getBoundingClientRect());
        }

        return rects;
    };

    const renderHighlights = useCallback((pageNum: number, highlightsToRender?: Highlight[]) => {
        const highlightLayer = highlightLayerRefs.current.get(pageNum);
        const canvas = canvasRefs.current.get(pageNum);

        if (!highlightLayer || !canvas) return;

        while (highlightLayer.firstChild) {
            highlightLayer.removeChild(highlightLayer.firstChild);
        }

        const currentHighlights = highlightsToRender || highlights;
        const pageHighlights = currentHighlights.filter(h => h.pageNumber === pageNum);

        pageHighlights.forEach(highlight => {
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            if (highlight.rects && highlight.rects.length > 0) {
                highlight.rects.forEach(rect => {
                    const highlightDiv = document.createElement('div');

                    const absoluteX = rect.x * canvasWidth;
                    const absoluteY = rect.y * canvasHeight;
                    const absoluteWidth = rect.width * canvasWidth;
                    const absoluteHeight = rect.height * canvasHeight;

                    Object.assign(highlightDiv.style, {
                        position: 'absolute',
                        left: absoluteX + 'px',
                        top: absoluteY + 'px',
                        width: absoluteWidth + 'px',
                        height: absoluteHeight + 'px',
                        backgroundColor: highlight.background,
                        opacity: '0.6',
                        pointerEvents: 'none',
                        borderRadius: '2px'
                    });
                    highlightDiv.className = 'pdf-highlight';
                    highlightLayer.appendChild(highlightDiv);
                });
            } else if (highlight.position) {
                const highlightDiv = document.createElement('div');

                const absoluteX = highlight.position.x * canvasWidth;
                const absoluteY = highlight.position.y * canvasHeight;
                const absoluteWidth = highlight.position.width * canvasWidth;
                const absoluteHeight = highlight.position.height * canvasHeight;

                Object.assign(highlightDiv.style, {
                    position: 'absolute',
                    left: absoluteX + 'px',
                    top: absoluteY + 'px',
                    width: absoluteWidth + 'px',
                    height: absoluteHeight + 'px',
                    backgroundColor: highlight.background,
                    opacity: '0.6',
                    pointerEvents: 'none',
                    borderRadius: '2px'
                });
                highlightDiv.className = 'pdf-highlight';
                highlightLayer.appendChild(highlightDiv);
            }
        });
    }, [highlights]);

    const createHighlight = useCallback((text: string, color: string, background: string) => {
        if (!text || text.length < 2) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const selectionRects = getSelectionRects(selection);
        if (selectionRects.length === 0) return;

        let selectedPageNum = currentPage;
        let textLayer = textLayerRefs.current.get(currentPage);

        for (let [pageNum, layer] of textLayerRefs.current) {
            const layerRect = layer.getBoundingClientRect();
            const firstSelectionRect = selectionRects[0];

            if (firstSelectionRect.top >= layerRect.top &&
                firstSelectionRect.bottom <= layerRect.bottom) {
                selectedPageNum = pageNum;
                textLayer = layer;
                break;
            }
        }

        if (!textLayer) return;

        const canvas = canvasRefs.current.get(selectedPageNum);
        if (!canvas) return;

        const textLayerRect = textLayer.getBoundingClientRect();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const relativeRects = selectionRects.map(rect => ({
            x: (rect.left - textLayerRect.left) / canvasWidth,
            y: (rect.top - textLayerRect.top) / canvasHeight,
            width: rect.width / canvasWidth,
            height: rect.height / canvasHeight,
        }));

        const minX = Math.min(...relativeRects.map(r => r.x));
        const minY = Math.min(...relativeRects.map(r => r.y));
        const maxX = Math.max(...relativeRects.map(r => r.x + r.width));
        const maxY = Math.max(...relativeRects.map(r => r.y + r.height));

        const fallbackPosition = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };

        const newHighlight: Highlight = {
            id: Date.now().toString() + Math.random().toString(36),
            text: text.trim(),
            color: color,
            background: background,
            pageNumber: selectedPageNum,
            position: fallbackPosition,
            rects: relativeRects,
            created: new Date().toLocaleTimeString(),
        };

        const updatedHighlights = [...highlights, newHighlight];
        setHighlights(updatedHighlights);
        renderHighlights(selectedPageNum, updatedHighlights);
        showToast(`Highlighted: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
        selection.removeAllRanges();
    }, [currentPage, highlights, renderHighlights]);

    const handleColorSelection = useCallback((color: ColorOption) => {
        setSelectedColor(color.value);
        setSelectedBackground(color.bg);
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 2) {
            createHighlight(text, color.value, color.bg);
        }
    }, [createHighlight]);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            setSelectedText(text || '');
        };

        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const exportPDFWithHighlights = async () => {
        if (highlights.length === 0 || !pdfDoc) {
            showToast('No highlights to export');
            return;
        }

        setIsExporting(true);
        showToast('Generating PDF with highlights...');

        try {
            // Load jsPDF and html2canvas
            const jsPDFScript = document.createElement('script');
            jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

            const html2canvasScript = document.createElement('script');
            html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

            document.head.appendChild(jsPDFScript);
            document.head.appendChild(html2canvasScript);

            await new Promise((resolve) => {
                let scriptsLoaded = 0;
                const checkLoaded = () => {
                    scriptsLoaded++;
                    if (scriptsLoaded === 2) resolve(undefined);
                };
                jsPDFScript.onload = checkLoaded;
                html2canvasScript.onload = checkLoaded;
            });

            const { jsPDF } = (window as any).jspdf;
            const pdf = new jsPDF('p', 'pt', 'a4');

            // Render each page with highlights
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                if (pageNum > 1) {
                    pdf.addPage();
                }

                const pageContainer = pageContainerRefs.current.get(pageNum);
                if (!pageContainer) continue;

                // Temporarily show all highlights for this page
                await renderHighlights(pageNum);

                // Capture the page with highlights
                const canvas = await (window as any).html2canvas(pageContainer, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            // Save the PDF
            const filename = `${file?.name?.replace('.pdf', '')}_highlighted.pdf`;
            pdf.save(filename);

            showToast(`PDF exported as ${filename}`);

            // Clean up
            document.head.removeChild(jsPDFScript);
            document.head.removeChild(html2canvasScript);

        } catch (error) {
            console.error('Error exporting PDF:', error);
            showToast('Error exporting PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleBackButton = () => {
        if (highlights.length > 0) {
            const confirmMessage = `You have ${highlights.length} highlight${highlights.length > 1 ? 's' : ''} in this document. What would you like to do?`;

            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            `;

            modalContent.innerHTML = `
                <h3 style="margin-bottom: 1rem; font-size: 1.25rem; font-weight: 600;">Save Highlights?</h3>
                <p style="margin-bottom: 2rem; color: #6b7280;">${confirmMessage}</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="saveBtn" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
                        Export PDF
                    </button>
                    <button id="discardBtn" style="padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
                        Discard Changes
                    </button>
                    <button id="cancelBtn" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
                        Cancel
                    </button>
                </div>
            `;

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            modalContent.querySelector('#saveBtn')?.addEventListener('click', () => {
                exportPDFWithHighlights();
                resetToUploadScreen();
                document.body.removeChild(modal);
            });

            modalContent.querySelector('#discardBtn')?.addEventListener('click', () => {
                resetToUploadScreen();
                document.body.removeChild(modal);
                showToast('Changes discarded');
            });

            modalContent.querySelector('#cancelBtn')?.addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        } else {
            resetToUploadScreen();
        }
    };

    const resetToUploadScreen = () => {
        setFile(null);
        setHighlights([]);
        setPdfDoc(null);
        setCurrentPage(1);
        setTotalPages(0);
        setSelectedText('');
        setSearchTerm('');
        setRenderedPages(new Set());
    };

    const showToast = (message: string) => {
        const toast = document.createElement('div');
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#10b981',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: '500',
            zIndex: '10000',
            animation: 'slideIn 0.3s ease'
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || !pdfDoc) return;

        const container = scrollContainerRef.current;
        const containerHeight = container.clientHeight;

        let mostVisiblePage = 1;
        let maxVisibleHeight = 0;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const pageContainer = pageContainerRefs.current.get(pageNum);
            if (!pageContainer) continue;

            const pageRect = pageContainer.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

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
            setPageInputValue('');
        }

        for (let i = Math.max(1, mostVisiblePage - 1); i <= Math.min(totalPages, mostVisiblePage + 1); i++) {
            if (!renderedPages.has(i)) {
                renderPage(pdfDoc, i);
            }
        }
    }, [currentPage, totalPages, pdfDoc, renderedPages, renderPage]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const goToPage = (pageNum: number) => {
        if (pageNum < 1 || pageNum > totalPages) return;

        const pageContainer = pageContainerRefs.current.get(pageNum);
        const scrollContainer = scrollContainerRef.current;

        if (pageContainer && scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const pageRect = pageContainer.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop + (pageRect.top - containerRect.top) - 20;

            scrollContainer.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            });
        }

        setCurrentPage(pageNum);
        setPageInputValue('');
    };

    const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const pageNum = parseInt(pageInputValue);
            if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
                goToPage(pageNum);
            } else {
                showToast(`Please enter a valid page number (1-${totalPages})`);
                setPageInputValue('');
            }
        }
    };

    const handleZoom = (newScale: number) => {
        setScale(newScale);
        setZoomInputValue('');

        if (pdfDoc) {
            setRenderedPages(new Set());

            const container = scrollContainerRef.current;
            let pagesToRender: number[] = [];

            if (container) {
                const containerRect = container.getBoundingClientRect();
                const containerHeight = containerRect.height;

                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    const pageContainer = pageContainerRefs.current.get(pageNum);
                    if (pageContainer) {
                        const pageRect = pageContainer.getBoundingClientRect();

                        const buffer = containerHeight * 0.5;
                        if (pageRect.bottom >= (containerRect.top - buffer) &&
                            pageRect.top <= (containerRect.bottom + buffer)) {
                            pagesToRender.push(pageNum);
                        }
                    }
                }

                if (newScale < scale) {
                    const extraRange = Math.max(3, Math.ceil(5 / newScale));
                    const start = Math.max(1, currentPage - extraRange);
                    const end = Math.min(totalPages, currentPage + extraRange);

                    for (let i = start; i <= end; i++) {
                        if (!pagesToRender.includes(i)) {
                            pagesToRender.push(i);
                        }
                    }
                }
            }

            if (pagesToRender.length === 0) {
                const range = Math.max(3, Math.ceil(3 / newScale));
                const start = Math.max(1, currentPage - range);
                const end = Math.min(totalPages, currentPage + range);

                for (let i = start; i <= end; i++) {
                    pagesToRender.push(i);
                }
            }

            pagesToRender.sort((a, b) => a - b);

            if (pagesToRender.includes(currentPage)) {
                renderPage(pdfDoc, currentPage);
            }

            pagesToRender.forEach((pageNum, index) => {
                if (pageNum !== currentPage) {
                    setTimeout(() => {
                        renderPage(pdfDoc, pageNum);
                    }, index * 50);
                }
            });
        }
    };

    const handleZoomInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const zoomValue = parseFloat(zoomInputValue);
            if (zoomValue && zoomValue >= 50 && zoomValue <= 300) {
                handleZoom(zoomValue / 100);
            } else {
                showToast('Please enter a valid zoom percentage (50-300)');
                setZoomInputValue('');
            }
        }
    };

    const deleteHighlight = useCallback((highlightId: string) => {
        const highlightToDelete = highlights.find(h => h.id === highlightId);
        const updatedHighlights = highlights.filter(h => h.id !== highlightId);
        setHighlights(updatedHighlights);
        if (highlightToDelete) {
            renderHighlights(highlightToDelete.pageNumber, updatedHighlights);
        }
    }, [highlights, renderHighlights]);

    const filteredHighlights = highlights.filter(h =>
        h.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        marginBottom: '3rem',
                    }}>
                        LawBandit PDF Highlighter
                    </h1>

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
            <div style={{
                width: '360px',
                backgroundColor: 'white',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
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
                            Click a color below to highlight
                        </div>
                    </div>
                )}

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
                                    onChange={(e) => addCustomColor(e.target.value)}
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
                </div>

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
                            onClick={exportPDFWithHighlights}
                            disabled={highlights.length === 0 || isExporting}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                backgroundColor: (highlights.length > 0 && !isExporting) ? '#3b82f6' : '#9ca3af',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: (highlights.length > 0 && !isExporting) ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                            }}
                        >
                            <Download size={14} />
                            {isExporting ? 'Exporting...' : 'Export PDF'}
                        </button>

                        <button
                            onClick={() => {
                                setHighlights([]);
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

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                            onClick={handleBackButton}
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

                            <span style={{ padding: '0 0.5rem', fontSize: '0.875rem' }}>
                                Page
                            </span>

                            <input
                                type="text"
                                value={pageInputValue}
                                onChange={(e) => setPageInputValue(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={handlePageInput}
                                onFocus={(e) => {
                                    if (!pageInputValue) {
                                        setPageInputValue('');
                                    }
                                    e.target.select();
                                }}
                                onBlur={() => {
                                    if (!pageInputValue) {
                                        setPageInputValue('');
                                    }
                                }}
                                style={{
                                    width: '50px',
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    textAlign: 'center',
                                    backgroundColor: 'white',
                                    cursor: 'text',
                                }}
                                placeholder={String(currentPage)}
                                title="Click to enter page number, press Enter to go"
                            />

                            <span style={{ padding: '0 0.5rem', fontSize: '0.875rem' }}>
                                of {totalPages}
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

                            <input
                                type="text"
                                value={zoomInputValue}
                                onChange={(e) => setZoomInputValue(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={handleZoomInput}
                                onFocus={(e) => {
                                    if (!zoomInputValue) {
                                        setZoomInputValue('');
                                    }
                                    e.target.select();
                                }}
                                onBlur={() => {
                                    if (!zoomInputValue) {
                                        setZoomInputValue('');
                                    }
                                }}
                                style={{
                                    width: '60px',
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    textAlign: 'center',
                                    backgroundColor: 'white',
                                    cursor: 'text',
                                }}
                                placeholder={`${Math.round(scale * 100)}%`}
                                title="Click to enter zoom percentage (50-300), press Enter to apply"
                            />

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
                                        style={{ display: 'block' }}
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

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

export default PDFHighlighter;