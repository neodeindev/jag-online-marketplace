import "server-only";

export interface EmailMessage {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  text: string;
  replyTo?: { email: string; name?: string };
}

export type SendResult = { sent: true } | { sent: false; reason: string };

/**
 * Sends a transactional email through Brevo (https://developers.brevo.com).
 * Without BREVO_API_KEY (local development) the message is logged instead.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS;
  const fromName = process.env.EMAIL_FROM_NAME ?? "Online Store";

  const recipients = message.to.filter((r) => r.email);
  if (recipients.length === 0) return { sent: false, reason: "No recipients" };

  if (!apiKey || !fromEmail) {
    console.info(
      `[email] BREVO_API_KEY or EMAIL_FROM_ADDRESS not set — not sending "${message.subject}" to ${recipients
        .map((r) => r.email)
        .join(", ")}`,
    );
    return { sent: false, reason: "Email is not configured" };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: recipients,
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        replyTo: message.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Brevo rejected "${message.subject}": ${res.status} ${detail}`);
      return { sent: false, reason: `Brevo error ${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error(`[email] Couldn't reach Brevo for "${message.subject}":`, error);
    return { sent: false, reason: "Network error" };
  }
}
