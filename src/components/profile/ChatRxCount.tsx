// Shared red counter badge. Every counter in the app uses this component so
// size, padding and typography stay identical no matter how many digits the
// number has.
export default function ChatRxCount({
  count,
  className = "",
  label,
}: {
  count: number;
  className?: string;
  label?: string;
}) {
  if (count === 0) return null;
  const text = label ?? `${count} prescription requests need your attention`;
  return (
    <span
      aria-label={text}
      title={text}
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-destructive-foreground ring-2 ring-card ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
