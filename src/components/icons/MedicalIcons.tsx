import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number };

const base = (p: P) => {
  const { size = 24, strokeWidth = 2, ...rest } = p;
  return {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, ...rest,
  };
};

/** Anatomical heart with aorta and vessels */
export function AnatomicalHeart(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M9 6.5c-1.6-.9-4.5-.4-5.3 2.4-.9 3.2 1.2 6.6 3.6 9 1.6 1.6 3.3 3.1 5.2 3.1 2.6 0 5.8-3.4 6.9-6.6 1-3-.2-6.2-2.9-6.9-1.4-.4-2.7 0-3.6.8" />
      <path d="M10 8.5V4.5c0-.9.7-1.5 1.5-1.5H14" />
      <path d="M13 8V5.5c0-.8.6-1.5 1.5-1.5H17" />
      <path d="M7.5 7V4" />
      <path d="M10 13c1 1.5 2.5 2.3 4.2 2.3" />
    </svg>
  );
}

/** Skin cross-section: surface wave, layers and a hair follicle */
export function SkinLayers(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3 9c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
      <path d="M3 14h18" />
      <path d="M3 19h18" />
      <path d="M12 9.5V3.5" />
      <circle cx="12" cy="15.5" r="1.5" />
      <path d="M12 11v3" />
      <path d="M6.5 16.5h.01M17.5 16.5h.01" />
    </svg>
  );
}
