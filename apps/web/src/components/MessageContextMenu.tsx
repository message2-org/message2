import { useEffect, useRef, useState, type ReactNode } from "react";
import { Locale } from "../i18n";
import { Message } from "../types";
import {
  CopyIcon,
  ForwardIcon,
  PencilIcon,
  ReplyIcon,
  SelectCircleIcon,
  StarIcon,
  TrashIcon
} from "./ui-icons";

type Props = {
  locale: Locale;
  message: Message;
  x: number;
  y: number;
  onClose: () => void;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onDelete: (message: Message) => void;
  onCopyText: (message: Message) => void;
  onEdit: (message: Message) => void;
  onSelect: (message: Message) => void;
  onMarkImportant: (message: Message) => void;
};

type MenuRow = {
  id: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
};

function clampMenuPosition(x: number, y: number, width: number, height: number) {
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    left: Math.min(Math.max(margin, x), maxX),
    top: Math.min(Math.max(margin, y), maxY)
  };
}

export function MessageContextMenu(props: Props) {
  const {
    locale,
    message,
    x,
    y,
    onClose,
    onReply,
    onForward,
    onDelete,
    onCopyText,
    onEdit,
    onSelect,
    onMarkImportant
  } = props;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  const isOwn = message.sender === "me";
  const isPlainText = Boolean(message.text?.trim()) && !message.sticker && !message.preview;
  const canEdit = isOwn && isPlainText && !message.isDeleted && !message.isTombstone;
  const copyLabel = message.sticker?.label ?? message.fileName ?? message.text?.trim() ?? "";

  const rows: MenuRow[] = [
    {
      id: "reply",
      label: locale === "ru" ? "Ответить" : "Reply",
      icon: <ReplyIcon />,
      onClick: () => {
        onReply(message);
        onClose();
      }
    },
    {
      id: "forward",
      label: locale === "ru" ? "Переслать" : "Forward",
      icon: <ForwardIcon />,
      onClick: () => {
        onForward(message);
        onClose();
      }
    }
  ];

  if (isOwn) {
    rows.push({
      id: "important",
      label: locale === "ru" ? "Отметить как важное" : "Mark as important",
      icon: <StarIcon />,
      onClick: () => {
        onMarkImportant(message);
        onClose();
      }
    });
  }

  if (copyLabel) {
    rows.push({
      id: "copy",
      label: locale === "ru" ? "Копировать текст" : "Copy text",
      icon: <CopyIcon />,
      onClick: () => {
        onCopyText(message);
        onClose();
      }
    });
  }

  if (canEdit) {
    rows.push({
      id: "edit",
      label: locale === "ru" ? "Редактировать" : "Edit",
      icon: <PencilIcon />,
      onClick: () => {
        onEdit(message);
        onClose();
      }
    });
  }

  rows.push({
    id: "delete",
    label: locale === "ru" ? "Удалить" : "Delete",
    icon: <TrashIcon />,
    danger: true,
    onClick: () => {
      onDelete(message);
      onClose();
    }
  });

  rows.push({
    id: "select",
    label: locale === "ru" ? "Выбрать" : "Select",
    icon: <SelectCircleIcon />,
    onClick: () => {
      onSelect(message);
      onClose();
    }
  });

  useEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition(clampMenuPosition(x, y, rect.width, rect.height));
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="message-context-menu chat-panel__menu"
      style={{ top: position.top, left: position.left }}
      role="menu"
    >
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className={`message-context-menu__btn${row.danger ? " chat-panel__menu-danger" : ""}`}
          onClick={row.onClick}
        >
          {row.icon}
          <span className="message-context-menu__label">{row.label}</span>
        </button>
      ))}
    </div>
  );
}
