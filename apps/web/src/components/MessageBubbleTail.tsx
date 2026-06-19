type Props = {
  side?: "incoming" | "outgoing";
};

/**
 * Unit square: (0,0) TL, (1,0) TR, (1,1) BR, (0,1) BL.
 * Outline: straight (1,0)→(1,1)→(0,1), then arc (0,1)→(1,0) with center at (0,0).
 * Outgoing mirrors horizontally for the bottom-right corner.
 */
export function MessageBubbleTail({ side = "incoming" }: Props) {
  const s = 10;
  const k = 0.5522847498;
  const cx1 = s * k;
  const cy2 = s * k;
  const curve = `C ${cx1} ${s} ${s} ${cy2} ${s} 0`;
  const outline = `M${s} 0 V${s} H0 ${curve}`;
  const edge = `M${s} ${s} H0 ${curve}`;
  return (
    <svg
      className={`message__tail ${side === "outgoing" ? "message__tail--outgoing" : ""}`}
      viewBox={`0 0 ${s} ${s}`}
      aria-hidden="true"
    >
      <path className="message__tail-fill" d={`${outline} Z`} />
      <path className="message__tail-edge" d={edge} fill="none" />
    </svg>
  );
}
