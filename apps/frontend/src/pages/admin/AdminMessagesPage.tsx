import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { ContactMessage, ContactMessageStatus } from "../../lib/types";
import { useLanguage } from "../../lib/i18n";
import { Button, Card, ErrorText } from "../../components/ui";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<ContactMessageStatus, string> = {
  UNREAD: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  READ: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  REPLIED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

function StatusPill({ status }: { status: ContactMessageStatus }) {
  const { t } = useLanguage();
  const labelKeys: Record<ContactMessageStatus, string> = {
    UNREAD: "admin.status.unread",
    READ: "admin.status.read",
    REPLIED: "admin.status.replied",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {t(labelKeys[status])}
    </span>
  );
}

// Admin inbox for the public "Get in Touch" form (see ContactForm.tsx).
// Workflow: submit -> UNREAD, opening a message -> READ, sending a reply ->
// REPLIED (and emails the customer). General inquiries only — not repair
// tickets, so this never touches the queue/ticket system.
export function AdminMessagesPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadList = () =>
    api
      .get<ContactMessage[]>("/contact")
      .then(setMessages)
      .catch((e) => setListError(e instanceof ApiError ? e.message : t("admin.messages.loadListFailed")))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openMessage = async (id: number) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setReplyText("");
    try {
      // GET /api/contact/:id is what flips UNREAD -> READ server-side.
      const full = await api.get<ContactMessage>(`/contact/${id}`);
      setDetail(full);
      // Reflect the READ flip in the list without a full reload.
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: full.status } : m)));
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : t("admin.messages.loadMessageFailed"));
    }
  };

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setSending(true);
    setDetailError(null);
    try {
      const updated = await api.post<ContactMessage>(`/contact/${detail.id}/reply`, { replyText });
      setDetail(updated);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setReplyText("");
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : t("admin.messages.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter((m) => m.status === "UNREAD").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{t("admin.messages.title")}</h1>
        {unreadCount > 0 && (
          <span className="text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2.5 py-1 dark:bg-blue-500/10 dark:text-blue-400">
            {t("admin.messages.unreadBadge", { count: String(unreadCount) })}
          </span>
        )}
      </div>

      <ErrorText>{listError}</ErrorText>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 items-start">
        {/* List pane — plain div (not <Card>) since Card always adds p-6
            padding and this needs full-bleed rows instead. */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
          {loading ? (
            <p className="text-sm text-slate-500 p-4 dark:text-slate-500">{t("admin.messages.loading")}</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 px-4 dark:text-slate-400">
              {t("admin.messages.emptyList")}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto dark:divide-slate-700">
              {messages.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => openMessage(m.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      selectedId === m.id ? "bg-slate-50 dark:bg-slate-700" : ""
                    } ${m.status === "UNREAD" ? "font-semibold" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-800 truncate dark:text-white">{m.name}</span>
                      {m.status === "UNREAD" && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 dark:text-slate-500">{m.reference}</p>
                    <p className="text-xs text-slate-500 truncate mt-1 font-normal dark:text-slate-400">{m.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <StatusPill status={m.status} />
                      <span className="text-xs text-slate-500 dark:text-slate-500">{formatDateTime(m.createdAt)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail pane */}
        <Card>
          {!selectedId ? (
            <p className="text-sm text-slate-500 text-center py-12 dark:text-slate-500">
              {t("admin.messages.selectPrompt")}
            </p>
          ) : !detail ? (
            <p className="text-sm text-slate-500 text-center py-12 dark:text-slate-500">{t("admin.messages.loading")}</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{detail.name}</p>
                  <div className="flex flex-wrap gap-x-3 text-sm mt-1">
                    <a href={`mailto:${detail.email}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {detail.email}
                    </a>
                    {detail.phone && (
                      <a href={`tel:${detail.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">
                        {detail.phone}
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <StatusPill status={detail.status} />
                  <p className="text-xs text-slate-500 mt-1 dark:text-slate-500">{formatDateTime(detail.createdAt)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 dark:bg-slate-900 dark:border-slate-700">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5 dark:text-slate-500">
                  {t("admin.messages.messageLabel")}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap dark:text-slate-300">{detail.message}</p>
              </div>

              {detail.status === "REPLIED" && detail.replyText && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                  <p className="text-xs uppercase tracking-wide text-emerald-600 mb-1.5 dark:text-emerald-400">
                    {t("admin.messages.yourReply")} · {detail.repliedAt && formatDateTime(detail.repliedAt)}
                  </p>
                  <p className="text-sm text-emerald-800 whitespace-pre-wrap dark:text-emerald-300">{detail.replyText}</p>
                </div>
              )}

              <form onSubmit={handleReply} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {detail.status === "REPLIED" ? t("admin.messages.sendAnotherReply") : t("admin.messages.replyToCustomer")}
                </label>
                <textarea
                  required
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("admin.messages.replyPlaceholder", { name: detail.name.split(" ")[0] })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
                <ErrorText>{detailError}</ErrorText>
                <Button type="submit" disabled={sending}>
                  {sending ? t("admin.messages.sending") : t("admin.messages.sendButton")}
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
