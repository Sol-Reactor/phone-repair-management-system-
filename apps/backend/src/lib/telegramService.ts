import TelegramBot from "node-telegram-bot-api";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Telegram notification service — same "boilerplate, stub if unconfigured"
// pattern as lib/notifications.ts: wired up structurally, but sends nothing
// real (just logs) until TELEGRAM_BOT_TOKEN is set in .env.
//
// IMPORTANT constraint this design works around: the Telegram Bot API
// cannot message a phone number or @username directly. A bot may only send
// a message to a chat_id it has already seen in an incoming update — i.e.
// the customer has to message the bot first. So instead of "enter your
// Telegram username at registration" (which wouldn't actually work), the
// flow here is a deep link:
//
//   https://t.me/<TELEGRAM_BOT_USERNAME>?start=<trackingCode>
//
// The customer taps that link (e.g. from their receipt), Telegram opens a
// chat with the bot and sends "/start <trackingCode>", the handler below
// resolves the tracking code back to a Ticket -> Customer and stores the
// resulting chat_id on that customer. From then on we can message them.
// ---------------------------------------------------------------------------

let bot: TelegramBot | null = null;

function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

// Call once at server boot (see src/index.ts). No-ops if unconfigured, same
// as the rest of the app's optional-integration pattern — nothing else
// should break because a bot token isn't set in dev.
export function initTelegramBot(): void {
  if (!isTelegramConfigured()) {
    // eslint-disable-next-line no-console
    console.log("[telegram] (stub — TELEGRAM_BOT_TOKEN not set) bot not started");
    return;
  }

  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: true });

  bot.onText(/^\/start(?:\s+(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const trackingCode = match?.[1];

    if (!trackingCode) {
      await bot?.sendMessage(
        chatId,
        "Hi! To get repair updates here, open the Telegram link on your repair receipt (it includes your tracking code)."
      );
      return;
    }

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { trackingCode },
        include: { customer: true },
      });

      if (!ticket) {
        await bot?.sendMessage(chatId, `Sorry, I couldn't find a repair with tracking code ${trackingCode}.`);
        return;
      }

      await prisma.customer.update({
        where: { id: ticket.customerId },
        data: { telegramChatId: String(chatId) },
      });

      await bot?.sendMessage(
        chatId,
        `You're linked! I'll message you here as soon as your ${ticket.deviceBrand} ${ticket.deviceModel} (ticket #${ticket.id}) is ready for pickup.`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[telegram] Failed to link chat via /start:", err);
      await bot?.sendMessage(chatId, "Something went wrong linking your account — please try again shortly.");
    }
  });

  bot.on("polling_error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[telegram] polling error:", err.message);
  });

  // eslint-disable-next-line no-console
  console.log("[telegram] bot started (polling)");
}

// Builds the deep link the customer taps to link their chat. Returns null
// if TELEGRAM_BOT_USERNAME isn't set, so callers (e.g. the receipt UI) can
// simply hide the "Get Telegram updates" QR/link when it's unconfigured.
export function getTelegramLinkUrl(trackingCode: string): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return null;
  return `https://t.me/${username}?start=${trackingCode}`;
}

// ---------------------------------------------------------------------------
// Ready for Pickup — mirrors sendReadyForPickupNotification's shape/behavior
// in lib/notifications.ts: swallows its own errors so a Telegram hiccup
// never fails the status-update request that triggered it.
// ---------------------------------------------------------------------------

export async function sendReadyForPickupTelegramMessage(params: {
  telegramChatId: string;
  ticketId: number;
}): Promise<void> {
  const text = `Hello! Your phone repair (ID: ${params.ticketId}) is complete and ready for pickup!`;

  if (!isTelegramConfigured() || !bot) {
    // eslint-disable-next-line no-console
    console.log(
      `[telegram] (stub — bot not configured/started) would message chat ${params.telegramChatId}: "${text}"`
    );
    return;
  }

  try {
    await bot.sendMessage(params.telegramChatId, text);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[telegram] Failed to message chat ${params.telegramChatId}:`, err);
  }
}
