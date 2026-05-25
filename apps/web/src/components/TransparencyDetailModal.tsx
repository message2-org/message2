import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "../i18n";
import { copy } from "../i18n";
import type { ComplaintRecord, TransparencyDetailResponse } from "../types";

type TransparencyDetailModalProps = {
  locale: Locale;
  eventId: string;
  onClose: () => void;
  loadDetail: (eventId: string) => Promise<TransparencyDetailResponse>;
  submitComplaint: (eventId: string, text: string) => Promise<{ ok: boolean; error?: string }>;
};

export function TransparencyDetailModal({
  locale,
  eventId,
  onClose,
  loadDetail,
  submitComplaint
}: TransparencyDetailModalProps) {
  const t = copy[locale];
  const [detail, setDetail] = useState<TransparencyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaintText, setComplaintText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDetail(eventId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setMessage(t.transparencyLoadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, loadDetail, t.transparencyLoadError]);

  const complaint = detail?.complaint as ComplaintRecord | null | undefined;
  const event = detail?.event;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const result = await submitComplaint(eventId, complaintText.trim());
    setSubmitting(false);
    if (result.ok) {
      setMessage(t.transparencyComplaintSent);
      const refreshed = await loadDetail(eventId);
      setDetail(refreshed);
      setComplaintText("");
      return;
    }
    if (result.error === "duplicate_complaint") {
      setMessage(t.transparencyComplaintDuplicate);
      return;
    }
    setMessage(t.transparencyComplaintFailed);
  };

  const formatScope = (scope: Record<string, unknown> | undefined) => {
    if (!scope) return "—";
    const parts: string[] = [];
    for (const key of ["chatIds", "messageIds", "userIds", "channelIds"] as const) {
      const value = scope[key];
      if (Array.isArray(value) && value.length) {
        parts.push(`${key}: ${value.length}`);
      }
    }
    return parts.length ? parts.join(", ") : "—";
  };

  return (
    <div className="transparency-modal" role="dialog" aria-modal="true" aria-labelledby="transparency-modal-title">
      <button type="button" className="transparency-modal__backdrop" onClick={onClose} aria-label={t.transparencyClose} />
      <div className="transparency-modal__panel">
        <header className="transparency-modal__header">
          <h2 id="transparency-modal-title">{t.transparencyDetailTitle}</h2>
          <button type="button" className="transparency-modal__close" onClick={onClose} aria-label={t.transparencyClose}>
            ×
          </button>
        </header>

        {loading ? (
          <p className="transparency-modal__muted">{t.wait}</p>
        ) : (
          <>
            <p className="transparency-modal__summary">{event?.summary ?? detail?.notice.summary}</p>
            <dl className="transparency-modal__meta">
              <div>
                <dt>{t.transparencyAction}</dt>
                <dd>{event?.action ?? detail?.notice.action}</dd>
              </div>
              <div>
                <dt>{t.transparencyDisclosure}</dt>
                <dd>{event?.disclosureLevel ?? detail?.notice.disclosureLevel}</dd>
              </div>
              <div>
                <dt>{t.transparencyScope}</dt>
                <dd>{formatScope(event?.scope as Record<string, unknown> | undefined)}</dd>
              </div>
              <div>
                <dt>{t.transparencyWhen}</dt>
                <dd>{new Date(event?.createdAt ?? detail?.notice.createdAt ?? Date.now()).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}</dd>
              </div>
            </dl>

            {complaint ? (
              <div className="transparency-modal__complaint-status">
                <p>
                  <strong>{t.transparencyComplaintStatus}:</strong> {complaint.status}
                </p>
                {complaint.outcomeSummary ? <p>{complaint.outcomeSummary}</p> : null}
              </div>
            ) : (
              <form className="transparency-modal__form" onSubmit={handleSubmit}>
                <label htmlFor="complaint-text">{t.transparencyComplaintLabel}</label>
                <textarea
                  id="complaint-text"
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  rows={5}
                  minLength={80}
                  required
                  placeholder={t.transparencyComplaintPlaceholder}
                />
                <p className="transparency-modal__hint">{t.transparencyComplaintHint}</p>
                <button type="submit" disabled={submitting || complaintText.trim().length < 80}>
                  {submitting ? t.wait : t.transparencyComplaintSubmit}
                </button>
              </form>
            )}

            {message ? <p className="transparency-modal__message">{message}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
