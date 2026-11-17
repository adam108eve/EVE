declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(options: { region: string });
    send(command: unknown): Promise<{ Body?: { transformToByteArray(): Promise<Uint8Array> } }>;
  }
  export class PutObjectCommand {
    constructor(input: { Bucket: string; Key: string; Body: Buffer; ContentType?: string });
  }
  export class DeleteObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
  export class GetObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
}
