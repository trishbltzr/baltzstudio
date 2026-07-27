import "server-only";

import nodemailer from "nodemailer";

type PortalAccessRequestEmail = {
  name: string;
  email: string;
  businessName?: string;
  note?: string;
};

type PortalInvoiceEmail = {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string;
  paymentLink?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  adminEmail: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function readSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  if (!user || !password) return null;

  const port = Number(process.env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer.");
  }

  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.hostinger.com",
    port,
    secure: process.env.SMTP_SECURE !== "false",
    user,
    password,
    from: process.env.SMTP_FROM?.trim() || `Baltazar Studio Portal <${user}>`,
    adminEmail: process.env.PORTAL_ADMIN_EMAIL?.trim() || user,
  };
}

function getTransport(config: SmtpConfig) {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
  return transporter;
}

export function isSmtpConfigured() {
  return readSmtpConfig() !== null;
}

export async function verifySmtpConnection() {
  const config = readSmtpConfig();
  if (!config) return { configured: false as const, verified: false as const };

  await getTransport(config).verify();
  return { configured: true as const, verified: true as const };
}

export async function sendPortalAccessRequestEmail(request: PortalAccessRequestEmail) {
  const config = readSmtpConfig();
  if (!config) return { sent: false as const, reason: "not_configured" as const };

  const businessName = request.businessName?.trim();
  const note = request.note?.trim();
  const safeName = escapeHtml(request.name);
  const safeEmail = escapeHtml(request.email);
  const safeBusiness = businessName ? escapeHtml(businessName) : "Not provided";
  const safeNote = note ? escapeHtml(note).replace(/\n/g, "<br />") : "Not provided";

  const result = await getTransport(config).sendMail({
    from: config.from,
    to: config.adminEmail,
    replyTo: request.email,
    subject: `Portal access request from ${request.name}`,
    text: [
      `Name: ${request.name}`,
      `Email: ${request.email}`,
      `Business: ${businessName || "Not provided"}`,
      "",
      note || "No note provided.",
    ].join("\n"),
    html: [
      "<h2>New portal access request</h2>",
      `<p><strong>Name:</strong> ${safeName}</p>`,
      `<p><strong>Email:</strong> ${safeEmail}</p>`,
      `<p><strong>Business:</strong> ${safeBusiness}</p>`,
      `<p><strong>Note:</strong><br />${safeNote}</p>`,
    ].join(""),
  });

  return { sent: true as const, messageId: result.messageId };
}

export async function sendPortalInvoiceEmail(invoice: PortalInvoiceEmail) {
  const config = readSmtpConfig();
  if (!config) return { sent: false as const, reason: "not_configured" as const };

  const safeClientName = escapeHtml(invoice.clientName);
  const safeNumber = escapeHtml(invoice.invoiceNumber);
  const safeAmount = escapeHtml(invoice.amount);
  const safeDueDate = escapeHtml(invoice.dueDate || "the due date shown");
  const safePaymentLink = invoice.paymentLink?.trim();
  const paymentText = safePaymentLink ? `Pay securely: ${safePaymentLink}` : "Payment instructions are included in your invoice.";
  const paymentHtml = safePaymentLink
    ? `<p><a href="${escapeHtml(safePaymentLink)}">Pay securely</a></p>`
    : "<p>Payment instructions are included in your invoice.</p>";

  const result = await getTransport(config).sendMail({
    from: config.from,
    to: invoice.to,
    subject: `${invoice.invoiceNumber} from Baltazar Studio`,
    text: [
      `Hi ${invoice.clientName},`,
      "",
      `Invoice ${invoice.invoiceNumber} for ${invoice.amount} is ready.`,
      `Due: ${invoice.dueDate || "See invoice"}`,
      "",
      paymentText,
      "",
      "Baltazar Studio",
    ].join("\n"),
    html: [
      `<p>Hi ${safeClientName},</p>`,
      `<p>Invoice <strong>${safeNumber}</strong> for <strong>${safeAmount}</strong> is ready.</p>`,
      `<p>Due: ${safeDueDate}</p>`,
      paymentHtml,
      "<p>Baltazar Studio</p>",
    ].join(""),
  });

  return { sent: true as const, messageId: result.messageId };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
