// src/types/highlight.ts

export interface Highlight {
  id: string;
  position: {
    boundingRect: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
      pageNumber: number;
    };
    rects: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
    }>;
  };
  content: {
    text: string;
    image?: string;
  };
  comment?: string;
  color: string;
  created: Date;
}

export interface HighlightColor {
  name: string;
  value: string;
  background: string;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { name: "Yellow", value: "#fbbf24", background: "#fef3c7" },
  { name: "Blue", value: "#3b82f6", background: "#dbeafe" },
  { name: "Green", value: "#10b981", background: "#d1fae5" },
  { name: "Pink", value: "#ec4899", background: "#fce7f3" },
  { name: "Purple", value: "#8b5cf6", background: "#ede9fe" },
  { name: "Orange", value: "#f97316", background: "#fed7aa" },
];
