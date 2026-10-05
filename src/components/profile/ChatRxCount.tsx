export default function ChatRxCount({ count, className = "" }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} prescription requests need your attention`}
      title={`${count} prescription requests need your attention`}
      className={`inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-destructive-foreground ring-2 ring-card ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}