import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { ChevronLeft, ChevronRight, Quote, X } from "lucide-react";
import type { PanelPlacement } from "../utils/layout";

export interface DetailPanelProps {
  index: number;
  count: number;
  title: string;
  description: string;
  accent: string;
  kindLabel: string;
  placement: PanelPlacement;
  maxHeight: number;
  shellRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

/** Floating glass synopsis card, tethered to the selected star. */
export function DetailPanel({
  index,
  count,
  title,
  description,
  accent,
  kindLabel,
  placement,
  maxHeight,
  shellRef,
  onClose,
  onPrev,
  onNext,
}: DetailPanelProps) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [index]);

  const isLong = description.length > 210;
  const idx = String(index + 1).padStart(2, "0");

  return (
    <div
      ref={shellRef}
      className="detail-pos"
      style={{
        transform: `translate3d(${placement.px}px, ${placement.py}px, 0)`,
        width: placement.width,
      }}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Synopsis for ${title}`}
        className="detail-card"
        style={{ "--acc": accent, maxHeight, overflowY: "auto" } as CSSProperties}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="mono-tag pt-1" style={{ color: accent }}>
            Signal {idx} · kin to your {kindLabel}
          </p>
          <button type="button" className="icon-btn -mr-1 -mt-1 shrink-0" onClick={onClose} aria-label="Close synopsis">
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <h3 className="detail-title mt-2.5">{title}</h3>

        <div className="mt-3 flex gap-2.5">
          <Quote size={14} className="mt-1 shrink-0 text-slate-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className={`detail-desc ${expanded ? "expanded" : "clamped"}`}>{description}</p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mono-tag mt-2 cursor-pointer transition-colors hover:text-white"
                style={{ color: accent }}
              >
                {expanded ? "Show less" : "Read in full"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3.5">
          <div className="flex gap-2">
            <button type="button" className="icon-btn" onClick={onPrev} aria-label="Previous recommendation">
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn" onClick={onNext} aria-label="Next recommendation">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500">
            {idx} / {String(count).padStart(2, "0")} SIGNALS
          </p>
        </div>
      </div>
    </div>
  );
}
