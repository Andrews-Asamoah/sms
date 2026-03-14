// actions/documents.ts
"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  uploadFile, 
  deleteFile, 
  extractKeyFromUrl, 
  r2Keys 
} from "@/lib/storage/r2";
import { 
  validateDocumentFile, 
  fileToBuffer 
} from "@/lib/storage/validate";

export type EntityType = "STUDENT" | "TEACHER" | "STAFF" | "SCHOOL" | "BILL" | "PAYMENT" | "OTHER";

export interface UploadDocumentInput {
  schoolId: string;
  schoolSlug: string;
  title: string;
  description?: string;
  entityType: EntityType;
  entityId: string;
  studentId?: string;
  teacherId?: string;
  staffId?: string;
}

/**
 * Upload a document and create a DB record
 */
export async function uploadDocument(input: UploadDocumentInput, formData: FormData) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No document file provided" };
  }

  // 1. Validate document
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // 2. Build unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const filename = `${timestamp}_${sanitizedName}`;

    // 3. Build key
    const key = r2Keys.document(input.schoolSlug, input.entityType, filename);

    // 4. Convert and Upload
    const buffer = await fileToBuffer(file);
    const result = await uploadFile(buffer, key, validation.mimeType!);

    if (!result.success) {
      return { success: false, error: result.error || "Failed to upload to R2" };
    }

    // 5. Create Document record in DB
    const document = await prisma.document.create({
      data: {
        schoolId: input.schoolId,
        title: input.title,
        description: input.description,
        fileUrl: result.url,
        fileType: validation.mimeType!,
        fileSize: file.size,
        entityType: input.entityType,
        entityId: input.entityId,
        studentId: input.studentId,
        teacherId: input.teacherId,
        staffId: input.staffId,
        uploadedById: session.user.id,
      },
    });

    revalidatePath("/");
    return { success: true, documentId: document.id };
  } catch (error: any) {
    console.error("uploadDocument error:", error);
    return { success: false, error: "An unexpected error occurred during document upload" };
  }
}

/**
 * Delete a document and its DB record
 */
export async function deleteDocument(documentId: string) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Fetch document for file cleanup
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { fileUrl: true, uploadedById: true },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Permission check (only uploader or superAdmin, or school admin? 
    // Plan just says Auth Check, let's keep it simple for now)
    
    // 2. Delete from R2
    const key = extractKeyFromUrl(document.fileUrl);
    if (key) {
      await deleteFile(key);
    }

    // 3. Delete from DB
    await prisma.document.delete({
      where: { id: documentId },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("deleteDocument error:", error);
    return { success: false, error: "Failed to delete document" };
  }
}
