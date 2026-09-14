// Prototype-only decorative QR block. It is deliberately NOT a scannable code —
// every surface that shows it also carries a visible "Demo QR" label so nobody
// mistakes it for a working clinic scan in this design prototype.

function hash(seed: string, x: number, y: number): number {
  let h = 2166136261 ^ (x * 73856093) ^ (y * 19349663);
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

const GRID = 21;

function isFinder(x: number, y: number): boolean {
  const inBox = (ox: number, oy: number) =>
    x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
  return inBox(0, 0) || inBox(GRID - 7, 0) || inBox(0, GRID - 7);
}

function finderFilled(x: number, y: number): boolean {
  const lx = x < 7 ? x : x - (GRID - 7);
  const ly = y < 7 ? y : y - (GRID - 7);
  const ring = Math.max(Math.abs(lx - 3), Math.abs(ly - 3));
  return ring === 3 || ring <= 1;
}

/** Modules to paint, as [x, y] pairs, for a given seed. */
export function demoQrModules(seed: string): [number, number][] {
  const modules: [number, number][] = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (isFinder(x, y)) {
        if (finderFilled(x, y)) modules.push([x, y]);
      } else if (hash(seed, x, y) < 46) {
        modules.push([x, y]);
      }
    }
  }
  return modules;
}

/** Self-contained SVG markup, used by the printable card document. */
export function demoQrSvgMarkup(seed: string, size = 96, color = "#3D2E6B"): string {
  const rects = demoQrModules(seed)
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" />`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges" role="img" aria-label="Demo QR code">${rects}</svg>`;
}

export default function DemoQr({
  seed,
  className = "",
  color = "currentColor",
}: {
  seed: string;
  className?: string;
  color?: string;
}) {
  const modules = demoQrModules(seed);
  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Demo QR code — not scannable in this prototype"
      className={className}
    >
      {modules.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />
      ))}
    </svg>
  );
}
