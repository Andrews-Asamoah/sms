// lib/storage/validate.ts

export interface ValidationResult {
  valid: boolean;
  mimeType?: string;
  ext?: string;
  error?: string;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: "Only JPEG, PNG and WebP images are allowed" };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { 
      valid: false, 
      error: `Image is too large (${formatSize(file.size)}). Maximum size is ${formatSize(MAX_IMAGE_SIZE)}.` 
    };
  }

  const ext = file.name.split(".").pop() || "png";
  return { valid: true, mimeType: file.type, ext };
}

export function validateDocumentFile(file: File): ValidationResult {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return { valid: false, error: "Only PDF, Word, Excel, and images are allowed for documents" };
  }

  if (file.size > MAX_DOC_SIZE) {
    return { 
      valid: false, 
      error: `File is too large (${formatSize(file.size)}). Maximum size is ${formatSize(MAX_DOC_SIZE)}.` 
    };
  }

  const ext = file.name.split(".").pop() || "bin";
  return { valid: true, mimeType: file.type, ext };
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
