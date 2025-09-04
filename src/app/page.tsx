// src/app/page.tsx
"use client";

import PDFViewer from "@/components/PDFViewer";

export default function Home() {
    return (
        <div style={{ minHeight: "100vh" }}>
            <PDFViewer />
        </div>
    );
}