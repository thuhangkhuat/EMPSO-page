import { useEffect, useMemo, useRef, useState } from "react";

export interface SearchScenario {
  mapSize: number;
  offset: number; // path coordinate + offset = 1-based map index
  start: number[];
  steps: number;
  targetMoves: number;
  targetShift: number[]; // [row, col] shift of the belief per target move
  pmap: number[][]; // rows = y, cols = x
  paths: number[][][];
  jointCost: number;
}

// Same order as the paths in the paper figures (paths5.png).
const UAV_COLORS = ["#ff0000", "#00ff00", "#00ffff", "#000000", "#ff8000", "#ffffff", "#ff00ff"];

// Parula-like colormap, to match the MATLAB figures elsewhere on the page.
const PARULA: [number, number, number][] = [
  [53, 42, 135],
  [15, 92, 221],
  [18, 125, 216],
  [7, 156, 207],
  [21, 177, 180],
  [89, 189, 140],
  [165, 190, 107],
  [225, 185, 82],
  [252, 206, 46],
  [249, 251, 14],
];

function colormap(v: number): [number, number, number] {
  const x = Math.min(Math.max(v, 0), 1) * (PARULA.length - 1);
  const i = Math.min(Math.floor(x), PARULA.length - 2);
  const f = x - i;
  const a = PARULA[i];
  const b = PARULA[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Non-circular shift, missing cells filled with zeros (noncircshift.m).
function shift(map: Float64Array, size: number, [dr, dc]: number[]) {
  const out = new Float64Array(size * size);
  for (let r = 0; r < size; r++) {
    const sr = r - dr;
    if (sr < 0 || sr >= size) continue;
    for (let c = 0; c < size; c++) {
      const sc = c - dc;
      if (sc < 0 || sc >= size) continue;
      out[r * size + c] = map[sr * size + sc];
    }
  }
  return out;
}

function normalize(map: Float64Array) {
  const sum = map.reduce((s, v) => s + v, 0);
  if (sum > 0) for (let i = 0; i < map.length; i++) map[i] /= sum;
}

// Belief map at every step under the target's motion only (the prediction step
// of JointCost.m); cells the UAVs visit are left unchanged, as in the paper figures.
function simulate(data: SearchScenario) {
  const { mapSize: size, steps, targetMoves, targetShift, offset } = data;
  const cell = ([x, y]: number[]) => {
    const col = Math.min(Math.max(x + offset - 1, 0), size - 1);
    const row = Math.min(Math.max(y + offset - 1, 0), size - 1);
    return { row, col };
  };

  let map = Float64Array.from(data.pmap.flat());
  normalize(map);
  const frames = [map];
  for (let i = 1; i <= steps; i++) {
    if (targetMoves !== 0 && i % (steps / targetMoves) === 0) {
      map = shift(map, size, targetShift);
      normalize(map);
    }
    frames.push(map);
  }
  return { frames, cell };
}

export function SearchReplay({ data }: { data: SearchScenario }) {
  const size = data.mapSize;
  const { frames, cell } = useMemo(() => simulate(data), [data]);
  const vmax = useMemo(() => Math.max(...frames.map((f) => Math.max(...f))), [frames]);

  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(size, size);
    const map = frames[step];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const [red, green, blue] = colormap(map[r * size + c] / vmax);
        const p = ((size - 1 - r) * size + c) * 4; // row 0 is south: flip vertically
        image.data[p] = red;
        image.data[p + 1] = green;
        image.data[p + 2] = blue;
        image.data[p + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [frames, step, size, vmax]);

  // Loop like a GIF: one frame per step, hold the last frame before restarting.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(data.steps);
      return;
    }
    let id: ReturnType<typeof setTimeout>;
    const tick = (s: number) => {
      setStep(s);
      id = setTimeout(() => tick(s >= data.steps ? 0 : s + 1), s >= data.steps ? 1500 : 400);
    };
    tick(0);
    return () => clearTimeout(id);
  }, [data.steps]);

  // SVG coordinates: one unit per cell, cell centres at +0.5, y pointing north.
  const toSvg = (p: number[]) => {
    const { row, col } = cell(p);
    return [col + 0.5, size - 1 - row + 0.5] as const;
  };
  const shown = Math.max(step, 1);

  return (
    // Inline max-width: global.css caps `main *` at 100% outside Tailwind's layers,
    // which silently overrides max-w-* utility classes.
    <div
      className="not-prose relative mx-auto aspect-square w-full overflow-hidden rounded-lg"
      style={{ maxWidth: "26rem" }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
        role="img"
        aria-label="Animated belief map with the UAV search paths planned by EMPSO"
      />
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          d={Array.from({ length: size + 1 }, (_, i) => `M${i} 0V${size}M0 ${i}H${size}`).join("")}
          stroke="#000"
          strokeOpacity={0.25}
          strokeWidth={0.05}
        />
        {data.paths.map((path, k) => {
          const color = UAV_COLORS[k % UAV_COLORS.length];
          const trail = path.slice(0, shown).map(toSvg);
          const [hx, hy] = trail[trail.length - 1];
          return (
            <g key={k}>
              <polyline
                points={trail.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={0.35}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.9}
              />
              <circle cx={hx} cy={hy} r={0.75} fill={color} stroke="#000" strokeWidth={0.2} />
            </g>
          );
        })}
      </svg>
      <span className="absolute top-1 left-1 rounded bg-black/50 px-1 font-mono text-[10px] text-white tabular-nums">
        t = {step}/{data.steps}
      </span>
    </div>
  );
}
