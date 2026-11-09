import path from "path";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 10_000;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "submissions";

export function assertProductionStorageConfig() {
  if (process.env.NODE_ENV === "production" || process.env.SUPABASE_URL) {
    supabaseAdmin();
  }
}

export async function uploadFile(
  hackathonId: string,
  buffer: Buffer
): Promise<{ storedPath: string; relativePath: string; size: number }> {
  assertProductionStorageConfig();
  if (buffer.length > MAX_SIZE) throw new Error("File exceeds 50 MB limit.");
  const key = `${hackathonId}/${nanoid(24)}.zip`;
  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(key, buffer, {
    contentType: "application/zip",
    upsert: false,
  });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  return { storedPath: key, relativePath: `supabase:${key}`, size: buffer.length };
}

export async function deleteFile(relativePath: string): Promise<void> {
  const key = relativePath.startsWith("supabase:") ? relativePath.slice("supabase:".length) : null;
  if (!key) return;
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([key]);
  if (error) throw new Error(`Supabase Storage delete failed: ${error.message}`);
}

export async function getFileBuffer(relativePath: string): Promise<Buffer> {
  const key = relativePath.startsWith("supabase:") ? relativePath.slice("supabase:".length) : null;
  if (!key) throw new Error("Unsupported submission storage path.");
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(key);
  if (error) throw new Error(`Supabase Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
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

  // Inspect the central directory without extracting untrusted archive contents.
  const minEocd = Math.max(0, buffer.length - 22 - 0xffff);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= minEocd; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0 || eocd + 22 > buffer.length) return { valid: false, error: "ZIP central directory is missing or invalid." };

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    return { valid: false, error: "ZIP64 archives are not supported." };
  }
  if (entryCount > MAX_ZIP_ENTRIES || centralOffset + centralSize > eocd) {
    return { valid: false, error: "ZIP archive has an invalid or excessive directory." };
  }

  let cursor = centralOffset;
  let uncompressedTotal = 0;
  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      return { valid: false, error: "ZIP central directory is malformed." };
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressed = buffer.readUInt32LE(cursor + 20);
    const uncompressed = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > buffer.length || localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      return { valid: false, error: "ZIP entry is malformed." };
    }
    if ((flags & 1) !== 0 || ![0, 8].includes(method)) {
      return { valid: false, error: "Encrypted or unsupported ZIP entries are not allowed." };
    }

    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength).replace(/\\/g, "/");
    if (name.includes("\0") || name.startsWith("/") || /^[a-zA-Z]:/.test(name) || name.split("/").includes("..")) {
      return { valid: false, error: "ZIP contains an unsafe file path." };
    }
    const unixMode = externalAttributes >>> 16;
    if (((unixMode >>> 12) & 0xf) === 0xa) return { valid: false, error: "ZIP symbolic links are not allowed." };
    uncompressedTotal += uncompressed;
    if (uncompressedTotal > MAX_UNCOMPRESSED_SIZE || (uncompressed > 1024 * 1024 && uncompressed / Math.max(compressed, 1) > 100)) {
      return { valid: false, error: "ZIP expands beyond the allowed safety limits." };
    }
    cursor = end;
  }
  if (cursor !== centralOffset + centralSize) return { valid: false, error: "ZIP central directory size does not match." };
  return { valid: true };
}
