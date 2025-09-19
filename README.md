# LawBandit PDF Highlighter

A smooth, precise PDF highlighting tool built for law students. Upload PDFs and create accurate highlights with custom colors, then export your annotated documents as PDFs.

## Features

- Precise Text Highlighting: Select any text and highlight it with pixel-perfect accuracy
- Custom Colors: 6 default colors plus ability to add unlimited custom colors
- Multi-line Selection: Handles complex selections across multiple lines seamlessly  
- PDF Export: Export your highlighted PDF as a new file with all annotations embedded
- Search Highlights: Find specific highlights across your document
- Page Navigation: Smooth scrolling with zoom controls and page jumping
- Responsive Design: Clean, professional interface optimized for document review

## Setup Instructions

Prerequisites:
- Node.js (version 18 or higher)
- npm or yarn package manager

Installation:

1. Clone the repository
   ```
   git clone https://github.com/JamesNguyen42/LawBandit-PDF-highlighter.git
   cd LawBandit-PDF-highlighter
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run the development server
   ```
   npm run dev
   ```

4. Open your browser and navigate to http://localhost:3000

Deployment to Vercel:

1. Install Vercel CLI
   ```
   npm install -g vercel
   ```

2. Deploy
   ```
   vercel
   ```

3. Follow the prompts to configure your deployment

Alternative Manual Deployment:

1. Build the application
   ```
   npm run build
   ```

2. Start production server
   ```
   npm start
   ```

## How to Use

1. Upload PDF: Click the upload area or drag and drop a PDF file
2. Select Text: Click and drag to select any text in the document
3. Choose Color: Click any color button to highlight the selected text
4. Add Custom Colors: Use the "Add Color" button to create custom highlight colors
5. Navigate: Use page controls, zoom, or scroll to move through your document
6. Export: Click "Export PDF" to download your highlighted document
7. Search: Use the search box to find specific highlights

## Technical Approach

This application is built as a React-based PDF viewer with real-time highlighting capabilities. The core challenge was creating pixel-perfect highlights that work across complex PDF layouts.

Key Technical Decisions:

PDF Rendering Strategy
- PDF.js Integration: Uses Mozilla's PDF.js library for robust PDF parsing and rendering
- Canvas + Text Layer: Renders PDF pages on HTML5 canvas with an overlay text layer for selection
- Multi-layer Architecture: Separates canvas (visual), text layer (selection), and highlight layer (annotations)

Highlighting Precision
- Selection Rectangle Detection: Uses getClientRects() to capture precise text boundaries
- Multi-line Handling: Groups rectangles by line and merges gaps for continuous highlighting
- Relative Coordinates: Stores highlights as percentages of canvas dimensions for zoom independence
- Rectangle Merging: Combines adjacent selection rectangles to eliminate gaps between styled text

State Management
- React Hooks: Uses useState and useRef for component state and DOM references
- Highlight Storage: Maintains highlights in memory with text, position, color, and metadata
- Page Rendering: Tracks rendered pages to optimize performance with large documents

Export Functionality
- Dynamic Library Loading: Loads jsPDF and html2canvas only when needed
- Page-by-Page Capture: Screenshots each page with highlights rendered as HTML elements
- PDF Generation: Creates new PDF with embedded highlight images

Core Components:

The Highlight interface stores all necessary data:
```
interface Highlight {
    id: string;
    text: string;
    color: string;
    background: string;
    pageNumber: number;
    rects: Array<{x, y, width, height}>; // Precise rectangles
    created: string;
}
```

Critical Functions:

1. getSelectionRects(): Converts browser selection into precise rectangles
2. createHighlight(): Processes selection and stores highlight data
3. renderHighlights(): Renders highlights as positioned DOM elements
4. exportPDFWithHighlights(): Generates downloadable PDF with annotations

Performance Optimizations:
- Lazy Page Rendering: Only renders visible pages plus buffer
- Efficient Re-rendering: Updates only affected pages when highlights change
- Memory Management: Cleans up DOM elements and event listeners properly

Browser Compatibility:
- Modern Browsers: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- PDF.js Worker: Uses web workers for PDF parsing to avoid blocking UI
- Canvas Support: Requires HTML5 canvas and modern JavaScript features

## Dependencies

Core Dependencies:
- react - UI framework
- next.js - React framework with SSR capabilities
- pdfjs-dist - PDF parsing and rendering
- lucide-react - Icon library

Export Dependencies (Loaded Dynamically):
- jspdf - PDF generation
- html2canvas - DOM to image conversion

## File Structure

```
src/
├── app/
│   ├── page.tsx          # Main page component
│   ├── layout.tsx        # App layout
│   └── globals.css       # Global styles
├── components/
│   └── PDFViewer.tsx     # Main PDF highlighter component
└── types/
    └── highlight.ts      # TypeScript interfaces
```

## Troubleshooting

Common Issues:

PDF won't load
- Ensure the file is a valid PDF
- Check that the file isn't password protected
- Verify PDF.js worker is loading properly

Highlights appear in wrong position
- This can happen if the page isn't fully rendered before highlighting
- Wait for page to load completely before selecting text

Export fails
- Check browser console for errors
- Ensure popup blockers aren't preventing download
- Try with a smaller PDF if memory issues occur

Browser Console Errors:
Check the browser developer console for detailed error messages. Most issues are related to PDF parsing errors, canvas rendering problems, or network issues loading external libraries.

## License

This project is licensed under the ISC License.