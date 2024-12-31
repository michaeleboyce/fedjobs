// File path: packages/types/src/DocumentTypes.ts
export type DocumentType = "resume" | "ecq" | "tcq" | "cover_letter" | "other";
export type GenerationType = DocumentType | "paragraph";

export const isDocumentType = (type: string): type is DocumentType => {
    return ["resume", "ecq", "tcq", "cover_letter", "other"].includes(type);
};
export const isGenerationType = (type: string): type is GenerationType => {
    return ["resume", "ecq", "tcq", "cover_letter", "paragraph", "other"].includes(type);
};