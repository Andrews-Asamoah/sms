// lib/storage/r2.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 Storage Service using S3-compatible API
 */

let s3Client: S3Client | null = null;

const getR2Client = () => {
  if (s3Client) return s3Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint =
    process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 configuration environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
    );
  }

  s3Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
};

const bucketName = process.env.R2_BUCKET_NAME || "sms";
const publicUrlBase =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") || "";

export const getPublicUrl = (key: string) => `${publicUrlBase}/${key}`;

export const extractKeyFromUrl = (url: string) => {
  if (!url || !publicUrlBase) return null;
  if (!url.startsWith(publicUrlBase)) return null;
  return url.replace(`${publicUrlBase}/`, "");
};

export const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[mimeType] || "bin";
};

export const r2Keys = {
  schoolLogo: (schoolSlug: string, ext: string) =>
    `${schoolSlug}/images/logo/logo.${ext}`,
  profileImage: (schoolSlug: string, userId: string, ext: string) =>
    `${schoolSlug}/images/profiles/${userId}.${ext}`,
  document: (schoolSlug: string, entityType: string, filename: string) =>
    `${schoolSlug}/files/documents/${entityType}/${filename}`,
  report: (schoolSlug: string, filename: string) =>
    `${schoolSlug}/files/reports/${filename}`,
};

export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string,
): Promise<{ success: boolean; key: string; url: string; error?: string }> {
  try {
    const client = getR2Client();
    const isImage = mimeType.startsWith("image/");
    const cacheControl = isImage
      ? "public, max-age=31536000, immutable"
      : "public, max-age=86400";

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: cacheControl,
      }),
    );

    return {
      success: true,
      key,
      url: getPublicUrl(key),
    };
  } catch (error: any) {
    console.error("R2 Upload Error:", error);
    return { success: false, key, url: "", error: error.message };
  }
}

export async function deleteFile(key: string): Promise<{ success: boolean }> {
  try {
    const client = getR2Client();

    // Check if file exists first to avoid unnecessary errors (though delete is idempotent)
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("R2 Delete Error (Silent):", error);
    return { success: true }; // Silently succeed as per requirements
  }
}

export async function replaceFile(
  buffer: Buffer,
  newKey: string,
  mimeType: string,
  oldUrl?: string | null,
): Promise<{ success: boolean; key: string; url: string; error?: string }> {
  // 1. Upload new file first
  const result = await uploadFile(buffer, newKey, mimeType);

  if (!result.success) return result;

  // 2. Delete old file if provided and successful
  if (oldUrl) {
    const oldKey = extractKeyFromUrl(oldUrl);
    if (oldKey && oldKey !== newKey) {
      await deleteFile(oldKey);
    }
  }

  return result;
}
