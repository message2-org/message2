import { useEffect } from "react";
import { Locale } from "../i18n";
import { Message } from "../types";

type Props = {
  locale: Locale;
  kind: "forward" | "delete";
  message: Message;
  onClose: () => void;
  onForward: (message: Message) => void;
  onDeleteForSelf: (message: Message) => void;
  onDeleteForEveryone: (message: Message) => void;
};

export function MessageActionDialog(props: Props) {
  const { locale, kind, message, onClose, onForward, onDeleteForSelf, onDeleteForEveryone } = props;
  const isOwn = message.sender === "me";
  const title =
    kind === "forward"
      ? locale === "ru"
        ? "Переслать сообщение"
        : "Forward message"
      : locale === "ru"
        ? "Удалить сообщение"
        : "Delete message";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="confirm-popup message-action-dialog" onClick={(event) => event.stopPropagation()}>
        <h4>{title}</h4>
        {kind === "forward" ? (
          <>
            <p>{locale === "ru" ? "Куда переслать это сообщение?" : "Where should this message be forwarded?"}</p>
            <div className="message-action-dialog__choices">
              <button
                type="button"
                className="message-action-dialog__choice"
                onClick={() => {
                  onForward(message);
                  onClose();
                }}
              >
                {locale === "ru" ? "Переслать в чат…" : "Forward to chat…"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              {locale === "ru"
                ? "Сообщение можно удалить только у вас или у всех участников чата."
                : "You can delete this message only for yourself or for everyone in the chat."}
            </p>
            <div className="message-action-dialog__choices">
              <button
                type="button"
                className="message-action-dialog__choice"
                onClick={() => {
                  onDeleteForSelf(message);
                  onClose();
                }}
              >
                {locale === "ru" ? "Удалить у меня" : "Delete for me"}
              </button>
              {isOwn ? (
                <button
                  type="button"
                  className="message-action-dialog__choice message-action-dialog__choice--danger"
                  onClick={() => {
                    onDeleteForEveryone(message);
                    onClose();
                  }}
                >
                  {locale === "ru" ? "Удалить для всех" : "Delete for everyone"}
                </button>
              ) : null}
            </div>
          </>
        )}
        <div className="confirm-popup__actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            {locale === "ru" ? "Отмена" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
