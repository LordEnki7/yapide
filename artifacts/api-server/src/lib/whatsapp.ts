import { logger } from "./logger";

const PHONE_ID = process.env.META_WHATSAPP_PHONE_ID;
const TOKEN = process.env.META_WHATSAPP_TOKEN;
const API_VERSION = "v19.0";

/**
 * Normalize a Dominican phone number to E.164 format.
 * Accepts: 809-XXX-XXXX, (809)XXXXXXX, +1809XXXXXXX, 8091234567, 18091234567
 */
function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  // Already full international with country code 1 (US/DR)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // 10-digit local: 809/829/849 area codes
  if (digits.length === 10 && /^(809|829|849)/.test(digits)) {
    return `+1${digits}`;
  }
  // Already has +1 stripped: 11 digits starting with 1
  if (digits.length === 12 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return null;
}

/**
 * Send a WhatsApp text message via the Meta Cloud API.
 * Returns true on success, false on failure (never throws).
 */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!PHONE_ID || !TOKEN) {
    logger.warn("META_WHATSAPP_PHONE_ID or META_WHATSAPP_TOKEN not set — skipping WhatsApp send");
    return false;
  }

  const to = toE164(phone);
  if (!to) {
    logger.warn({ phone }, "WhatsApp: could not normalize phone number to E.164, skipping");
    return false;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      logger.error({ status: res.status, error: data?.error }, "WhatsApp API error");
      return false;
    }

    logger.info({ to, messageId: data?.messages?.[0]?.id }, "WhatsApp message sent");
    return true;
  } catch (err) {
    logger.error({ err }, "WhatsApp fetch failed");
    return false;
  }
}
