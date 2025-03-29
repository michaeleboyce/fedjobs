// File path: packages/types/src/DocumentTypes.ts
export type DocumentType = "cover_letter" | "ecq" | "resume" | "tcq" | "other";
export type GenerationType = DocumentType | "paragraph";

export const isDocumentType = (type: string): type is DocumentType => {
    return ["cover_letter", "ecq", "resume", "tcq",  "other"].includes(type);
};
export const isGenerationType = (type: string): type is GenerationType => {
    return ["cover_letter","ecq",  "resume", "tcq",  "paragraph", "other"].includes(type);
};