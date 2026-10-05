// Shared red counter badge. Every counter in the app uses this component so
// size, padding and typography stay identical no matter how many digits the
// number has.
export default function ChatRxCount({
  count,
  className = "",
  label,
  ringClassName = "ring-card",
}: {
  count: number;
  className?: string;
  label?: string;
  /** Tailwind class for the outer ring; set it to the surrounding surface color when the badge sits on a colored button. */
  ringClassName?: string;
}) {
  if (count === 0) return null;
  const text = label ?? `${count} prescription requests need your attention`;
  return (
    <span
      aria-label={text}
      title={text}
      className={`inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10.5px] font-bold leading-none text-destructive-foreground ring-2 ${ringClassName} ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
