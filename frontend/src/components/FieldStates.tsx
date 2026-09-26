import { useEffect, useState, type CSSProperties } from "react";
import { RotateCcw, Unplug, Wand2 } from "lucide-react";
import type { PlacedNode } from "../utils/layout";

/** Placeholder stars used by the loading and empty scenes — no boxes, just dots & shimmer trails. */
function GhostNodes({ placed, shimmer }: { placed: PlacedNode[]; shimmer?: boolean }) {
  return (
    <>
      {placed.map((p, i) => (
        <div
          key={i}
          className="nd-pos"
          aria-hidden="true"
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              zIndex: 3,
              "--s": (p.scale * 0.9).toFixed(3),
              "--k": "0",
            } as CSSProperties
          }
        >
          <span
            className="nd-float inline-block"
            style={{ "--fd": `${p.floatDur}s`, "--fdel": `${p.floatDel}s` } as CSSProperties}
          >
            {shimmer ? (
              <span className="ghost-wrap">
                <span className="ghost-dot status-blink" style={{ animationDelay: `${i * 0.22}s` }} />
                <span className="flex flex-col gap-1.5">
                  <span
                    className="ghost-bar"
                    style={{ width: `${92 - (i % 3) * 16}px`, "--sdel": `${i * 0.13}s` } as CSSProperties}
                  />
                  <span
                    className="ghost-bar"
                    style={{ width: `${56 - (i % 3) * 9}px`, "--sdel": `${i * 0.13 + 0.07}s` } as CSSProperties}
                  />
                </span>
              </span>
            ) : (
              <span className="relative inline-block">
                <span className="ghost-ring" />
                <span className="ghost-dot ghost-dot-dim" />
              </span>
            )}
          </span>
        </div>
      ))}
    </>
  );
}

/* ---------------------------------------------------------- loading */

const LOADING_PHRASES = [
  "Reading your signal",
  "Scanning the archive",
  "Weighing a thousand reels",
  "Plotting bright matches",
  "Aligning the constellation",
];

export function LoadingField({ placed }: { placed: PlacedNode[] }) {
  const [phrase, setPhrase] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setPhrase((p) => (p + 1) % LOADING_PHRASES.length), 1500);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="state-fade absolute inset-0 z-10">
      <GhostNodes placed={placed} shimmer />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-5">
        <div className="spinner-ring" role="status" aria-label="Loading recommendations" />
        <div className="text-center">
          <p key={phrase} className="state-fade text-[13px] tracking-wide text-slate-300">
            {LOADING_PHRASES[phrase]}
            <span className="status-blink">…</span>
          </p>
          <p className="mono-tag mt-1.5 text-slate-600">POST /recommend · awaiting engine</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- empty */

export function EmptyOrbit({ placed }: { placed: PlacedNode[] }) {
  return (
    <div className="state-fade absolute inset-0 z-10">
      <div className="orbit-ring w-[52%] min-w-72 [aspect-ratio:1] [animation-duration:70s]" aria-hidden="true" />
      <div
        className="orbit-ring w-[82%] min-w-[380px] [aspect-ratio:1] opacity-70 [animation-duration:110s] [animation-direction:reverse]"
        aria-hidden="true"
      />
      <GhostNodes placed={placed} />

      <div className="absolute left-1/2 top-1/2 flex w-[min(340px,80%)] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
        <span className="origin-core mb-5 block" aria-hidden="true">
          <span className="origin-ring" />
          <span className="origin-ring r2" />
        </span>
        <h2 className="font-display text-[clamp(20px,2.4vw,26px)] font-medium tracking-tight text-slate-100">
          Your constellation awaits
        </h2>
        <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-slate-400">
          Every search becomes a star map — each film and series a body you can drift between and open.
        </p>
        <p className="mono-tag mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-slate-400">
          <Wand2 size={11} aria-hidden="true" className="text-teal-glow/80" />
          describe a mood · or name a title
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- error */

export interface ErrorCalloutProps {
  message: string;
  query: string | null;
  onRetry: () => void;
  onEdit: () => void;
}

export function ErrorCallout({ message, query, onRetry, onEdit }: ErrorCalloutProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-5">
      <div
        className="callout u-glass w-[min(430px,100%)] rounded-3xl p-6"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-400/10 text-rose-300">
            <Unplug size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="mono-tag text-rose-300/80">Transmission failed</p>
            <h2 className="font-display text-lg font-medium text-white">The signal didn't land</h2>
          </div>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-slate-300/90">{message}</p>

        {query && (
          <p className="mt-3 truncate rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[11px] text-slate-400">
            last signal: "{query}"
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="btn-primary"
            style={{ padding: "12px 20px", fontSize: "12px" }}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Retry request
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="chip"
            style={{ padding: "10px 16px", fontSize: "12px" }}
          >
            Adjust the query
          </button>
        </div>
      </div>
    </div>
  );
}
