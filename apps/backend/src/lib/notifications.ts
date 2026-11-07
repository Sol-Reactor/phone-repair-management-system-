import nodemailer from "nodemailer";

// Every value interpolated into an email body is HTML-escaped. Customer
// names, device models and contact messages are user-controlled — without
// this, a "name" like <a href=...> becomes a phishing link inside an email
// that genuinely comes from the shop.
function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((out, s, i) => out + s + (i < values.length ? escapeHtml(values[i]) : ""), "");
}

// ---------------------------------------------------------------------------
// Notification service — BOILERPLATE.
//
// Wired up structurally (called from ticketController on ticket creation and
// whenever status transitions to DONE) but sends nothing real until you
// configure credentials in .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_FROM_EMAIL
// and, for the admin alert specifically:
//   ADMIN_NOTIFY_EMAIL
// Until then it just logs what it *would* send, so nothing breaks in dev.
//
// To use Resend instead of Nodemailer/SMTP: swap sendPlainEmail's body for
//   import { Resend } from "resend";
//   const resend = new Resend(process.env.RESEND_API_KEY);
//   await resend.emails.send({ from, to, subject, html });
// (npm install resend, remove the nodemailer dependency).
//
// SMS is stubbed the same way — swap in Twilio or whatever provider you
// pick, following the same "log if unconfigured" pattern.
// ---------------------------------------------------------------------------

function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendPlainEmail(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    // eslint-disable-next-line no-console
    console.log(`[notifications] (stub — SMTP not configured) would email ${to}: "${subject}"`);
    return;
  }

  try {
    await getTransporter().sendMail({
      from: process.env.NOTIFY_FROM_EMAIL ?? "no-reply@example.com",
      to,
      subject,
      html,
    });
  } catch (err) {
    // A failed notification should never fail the request that triggered
    // it — log it and move on.
    // eslint-disable-next-line no-console
    console.error(`[notifications] Failed to email ${to}:`, err);
  }
}

function sendSmsStub(phone: string, message: string): void {
  // Stub — replace with e.g. Twilio:
  //   const twilio = require("twilio")(accountSid, authToken);
  //   await twilio.messages.create({ to: phone, from: TWILIO_FROM, body: message });
  // eslint-disable-next-line no-console
  console.log(`[notifications] (stub — no SMS provider wired) would text ${phone}: "${message}"`);
}

// ---------------------------------------------------------------------------
// New booking (Issue 1): confirm the ticket ID to the client, alert the shop.
// ---------------------------------------------------------------------------

type NewBookingPayload = {
  ticketId: number;
  trackingCode: string;
  deviceBrand: string;
  deviceModel: string;
  repairTypeName: string;
  estimatedCost: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
};

export async function sendNewBookingNotifications(payload: NewBookingPayload): Promise<void> {
  const trackUrl = `${process.env.PUBLIC_APP_URL ?? "http://localhost:5173"}/track/${payload.trackingCode}`;

  const clientEmail = payload.customerEmail
    ? sendPlainEmail(
        payload.customerEmail,
        `Your repair ticket #${payload.ticketId} has been created`,
        html`
          <p>Hi ${payload.customerName},</p>
          <p>Thanks for booking with us! Here are your details:</p>
          <ul>
            <li><strong>Ticket ID:</strong> #${payload.ticketId}</li>
            <li><strong>Tracking code:</strong> ${payload.trackingCode}</li>
            <li><strong>Device:</strong> ${payload.deviceBrand} ${payload.deviceModel}</li>
            <li><strong>Repair:</strong> ${payload.repairTypeName}</li>
            <li><strong>Estimated cost:</strong> $${payload.estimatedCost.toFixed(2)}</li>
          </ul>
          <p>Track your repair anytime at <a href="${trackUrl}">${trackUrl}</a>.</p>
          <p>Please save your ticket ID and tracking code.</p>
        `
      )
    : Promise.resolve();

  const adminEmailAddress = process.env.ADMIN_NOTIFY_EMAIL;
  const adminEmail = adminEmailAddress
    ? sendPlainEmail(
        adminEmailAddress,
        `New repair ticket #${payload.ticketId} — ${payload.customerName}`,
        html`
          <p>New ticket registered:</p>
          <ul>
            <li><strong>Ticket ID:</strong> #${payload.ticketId}</li>
            <li><strong>Customer:</strong> ${payload.customerName} (${payload.customerPhone})</li>
            <li><strong>Device:</strong> ${payload.deviceBrand} ${payload.deviceModel}</li>
            <li><strong>Repair:</strong> ${payload.repairTypeName}</li>
          </ul>
        `
      )
    : Promise.resolve();

  if (!adminEmailAddress) {
    // eslint-disable-next-line no-console
    console.log(
      `[notifications] (stub — ADMIN_NOTIFY_EMAIL not set) would alert admin: new ticket #${payload.ticketId}`
    );
  }

  sendSmsStub(payload.customerPhone, `Ticket #${payload.ticketId} created! Track: ${trackUrl}`);

  await Promise.all([clientEmail, adminEmail]);
}

// ---------------------------------------------------------------------------
// Ready for Pickup (existing feature — unchanged behavior)
// ---------------------------------------------------------------------------

type ReadyForPickupPayload = {
  ticketId: number;
  trackingCode: string;
  deviceBrand: string;
  deviceModel: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
};

export async function sendReadyForPickupNotification(payload: ReadyForPickupPayload): Promise<void> {
  const subject = `Your ${payload.deviceBrand} ${payload.deviceModel} is ready for pickup!`;
  const body = html`
    <p>Hi ${payload.customerName},</p>
    <p>Good news — your <strong>${payload.deviceBrand} ${payload.deviceModel}</strong> (ticket #${payload.ticketId}) is
    repaired and ready for pickup.</p>
    <p>Track anytime with code <strong>${payload.trackingCode}</strong>.</p>
  `;

  const email = payload.customerEmail ? sendPlainEmail(payload.customerEmail, subject, body) : Promise.resolve();
  sendSmsStub(payload.customerPhone, `Your ${payload.deviceBrand} ${payload.deviceModel} is ready for pickup!`);

  await email;
}

// ---------------------------------------------------------------------------
// Admin Inbox reply (Contact/Feedback messages) — emails the customer back
// with the admin's typed reply, quoting their original message underneath
// for context. Triggered from POST /api/contact/:id/reply.
// ---------------------------------------------------------------------------

type ContactReplyPayload = {
  customerName: string;
  customerEmail: string;
  originalMessage: string;
  replyText: string;
};

export async function sendContactReplyEmail(payload: ContactReplyPayload): Promise<void> {
  const subject = "Re: your message to QuickFix Phone Repair";

  // Simple template: the admin's reply first (what the customer actually
  // came for), then their own original message quoted below for context —
  // same pattern as a typical email "reply" thread.
  const body = html`
    <p>Hi ${payload.customerName},</p>
    <p style="white-space: pre-wrap;">${payload.replyText}</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
    <p style="color: #64748b; font-size: 13px;">Your original message:</p>
    <p style="color: #64748b; font-size: 13px; white-space: pre-wrap;">${payload.originalMessage}</p>
  `;

  await sendPlainEmail(payload.customerEmail, subject, body);
}
