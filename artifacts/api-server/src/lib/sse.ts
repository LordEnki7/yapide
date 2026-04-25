import { Response } from "express";

// ─── Simple in-memory SSE pub/sub ─────────────────────────────────────────────
// Maps orderId → Set of SSE response objects

const clients = new Map<number, Set<Response>>();

export function subscribe(orderId: number, res: Response): () => void {
  if (!clients.has(orderId)) clients.set(orderId, new Set());
  clients.get(orderId)!.add(res);

  // Return cleanup function
  return () => {
    const set = clients.get(orderId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(orderId);
    }
  };
}

export function emit(orderId: number, event: string, data: unknown): void {
  const set = clients.get(orderId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  set.forEach(res => {
    try {
      res.write(payload);
    } catch {
      // Client already disconnected — cleanup will happen via close listener
    }
  });
}

export function emitOrderStatusChange(
  orderId: number,
  status: string,
  extra: Record<string, unknown> = {},
): void {
  emit(orderId, "status", { orderId, status, ...extra, ts: Date.now() });
}
