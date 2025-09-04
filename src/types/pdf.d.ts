// types/pdf.d.ts
declare module 'pdfjs-dist/build/pdf' {
    export interface PDFDocumentProxy {
        numPages: number;
        getPage(pageNumber: number): Promise<PDFPageProxy>;
    }

    export interface PDFPageProxy {
        getViewport(params: { scale: number }): PDFPageViewport;
        render(params: {
            canvasContext: CanvasRenderingContext2D;
            viewport: PDFPageViewport;
        }): { promise: Promise<void> };
        getTextContent(): Promise<TextContent>;
    }

    export interface PDFPageViewport {
        width: number;
        height: number;
    }

    export interface TextContent {
        items: TextItem[];
    }

    export interface TextItem {
        str: string;
        transform: number[];
        width: number;
        height: number;
        fontName: string;
    }

    export const GlobalWorkerOptions: {
        workerSrc: string;
    };

    export function getDocument(params: { data: ArrayBuffer }): {
        promise: Promise<PDFDocumentProxy>;
    };
}