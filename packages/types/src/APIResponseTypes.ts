
// Define response types for better type safety.
export type SignedURLResponseType =
  | { failure?: undefined; success: { url: string } }
  | { failure: string; success?: undefined };

export type ProcessDocumentResponseType =
  | { failure?: undefined; success: { url: string; document: Document; } }
  | { failure: string; success?: undefined };

export type GetDocumentSignedURLResponseType =
  | { failure?: undefined; success: { url: string; documentId: number } }
  | { failure: string; success?: undefined };
