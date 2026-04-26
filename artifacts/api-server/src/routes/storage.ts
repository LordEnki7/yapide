import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

function parseUploadBody(body: unknown): { name: string; size?: number; contentType?: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name) return null;
  return {
    name: b.name,
    size: typeof b.size === "number" ? b.size : undefined,
    contentType: typeof b.contentType === "string" ? b.contentType : undefined,
  };
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for direct S3-compatible upload.
 * Client sends JSON metadata → receives { uploadURL, objectPath }.
 * Client then PUTs the file directly to uploadURL (no server proxy).
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = parseUploadBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed;
    const { uploadURL, objectPath } = await objectStorageService.requestUploadUrl({
      name,
      contentType,
    });

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * Unconditionally public — no auth checks.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const key = await objectStorageService.searchPublicObject(filePath);
    if (!key) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const { status, headers, body } = await objectStorageService.downloadObject(key);

    res.status(status);
    headers.forEach((value, name) => res.setHeader(name, value));

    if (body) {
      const nodeStream = Readable.fromWeb(body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Proxy private object entities from S3.
 * Add auth/ACL checks here when ready.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const key = await objectStorageService.getObjectEntityFile(objectPath);

    const { status, headers, body } = await objectStorageService.downloadObject(key);

    res.status(status);
    headers.forEach((value, name) => res.setHeader(name, value));

    if (body) {
      const nodeStream = Readable.fromWeb(body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
