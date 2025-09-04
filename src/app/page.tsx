// src/app/page.tsx
"use client";

import { useState } from "react";
import PDFUpload from "@/components/PDFUpload";
import PDFViewer from "@/components/PDFViewer";

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
                             PDF reader with smooth highlighting designed for law students
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
                            🎉 NEW: Direct Text Highlighting!
                        </h3>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "1rem",
                            color: "#4b5563",
                            marginBottom: "1rem"
                        }}>
                            <div>
                                <strong>✨ Direct Highlighting:</strong> Select text directly in the PDF - no more copy/paste needed!
                            </div>
                            <div>
                                <strong>🎨 Visual Color Selection:</strong> Six beautiful highlight colors with instant preview
                            </div>
                            <div>
                                <strong>🔍 Smart Search:</strong> Find specific highlights quickly with built-in search
                            </div>
                            <div>
                                <strong>📱 Click to Navigate:</strong> Jump to any highlight by clicking it in the sidebar
                            </div>
                            <div>
                                <strong>💾 Export Features:</strong> Save your highlights as JSON for future reference
                            </div>
                            <div>
                                <strong>🎯 Smooth Experience:</strong> Toggle highlighting mode on/off with one click
                            </div>
                        </div>

                        <div style={{
                            padding: "1rem",
                            backgroundColor: "#f0f9ff",
                            borderRadius: "8px",
                            border: "1px solid #0ea5e9",
                            marginTop: "1rem"
                        }}>
                            <h4 style={{ color: "#0c4a6e", marginBottom: "0.5rem", fontWeight: "600" }}>
                                How to use the new highlighting:
                            </h4>
                            <ol style={{ color: "#0c4a6e", fontSize: "0.9rem", paddingLeft: "1.2rem" }}>
                                <li>Upload your PDF document</li>
                                <li>Choose your highlight color from the palette</li>
                                <li>Click "Start Highlighting" to enable highlight mode</li>
                                <li>Simply select any text in the PDF - it will be highlighted automatically!</li>
                                <li>View all highlights in the sidebar and click to jump to them</li>
                                <li>Export your highlights or clear them when needed</li>
                            </ol>
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
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                        >
                            ← Back to Upload
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
                        <div style={{ color: "#6b7280", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                            <span>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
                            <span style={{
                                padding: "0.25rem 0.75rem",
                                backgroundColor: "#10b981",
                                color: "white",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: "500"
                            }}>
                                
                            </span>
                        </div>
                    </div>
                    <PDFViewer file={selectedFile} />
                </div>
            )}
        </div>
    );
}