import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

export type StoredMediaMeta = {
  id: string;
  name: string;
  mime: string;
  size: number;
};

type MediaStorageDriver = {
  ensureReady: () => Promise<void>;
  put: (mediaId: string, body: Buffer, mime: string, originalName: string) => Promise<StoredMediaMeta>;
  getMeta: (mediaId: string) => Promise<StoredMediaMeta | null>;
  getStream: (mediaId: string) => Promise<{ stream: Readable; mime: string; size: number } | null>;
  label: () => string;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const fileRoot = process.env.MEDIA_FILE_ROOT ?? path.join(repoRoot, ".data", "media");
const bucket = process.env.MINIO_BUCKET ?? "message2-media";
const storageMode = process.env.MEDIA_STORAGE ?? "auto";

const fileMetaPath = (mediaId: string) => path.join(fileRoot, `${mediaId}.meta.json`);
const fileBlobPath = (mediaId: string) => path.join(fileRoot, `${mediaId}.bin`);

const fileStorage: MediaStorageDriver = {
  label: () => `filesystem:${fileRoot}`,
  async ensureReady() {
    await mkdir(fileRoot, { recursive: true });
  },
  async put(mediaId, body, mime, originalName) {
    await writeFile(fileBlobPath(mediaId), body);
    const meta = { id: mediaId, name: originalName, mime, size: body.length };
    await writeFile(fileMetaPath(mediaId), JSON.stringify(meta), "utf8");
    return meta;
  },
  async getMeta(mediaId) {
    try {
      const raw = await readFile(fileMetaPath(mediaId), "utf8");
      return JSON.parse(raw) as StoredMediaMeta;
    } catch {
      return null;
    }
  },
  async getStream(mediaId) {
    try {
      const meta = await this.getMeta(mediaId);
      if (!meta) return null;
      const fileStat = await stat(fileBlobPath(mediaId));
      return {
        stream: createReadStream(fileBlobPath(mediaId)),
        mime: meta.mime,
        size: fileStat.size
      };
    } catch {
      return null;
    }
  }
};

async function createS3Driver(): Promise<MediaStorageDriver | null> {
  if (storageMode === "filesystem") return null;
  try {
    const {
      CreateBucketCommand,
      GetObjectCommand,
      HeadBucketCommand,
      HeadObjectCommand,
      PutObjectCommand,
      S3Client
    } = await import("@aws-sdk/client-s3");

    const endpoint = process.env.MINIO_ENDPOINT ?? "http://127.0.0.1:9000";
    const accessKeyId = process.env.MINIO_ACCESS_KEY ?? "minio";
    const secretAccessKey = process.env.MINIO_SECRET_KEY ?? "minio123";
    const useSsl = process.env.MINIO_USE_SSL === "true";
    const s3 = new S3Client({
      region: process.env.MINIO_REGION ?? "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      tls: useSsl
    });
    const objectKey = (mediaId: string) => `objects/${mediaId}`;

    return {
      label: () => `minio:${endpoint}/${bucket}`,
      async ensureReady() {
        try {
          await s3.send(new HeadBucketCommand({ Bucket: bucket }));
        } catch {
          await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        }
      },
      async put(mediaId, body, mime, originalName) {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey(mediaId),
            Body: body,
            ContentType: mime,
            Metadata: {
              originalname: encodeURIComponent(originalName),
              mime
            }
          })
        );
        return { id: mediaId, name: originalName, mime, size: body.length };
      },
      async getMeta(mediaId) {
        try {
          const head = await s3.send(
            new HeadObjectCommand({
              Bucket: bucket,
              Key: objectKey(mediaId)
            })
          );
          const encodedName = head.Metadata?.originalname;
          const name = encodedName ? decodeURIComponent(encodedName) : mediaId;
          const mime = head.Metadata?.mime ?? head.ContentType ?? "application/octet-stream";
          return {
            id: mediaId,
            name,
            mime,
            size: head.ContentLength ?? 0
          };
        } catch {
          return null;
        }
      },
      async getStream(mediaId) {
        try {
          const object = await s3.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: objectKey(mediaId)
            })
          );
          if (!object.Body) return null;
          return {
            stream: object.Body as Readable,
            mime: object.ContentType ?? "application/octet-stream",
            size: object.ContentLength ?? 0
          };
        } catch {
          return null;
        }
      }
    };
  } catch {
    return null;
  }
}

let activeDriver: MediaStorageDriver = fileStorage;

export async function initMediaStorage(): Promise<void> {
  if (storageMode === "filesystem") {
    await fileStorage.ensureReady();
    activeDriver = fileStorage;
    return;
  }

  const s3Driver = await createS3Driver();
  if (!s3Driver) {
    await fileStorage.ensureReady();
    activeDriver = fileStorage;
    return;
  }

  try {
    await s3Driver.ensureReady();
    activeDriver = s3Driver;
  } catch {
    await fileStorage.ensureReady();
    activeDriver = fileStorage;
  }
}

export function getStorageLabel() {
  return activeDriver.label();
}

export async function putMediaObject(mediaId: string, body: Buffer, mime: string, originalName: string) {
  return activeDriver.put(mediaId, body, mime, originalName);
}

export async function getMediaMeta(mediaId: string) {
  return activeDriver.getMeta(mediaId);
}

export async function getMediaStream(mediaId: string) {
  return activeDriver.getStream(mediaId);
}
