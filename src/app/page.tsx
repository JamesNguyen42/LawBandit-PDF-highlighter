// src/app/page.tsx
"use client";

import { useState } from "react";
import PDFUpload from "@/components/PDFUpload";
// Use SimplePDFViewer instead since it's more stable
import SimplePDFViewer from "@/components/SimplePDFViewer";

export default function Home() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    return (
        <div style={{ minHeight: "100vh" }}>
            {!selectedFile ? (
                <div className="container">
                    <header style={{ textAlign: "center", marginBottom: "3rem" }}>
                        <h1 style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            color: "#1f2937",
                            marginBottom: "0.5rem"
                        }}>
                            LawBandit PDF Highlighter
                        </h1>
                        <p style={{
                            fontSize: "1.25rem",
                            color: "#6b7280",
                            maxWidth: "600px",
                            margin: "0 auto",
                            marginBottom: "2rem"
                        }}>
                            Enhanced PDF reader with smooth highlighting designed for law students
                        </p>
                        <p style={{
                            fontSize: "1rem",
                            color: "#374151",
                            maxWidth: "500px",
                            margin: "0 auto"
                        }}>
                            Upload legal documents, case studies, or any PDF and highlight important sections
                            with multiple colors for better organization and study efficiency.
                        </p>
                    </header>

                    <PDFUpload onPDFLoad={setSelectedFile} />

                    <div className="card" style={{
                        margin: "2rem auto",
                        padding: "2rem",
                        maxWidth: "800px"
                    }}>
                        <h3 style={{
                            fontSize: "1.25rem",
                            fontWeight: "600",
                            marginBottom: "1rem",
                            color: "#1f2937"
                        }}>
                            Key Features:
                        </h3>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "1rem",
                            color: "#4b5563"
                        }}>
                            <div>
                                <strong>Visual Highlighting:</strong> See your highlights directly on the PDF with multiple colors
                            </div>
                            <div>
                                <strong>Click Navigation:</strong> Jump to highlights by clicking them in the sidebar
                            </div>
                            <div>
                                <strong>Clean Interface:</strong> Modern design optimized for law students
                            </div>
                            <div>
                                <strong>Smooth Selection:</strong> Improved highlighting experience with better text selection
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <div style={{
                        padding: "1rem 1.5rem",
                        backgroundColor: "white",
                        borderBottom: "1px solid #e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                    }}>
                        <button
                            onClick={() => setSelectedFile(null)}
                            className="btn btn-primary"
                        >
                            Back to Upload
                        </button>
                        <h2 style={{
                            fontSize: "1.25rem",
                            fontWeight: "600",
                            color: "#1f2937",
                            maxWidth: "400px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                        }}>
                            {selectedFile.name}
                        </h2>
                        <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                        </div>
                    </div>
                    <SimplePDFViewer file={selectedFile} />
                </div>
            )}
        </div>
    );
}