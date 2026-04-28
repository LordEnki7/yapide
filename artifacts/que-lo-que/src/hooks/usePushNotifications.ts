import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.BASE_URL;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}api/push/vapid-public-key`, { credentials: "include" });
    if (!res.ok) return null;
    const { publicKey } = await res.json();
    return publicKey;
  } catch {
    return null;
  }
}

async function subscribeOnServer(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  await fetch(`${BASE}api/push/subscribe`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
}

async function unsubscribeOnServer(endpoint: string): Promise<void> {
  await fetch(`${BASE}api/push/unsubscribe`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

export type NotifState = "unsupported" | "default" | "granted" | "denied" | "loading";

export function usePushNotifications() {
  const [state, setState] = useState<NotifState>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setSubscription(sub);
          setState("granted");
        } else {
          setState(Notification.permission === "denied" ? "denied" : "default");
        }
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setState("loading");
    try {
      const publicKey = await getVapidPublicKey();
      if (!publicKey) { setState("default"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as Uint8Array,
      });
      await subscribeOnServer(sub);
      setSubscription(sub);
      setState("granted");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "default");
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setState("loading");
    try {
      await unsubscribeOnServer(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
      setState("default");
    } catch {
      setState("granted");
    }
  }, [subscription]);

  return { state, subscribe, unsubscribe };
}
