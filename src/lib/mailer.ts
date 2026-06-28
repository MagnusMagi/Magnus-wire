import nodemailer, { type Transporter } from "nodemailer";

// Kendi mailcow SMTP sunucumuz üzerinden gönderim (mail.magnusmagi.com).
let cached: Transporter | null = null;

export function mailerConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transport(): Transporter {
  if (cached) return cached;
  const port = Number(process.env.SMTP_PORT || 465);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
  return cached;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}): Promise<void> {
  const from = process.env.NEWSLETTER_FROM || process.env.SMTP_USER!;
  await transport().sendMail({
    from: `MagiWire <${from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
    ...(opts.headers ? { headers: opts.headers } : {}),
  });
}
