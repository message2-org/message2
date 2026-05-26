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
