const toEmail = process.env.QUOTE_TO_EMAIL || "info@airrand.ca";
const fromEmail = process.env.QUOTE_FROM_EMAIL || "Airrand Website <quotes@airrand.ca>";
const maxAttachments = 6;
const maxAttachmentContentLength = 5 * 1024 * 1024;

const cleanText = (value, maxLength = 1000) =>
  String(value || "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, maxLength);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function readPayload(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }

  return JSON.parse(body || "{}");
}

function normalizeAttachments(photos = []) {
  if (!Array.isArray(photos)) {
    return [];
  }

  if (photos.length > maxAttachments) {
    throw new Error(`Please upload ${maxAttachments} photos or fewer.`);
  }

  return photos.map((photo, index) => {
    const filename = cleanText(photo.filename, 80) || `quote-photo-${index + 1}.jpg`;
    const content = cleanText(photo.content, maxAttachmentContentLength + 1);

    if (!content || content.length > maxAttachmentContentLength || !/^[A-Za-z0-9+/=]+$/.test(content)) {
      throw new Error("One uploaded photo could not be sent. Please try fewer or smaller photos.");
    }

    return { filename, content };
  });
}

function quoteEmail({ name, phone, email, service, projectType, context, message, photos }) {
  const subject = `Airrand ${service || "HVAC"} request`;
  const rows = [
    ["Name", name],
    ["Phone", phone],
    ["Email", email],
    ["Service Needed", service],
    ["Project Type", projectType],
    ["Source", context],
    ["Photos Attached", photos.length ? `${photos.length}` : "No"],
    ["Submitted", new Date().toISOString()],
  ];

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Message:",
    message,
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <th align="left" style="padding:8px 12px;background:#f3f7fb;border:1px solid #d8e1ea;">${escapeHtml(label)}</th>
          <td style="padding:8px 12px;border:1px solid #d8e1ea;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#101820;line-height:1.5;">
      <h1 style="font-size:22px;margin:0 0 14px;">New Airrand Quote / Service Request</h1>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:18px;">${htmlRows}</table>
      <h2 style="font-size:16px;margin:0 0 8px;">Message</h2>
      <p style="white-space:pre-wrap;margin:0;">${escapeHtml(message)}</p>
    </div>`;

  return { subject, text, html };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.RESEND_API_KEY) {
    return response.status(503).json({
      error:
        "Email sending is not configured on this server. In Vercel, confirm RESEND_API_KEY is saved for Production, then redeploy. Localhost will not send unless RESEND_API_KEY is set locally.",
    });
  }

  try {
    const payload = await readPayload(request);

    if (payload.company) {
      return response.status(200).json({ ok: true });
    }

    const name = cleanText(payload.name, 120);
    const phone = cleanText(payload.phone, 80);
    const email = cleanText(payload.email, 160);
    const service = cleanText(payload.service, 120);
    const projectType = cleanText(payload.projectType, 80);
    const context = cleanText(payload.context, 120);
    const message = cleanText(payload.message, 3000);
    const photos = normalizeAttachments(payload.photos);

    if (!name || !phone || !email || !service || !projectType || !message) {
      return response.status(400).json({ error: "Please complete all required fields." });
    }

    if (!isEmail(email)) {
      return response.status(400).json({ error: "Please enter a valid email address." });
    }

    const emailContent = quoteEmail({ name, phone, email, service, projectType, context, message, photos });
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        attachments: photos,
      }),
    });
    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error("Resend email error", result);
      const resendMessage =
        cleanText(result.message, 500) ||
        cleanText(result.error, 500) ||
        cleanText(result.name, 200);
      return response.status(502).json({
        error: `The request reached the email service but was rejected. Check that airrand.ca is verified in Resend and that QUOTE_FROM_EMAIL uses that verified domain.${resendMessage ? ` Resend said: ${resendMessage}` : ""}`,
      });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Quote request failed", error);
    return response.status(500).json({
      error: error.message || "The request could not be sent right now. Please call Airrand or email info@airrand.ca directly.",
    });
  }
}
