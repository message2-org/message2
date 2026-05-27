export function BrandLogo({ theme, className }: { theme: "light" | "dark"; className: string }) {
  const circle = theme === "dark" ? "#8774E1" : "#2E78E8";
  const plane = theme === "dark" ? "#111218" : "#F5F8FF";
  return (
    <svg className={className} viewBox="0 0 1000 1000" aria-hidden="true">
      <circle cx="500" cy="500" r="470" fill={circle} />
      <path fill={plane} d="M500 145L764 720L568 690L500 670L432 690L236 720L500 145Z" />
      <polygon fill={circle} points="498,165 502,165 560,680 500,660 440,680" />
      <line x1="500" y1="170" x2="500" y2="665" stroke={plane} strokeWidth="12" strokeLinecap="round" />
      <polygon fill={plane} points="338,682 424,682 381,798" />
      <polygon fill={plane} points="576,682 662,682 619,798" />
      <line x1="381" y1="836" x2="381" y2="1010" stroke={plane} strokeWidth="18" strokeLinecap="round" />
      <line x1="619" y1="836" x2="619" y2="1010" stroke={plane} strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}

export function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.5-4-1.5-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 .1.6 2.7 3.5 1.9 0-.8.4-1.4.7-1.7-2.7-.3-5.4-1.3-5.4-5.8 0-1.2.4-2.1 1.2-2.9-.1-.3-.5-1.4.1-3 0 0 1-.3 3.1 1.1a10.9 10.9 0 0 1 5.7 0c2.2-1.4 3.1-1.1 3.1-1.1.6 1.6.2 2.7.1 3 .8.8 1.2 1.7 1.2 2.9 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1 .8 2.1v3.1c0 .4.2.7.8.6A12 12 0 0 0 12 .5Z"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5 19c1.5-2.7 4.1-4 7-4s5.5 1.3 7 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline points="18,9 21,12 18,15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.6l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="4.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 8.8v9.7a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V8.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="12.5" x2="15" y2="12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AppChatIcon() {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true">
      <defs>
        <linearGradient id="chatAppMetalBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4b505c" />
          <stop offset="46%" stopColor="#2e323c" />
          <stop offset="100%" stopColor="#171a22" />
        </linearGradient>
      </defs>
      <path fill="currentColor" d="M128 38L196 186L145 178L128 173L111 178L60 186L128 38Z" />
      <polygon fill="url(#chatAppMetalBase)" opacity="0.55" points="127,43 129,43 144,176 128,171 112,176" />
      <line x1="128" y1="45" x2="128" y2="172" stroke="#f7f9fc" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <polygon fill="#eceff5" opacity="0.78" points="86,176 108,176 97,206" />
      <polygon fill="#eceff5" opacity="0.78" points="148,176 170,176 159,206" />
      <line x1="97" y1="214" x2="97" y2="248" stroke="#f1f4fb" strokeWidth="5" strokeLinecap="round" opacity="0.82" />
      <line x1="159" y1="214" x2="159" y2="248" stroke="#f1f4fb" strokeWidth="5" strokeLinecap="round" opacity="0.82" />
    </svg>
  );
}

export function SavedMessagesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10a1.8 1.8 0 0 1 1.8 1.8V20l-6.8-4-6.8 4V5.8A1.8 1.8 0 0 1 7 4Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckSingleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="5,13 10,18 19,7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckDoubleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="2.5,13 7.5,18 12,13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="8.5,13 13.5,18 21.5,7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 8.2h3l1.3-2h6.4l1.3 2h3a1.7 1.7 0 0 1 1.7 1.7v8.6a1.7 1.7 0 0 1-1.7 1.7h-15A1.7 1.7 0 0 1 2.8 18.5V9.9a1.7 1.7 0 0 1 1.7-1.7Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="13.2" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.2c-4.9 0-8.8 3.4-8.8 7.8 0 3.9 3 6.8 7.2 6.8h1.3c.9 0 1.6.7 1.6 1.6 0 .8.6 1.4 1.4 1.4 4.1 0 7.3-3.1 7.3-7.4 0-5.7-4.6-10.2-10-10.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="7.7" cy="10.1" r="1.2" fill="currentColor" />
      <circle cx="11" cy="7.8" r="1.2" fill="currentColor" />
      <circle cx="14.8" cy="8.1" r="1.2" fill="currentColor" />
      <circle cx="16.9" cy="11.7" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function LanguageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h10M9 6c0 4.8-2.4 8.5-6 10.8M6 10c1.5 1.9 3.2 3.6 5.2 5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M14.5 9.5h5l-2.5 7.2-2.5-7.2ZM13.5 18.2h7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l4.1-1 9.7-9.7-3.1-3.1L5 15.9 4 20Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M13.8 6.2 17 9.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.1 13.2a7.7 7.7 0 0 0 .1-1.2 7.7 7.7 0 0 0-.1-1.2l2-1.6-1.9-3.3-2.4 1a7.8 7.8 0 0 0-2.1-1.2l-.4-2.5H9.7l-.4 2.5a7.8 7.8 0 0 0-2.1 1.2l-2.4-1L2.9 9.2l2 1.6A7.7 7.7 0 0 0 4.8 12c0 .4 0 .8.1 1.2l-2 1.6 1.9 3.3 2.4-1c.6.5 1.3.9 2.1 1.2l.4 2.5h4.6l.4-2.5c.8-.3 1.5-.7 2.1-1.2l2.4 1 1.9-3.3-2-1.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DotsVerticalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 17h12l-1.4-1.8V10a4.6 4.6 0 0 0-9.2 0v5.2L6 17Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="6.5" width="12.5" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M16 10.2 21 7.8v8.4L16 13.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14 7.5 16.5a3.2 3.2 0 1 1-4.5-4.5L5.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M14 10 16.5 7.5a3.2 3.2 0 1 1 4.5 4.5L18.5 14.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.8h7.4L19 8.4v11.8a1.8 1.8 0 0 1-1.8 1.8H7a1.8 1.8 0 0 1-1.8-1.8V5.6A1.8 1.8 0 0 1 7 3.8Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M14.4 3.8v4.7H19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path d="m6 17 4.5-4.5 2.7 2.7 2.3-2.3L18 17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="16.8" cy="8.4" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.5 18.5c1.1-2.2 3-3.4 5.3-3.4s4.2 1.2 5.3 3.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M14.8 16.2c.7-1.4 1.9-2.2 3.4-2.2 1 0 1.8.3 2.5.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4h6l-1 5.4 2.8 2.6v1.3H7.2V12l2.8-2.6L9 4Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <line x1="12" y1="13.5" x2="12" y2="21" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9.1" y="3.8" width="5.8" height="9.8" rx="2.9" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M6.5 10.8a5.5 5.5 0 0 0 11 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="12" y1="16.3" x2="12" y2="20.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.8" y="5.5" width="16.4" height="14.2" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <line x1="3.8" y1="9.2" x2="20.2" y2="9.2" stroke="currentColor" strokeWidth="1.9" />
      <line x1="8" y1="3.5" x2="8" y2="7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="16" y1="3.5" x2="16" y2="7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function ChecklistIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="4,7 6,9 9,5.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="11" y1="7.3" x2="20" y2="7.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <polyline points="4,13 6,15 9,11.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="11" y1="13.3" x2="20" y2="13.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="4" y1="19.3" x2="20" y2="19.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function PollIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.2" y="12.5" width="3.2" height="7" rx="1" fill="currentColor" />
      <rect x="10.4" y="9.5" width="3.2" height="10" rx="1" fill="currentColor" />
      <rect x="16.6" y="6.5" width="3.2" height="13" rx="1" fill="currentColor" />
    </svg>
  );
}

export function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.8" y="6.5" width="16.4" height="11.8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M3.8 9.2h16.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="16.2" cy="14.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.5 12.7 14 7.2a3.2 3.2 0 1 1 4.5 4.5l-7.2 7.2a5 5 0 1 1-7.1-7.1l7.9-7.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SendPlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 11.6 20.8 4l-4.9 16-4.4-5.2-8 1.6Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <line x1="11.6" y1="14.8" x2="20.2" y2="4.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
