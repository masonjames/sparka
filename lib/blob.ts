import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { BLOB_FILE_PREFIX } from "./constants";
import { env } from "./env";

/**
 * R2/S3-compatible storage client for file uploads
 * Configured via R2_* environment variables
 */
const s3Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Result type for upload operations (compatible with previous interface)
 */
export interface UploadResult {
  url: string;
  pathname: string;
}

/**
 * Result type for list operations
 */
export interface ListResult {
  blobs: Array<{
    url: string;
    pathname: string;
    size: number;
    uploadedAt: Date;
  }>;
}

/**
 * Generate a unique filename with random suffix
 */
function generateUniqueFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  const suffix = nanoid(8);

  if (lastDotIndex === -1) {
    return `${filename}-${suffix}`;
  }

  const name = filename.slice(0, lastDotIndex);
  const ext = filename.slice(lastDotIndex);
  return `${name}-${suffix}${ext}`;
}

/**
 * Get the full object key with prefix
 */
function getObjectKey(filename: string): string {
  return `${BLOB_FILE_PREFIX}${filename}`;
}

/**
 * Get the public URL for an object
 */
function getPublicUrl(key: string): string {
  return `${env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Upload a file to R2 storage with consistent prefixing and public access
 */
export async function uploadFile(
  filename: string,
  buffer: Buffer | Uint8Array | ArrayBuffer | ReadableStream | Blob | string
): Promise<UploadResult> {
  try {
    const uniqueFilename = generateUniqueFilename(filename);
    const key = getObjectKey(uniqueFilename);

    // Convert various input types to Buffer/Uint8Array for S3
    let body: Buffer | Uint8Array | string;
    if (buffer instanceof ArrayBuffer) {
      body = Buffer.from(buffer);
    } else if (buffer instanceof Blob) {
      body = Buffer.from(await buffer.arrayBuffer());
    } else if (buffer instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = buffer.getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
      }
      body = Buffer.concat(chunks);
    } else {
      body = buffer;
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: body,
        // R2 public buckets serve files publicly via custom domain
        // No ACL needed when using public bucket with custom domain
      })
    );

    return {
      url: getPublicUrl(key),
      pathname: key,
    };
  } catch (error) {
    throw new Error(
      `Failed to upload file ${filename}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * List all files in R2 storage with the correct prefix
 */
export async function listFiles(): Promise<ListResult> {
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET,
        Prefix: BLOB_FILE_PREFIX,
      })
    );

    const blobs =
      response.Contents?.map((object) => ({
        url: getPublicUrl(object.Key ?? ""),
        pathname: object.Key ?? "",
        size: object.Size ?? 0,
        uploadedAt: object.LastModified ?? new Date(),
      })) ?? [];

    return { blobs };
  } catch (error) {
    throw new Error(
      `Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Delete a single file by its URL or key
 */
export async function deleteFile(urlOrKey: string): Promise<void> {
  try {
    // Extract key from URL if needed
    const key = urlOrKey.startsWith("http")
      ? extractKeyFromUrl(urlOrKey)
      : urlOrKey;

    if (!key) {
      throw new Error(`Invalid URL or key: ${urlOrKey}`);
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    throw new Error(
      `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Delete multiple files by their URLs at once
 */
export async function deleteFilesByUrls(urls: string[]): Promise<void> {
  try {
    // Delete files in parallel
    await Promise.all(urls.map((url) => deleteFile(url)));
  } catch (error) {
    throw new Error(
      `Failed to delete ${urls.length} files: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Extract the S3 key from a public URL
 */
function extractKeyFromUrl(url: string): string | null {
  try {
    const publicUrlBase = env.R2_PUBLIC_URL;
    if (url.startsWith(publicUrlBase)) {
      // Remove the base URL and leading slash
      return url.slice(publicUrlBase.length).replace(/^\//, "");
    }

    // Fallback: try to extract from URL path
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

/**
 * Extract filename from a blob URL
 */
export function extractFilenameFromUrl(url: string): string | null {
  try {
    const key = extractKeyFromUrl(url);
    if (!key) return null;

    // Remove the prefix if it exists
    const filename = key.startsWith(BLOB_FILE_PREFIX)
      ? key.slice(BLOB_FILE_PREFIX.length)
      : key;

    // Remove query parameters if any
    return filename.split("?")[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a blob URL with our prefix
 */
export function isBlobUrl(url: string): boolean {
  return url.includes(BLOB_FILE_PREFIX) || url.startsWith(env.R2_PUBLIC_URL);
}

/**
 * Get a file from R2 storage
 */
export async function getFile(
  urlOrKey: string
): Promise<{ body: ReadableStream; contentType?: string } | null> {
  try {
    const key = urlOrKey.startsWith("http")
      ? extractKeyFromUrl(urlOrKey)
      : urlOrKey;

    if (!key) return null;

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      })
    );

    if (!response.Body) return null;

    return {
      body: response.Body.transformToWebStream(),
      contentType: response.ContentType,
    };
  } catch {
    return null;
  }
}
