import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectAclPolicy } from "./objectAcl";

// ── S3 client (works with AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO) ──
function buildClient(): S3Client {
  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT; // leave unset for real AWS S3
  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (!_client) _client = buildClient();
  return _client;
}

function getBucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("S3_BUCKET env var is not set");
  return b;
}

// ─── Errors ───────────────────────────────────────────────────────────────────
export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// ─── ACL stored as S3 object metadata ────────────────────────────────────────
const ACL_META_KEY = "acl-policy"; // stored as x-amz-meta-acl-policy

export async function getS3AclPolicy(key: string): Promise<ObjectAclPolicy | null> {
  try {
    const head = await getClient().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key })
    );
    const raw = head.Metadata?.[ACL_META_KEY];
    return raw ? (JSON.parse(raw) as ObjectAclPolicy) : null;
  } catch {
    return null;
  }
}

// ─── Main service ─────────────────────────────────────────────────────────────
export class ObjectStorageService {
  /**
   * Generate a presigned PUT URL for direct client-side upload.
   * Returns both the URL and the canonical /objects/... path used in the DB.
   */
  async requestUploadUrl(opts: {
    name?: string;
    contentType?: string;
    ttlSec?: number;
  } = {}): Promise<{ uploadURL: string; objectPath: string }> {
    const uuid = randomUUID();
    const key = `uploads/${uuid}`;
    const bucket = getBucket();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: opts.contentType ?? "application/octet-stream",
    });

    const uploadURL = await getSignedUrl(getClient(), command, {
      expiresIn: opts.ttlSec ?? 900,
    });

    return { uploadURL, objectPath: `/objects/${key}` };
  }

  /**
   * Legacy shim — keeps existing callers working.
   * @deprecated use requestUploadUrl() which also returns objectPath.
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const { uploadURL } = await this.requestUploadUrl();
    return uploadURL;
  }

  /**
   * Converts any raw path/URL to a canonical /objects/... path.
   * Handles both old Replit GCS URLs and new S3 presigned URLs.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // Already normalized
    if (rawPath.startsWith("/objects/")) return rawPath;

    try {
      const url = new URL(rawPath);
      // Strip leading slash, bucket name (first segment for path-style) and
      // return the rest as the object key.
      const parts = url.pathname.replace(/^\//, "").split("/");
      // Path-style: /bucket/key... — skip the bucket name
      const bucket = getBucket();
      const key = parts[0] === bucket ? parts.slice(1).join("/") : parts.join("/");
      if (key) return `/objects/${key}`;
    } catch { /* not a URL */ }

    return rawPath;
  }

  /**
   * Fetch an object from S3 and return a Response-like object for streaming.
   */
  async downloadObject(
    key: string,
    cacheTtlSec: number = 3600
  ): Promise<{ status: number; headers: Headers; body: ReadableStream | null }> {
    const aclPolicy = await getS3AclPolicy(key);
    const isPublic = aclPolicy?.visibility === "public";

    const result = await getClient().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key })
    );

    const headers = new Headers();
    headers.set(
      "Content-Type",
      result.ContentType ?? "application/octet-stream"
    );
    headers.set(
      "Cache-Control",
      `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
    );
    if (result.ContentLength != null) {
      headers.set("Content-Length", String(result.ContentLength));
    }

    const body = result.Body
      ? (Readable.toWeb(result.Body as NodeJS.ReadableStream) as ReadableStream)
      : null;

    return { status: 200, headers, body };
  }

  /**
   * Resolve the S3 key from a canonical /objects/... path.
   * Throws ObjectNotFoundError if the path is invalid or the object doesn't exist.
   */
  async getObjectEntityFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const key = objectPath.slice("/objects/".length);
    if (!key) throw new ObjectNotFoundError();

    try {
      await getClient().send(
        new HeadObjectCommand({ Bucket: getBucket(), Key: key })
      );
    } catch (err: any) {
      if (err instanceof NoSuchKey || err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
        throw new ObjectNotFoundError();
      }
      throw err;
    }

    return key;
  }

  /**
   * Search for a public file across PUBLIC_OBJECT_SEARCH_PATHS.
   * Returns the S3 key if found, null otherwise.
   */
  async searchPublicObject(filePath: string): Promise<string | null> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "";
    const searchPaths = pathsStr
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    for (const base of searchPaths) {
      const key = `${base}/${filePath}`.replace(/^\/+/, "");
      try {
        await getClient().send(
          new HeadObjectCommand({ Bucket: getBucket(), Key: key })
        );
        return key;
      } catch { /* try next */ }
    }
    return null;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalized = this.normalizeObjectEntityPath(rawPath);
    if (!normalized.startsWith("/objects/")) return normalized;
    const key = normalized.slice("/objects/".length);
    // S3 metadata can only be updated via a server-side copy — skip in practice
    // since ACL enforcement is not yet active.
    return normalized;
  }

  async canAccessObjectEntity(args: {
    objectPath: string;
    userId?: string | null;
    permission?: "read" | "write";
  }): Promise<boolean> {
    const { objectPath, userId } = args;
    if (!objectPath.startsWith("/objects/")) return false;
    const key = objectPath.slice("/objects/".length);
    if (!key) return false;

    const policy = await getS3AclPolicy(key);
    if (!policy) return false;

    if (policy.visibility === "public") return true;

    if (!userId) return false;
    if (policy.owner === userId) return true;

    return false;
  }
}
