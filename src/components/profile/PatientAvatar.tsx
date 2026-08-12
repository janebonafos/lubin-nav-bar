/**
 * Avatar for a patient row: shows their photo when one is on file, otherwise
 * their initials. Falls back to a neutral glyph only when no name is known.
 */
export default function PatientAvatar({
  name,
  photoUrl,
  size = 36,
  className = "",
}: {
  name?: string;
  photoUrl?: string;
  size?: number;
  className?: string;
}) {
  const initials = getInitials(name);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name}'s photo` : "Patient photo"}
        style={style}
        className={`shrink-0 rounded-xl object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden={false}
      aria-label={name ? `${name} initials` : "Patient"}
      style={style}
      className={`grid shrink-0 place-items-center rounded-xl bg-[#EFE8FB] font-bold uppercase leading-none tracking-[0.02em] text-[#3D2E6B] ${className}`}
    >
      {initials || "?"}
    </span>
  );
}

function getInitials(name?: string): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter((p) => /[a-z0-9]/i.test(p));
  if (parts.length === 0) return "";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
