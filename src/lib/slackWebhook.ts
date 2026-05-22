// Sends the verification code via Slack incoming webhook.
// Uses application/x-www-form-urlencoded with `payload=<json>` to avoid CORS preflight.
// Webhook URL is stored in localStorage and managed by the webmaster.

const WEBHOOK_KEY = "cookielms-otp-slack-webhook";

export function getOtpWebhook(): string {
  try {
    return localStorage.getItem(WEBHOOK_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setOtpWebhook(url: string): void {
  if (url) localStorage.setItem(WEBHOOK_KEY, url);
  else localStorage.removeItem(WEBHOOK_KEY);
  window.dispatchEvent(new Event("otp-webhook-changed"));
}

export function isValidSlackWebhook(url: string): boolean {
  return /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/.test(url.trim());
}

export async function sendOtpToSlack(opts: {
  email: string;
  code: string;
}): Promise<{ sent: boolean; error?: string }> {
  const url = getOtpWebhook();
  if (!url) return { sent: false, error: "Verification channel not configured." };
  if (!isValidSlackWebhook(url)) return { sent: false, error: "Verification channel misconfigured." };

  const payload = {
    text: `Verification code for *${opts.email}*: \`${opts.code}\``,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:lock: *Verification code request*\nAccount: \`${opts.email}\`\nCode: *${opts.code}*\nExpires in 10 minutes.`,
        },
      },
    ],
  };

  try {
    const body = new URLSearchParams({ payload: JSON.stringify(payload) }).toString();
    // 'no-cors' suppresses the opaque response error; Slack still receives the message.
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
