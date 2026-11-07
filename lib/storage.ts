import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE = 50 * 1024 * 1024;
const bucket = process.env.AWS_BUCKET_NAME;

function s3(): S3Client {
  if (!bucket || !process.env.AWS_REGION) throw new Error("AWS_BUCKET_NAME and AWS_REGION are required for S3 storage.");
  return new S3Client({ region: process.env.AWS_REGION });
}

export function assertProductionStorageConfig() {
  if (process.env.NODE_ENV === "production" && (!bucket || !process.env.AWS_REGION)) {
    throw new Error("Production uploads require AWS_BUCKET_NAME and AWS_REGION.");
  }
}

export async function ensureUploadDir(hackathonId: string) {
  const dir = path.join(UPLOAD_DIR, hackathonId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function uploadFile(
  hackathonId: string,
  buffer: Buffer,
  originalName: string
): Promise<{ storedPath: string; relativePath: string; size: number }> {
  assertProductionStorageConfig();
  if (buffer.length > MAX_SIZE) throw new Error("File exceeds 50 MB limit.");
  const ext = path.extname(originalName).toLowerCase();
  const safeName = `${nanoid(12)}_${Date.now()}${ext}`;
  const key = `${hackathonId}/${safeName}`;

  if (bucket) {
    await s3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: "application/zip" }));
    return { storedPath: key, relativePath: `s3:${key}`, size: buffer.length };
  }

  const dir = await ensureUploadDir(hackathonId);
  const fullPath = path.join(dir, safeName);
  await fs.writeFile(fullPath, buffer);
  return { storedPath: fullPath, relativePath: path.join("uploads", hackathonId, safeName).replace(/\\/g, "/"), size: buffer.length };
}

export async function deleteFile(relativePath: string): Promise<void> {
  try {
    if (relativePath.startsWith("s3:")) {
      if (bucket) await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: relativePath.slice(3) }));
      return;
    }
    await fs.unlink(path.join(process.cwd(), relativePath));
  } catch {
    // A superseded or missing upload can be ignored.
  }
}

export async function getFileBuffer(relativePath: string): Promise<Buffer> {
  if (relativePath.startsWith("s3:")) {
    const response = await s3().send(new GetObjectCommand({ Bucket: bucket!, Key: relativePath.slice(3) }));
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
