import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_SIZE = 50 * 1024 * 1024;
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = "submissions";
const legacyAwsBucket = process.env.AWS_BUCKET_NAME;

function assertSupabaseStorageConfig() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for private Supabase Storage.");
  }
}

function authHeaders() {
  assertSupabaseStorageConfig();
  return {
    apikey: supabaseServiceKey!,
    Authorization: `Bearer ${supabaseServiceKey}`,
  };
}

function objectUrl(key: string) {
  assertSupabaseStorageConfig();
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/${encodeURIComponent(supabaseBucket)}/${encodedKey}`;
}

export function assertProductionStorageConfig() {
  assertSupabaseStorageConfig();
}

export async function uploadFile(
  hackathonId: string,
  buffer: Buffer,
  originalName: string
): Promise<{ storedPath: string; relativePath: string; size: number }> {
  assertSupabaseStorageConfig();
  if (buffer.length > MAX_SIZE) throw new Error("File exceeds 50 MB limit.");
  const ext = path.extname(originalName).toLowerCase();
  const safeName = `${nanoid(12)}_${Date.now()}${ext}`;
  const key = `${hackathonId}/${safeName}`;
  const response = await fetch(objectUrl(key), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/zip",
      "x-upsert": "false",
      "cache-control": "no-store",
    },
    body: new Uint8Array(buffer),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Supabase Storage upload failed:", response.status, await response.text());
    throw new Error("Could not store the submission file.");
  }
  return { storedPath: key, relativePath: `supabase:${key}`, size: buffer.length };
}

export async function deleteFile(relativePath: string): Promise<void> {
  try {
    if (relativePath.startsWith("supabase:")) {
      const key = relativePath.slice("supabase:".length);
      const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(supabaseBucket)}`, {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
        cache: "no-store",
      });
      if (!response.ok) console.error("Supabase Storage delete failed:", response.status, await response.text());
      return;
    }

    // Read and delete objects created before the move while AWS credentials are still configured.
    if (relativePath.startsWith("s3:") && legacyAwsBucket && process.env.AWS_REGION) {
      const s3 = new S3Client({ region: process.env.AWS_REGION });
      await s3.send(new DeleteObjectCommand({ Bucket: legacyAwsBucket, Key: relativePath.slice(3) }));
      return;
    }
    if (!relativePath.startsWith("s3:")) await fs.unlink(path.join(process.cwd(), relativePath));
  } catch (error) {
    console.error("Could not delete superseded submission:", error);
  }
}

export async function getFileBuffer(relativePath: string): Promise<Buffer> {
  if (relativePath.startsWith("supabase:")) {
    const key = relativePath.slice("supabase:".length);
    const response = await fetch(objectUrl(key), { headers: authHeaders(), cache: "no-store" });
    if (!response.ok) throw new Error("Could not retrieve the submission file.");
    return Buffer.from(await response.arrayBuffer());
  }
  if (relativePath.startsWith("s3:")) {
    if (!legacyAwsBucket || !process.env.AWS_REGION) throw new Error("Legacy S3 configuration is not available.");
    const s3 = new S3Client({ region: process.env.AWS_REGION });
    const response = await s3.send(new GetObjectCommand({ Bucket: legacyAwsBucket, Key: relativePath.slice(3) }));
    if (!response.Body) throw new Error("S3 returned an empty object.");
    return Buffer.from(await response.Body.transformToByteArray());
  }
  return fs.readFile(path.join(process.cwd(), relativePath));
}

export function getAbsolutePath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

export function validateZip(
  buffer: Buffer,
  originalName: string,
  size: number
): { valid: boolean; error?: string } {
  if (size > MAX_SIZE) return { valid: false, error: "File exceeds 50 MB limit." };
  if (path.extname(originalName).toLowerCase() !== ".zip") return { valid: false, error: "Only .zip files are allowed." };
  if (buffer.length < 4) return { valid: false, error: "Invalid file." };
  if (!(buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04)) {
    return { valid: false, error: "File does not appear to be a valid ZIP archive." };
  }
  return { valid: true };
}
