import { memo, type CSSProperties } from "react";
import type { PlacedNode } from "../utils/layout";

export interface NodeCardProps {
  index: number;
  count: number;
  title: string;
  accent: string;
  placed: PlacedNode;
  active: boolean;
  onSelect: (index: number) => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

/**
 * One recommendation rendered as a literal star: a glowing core with halo
 * and lens flare. Its title floats beside it like an atlas label (no boxes —
 * the synopsis is the only card, shown via the detail panel on focus).
 */
export const NodeCard = memo(function NodeCard({
  index,
  count,
  title,
  accent,
  placed,
  active,
  onSelect,
  buttonRef,
}: NodeCardProps) {
  const idx = String(index + 1).padStart(2, "0");
  const near = (placed.depth + 1) / 2;
  // labels grow toward the interior so they never clip at the stage edges
  const side = placed.x <= 50 ? "right" : "left";

  return (
    <div
      className="nd-pos"
      style={
        {
          left: `${placed.x}%`,
          top: `${placed.y}%`,
          zIndex: active ? 95 : placed.z,
          "--s": (placed.scale * (active ? 1.12 : 1)).toFixed(3),
          "--k": placed.k.toFixed(2),
        } as CSSProperties
      }
    >
      <button
        type="button"
        ref={buttonRef}
        className="nd"
        data-active={active}
        data-side={side}
        aria-pressed={active}
        aria-label={`${title} — recommendation ${index + 1} of ${count}. ${
          active ? "Press to close its synopsis." : "Press to open its synopsis."
        }`}
        onClick={() => onSelect(index)}
      >
        <span
          className="nd-float"
          style={{ "--fd": `${placed.floatDur}s`, "--fdel": `${placed.floatDel}s` } as CSSProperties}
        >
          <span
            className="nd-body"
            style={
              {
                "--acc": accent,
                "--edel": `${placed.enterDel}s`,
                "--knear": near.toFixed(2),
              } as CSSProperties
            }
          >
            <span className="nd-star" aria-hidden="true">
              <span className="nd-halo" />
              <span className="nd-flare" />
              <span className="nd-core" />
              <span className="nd-orbitring" />
            </span>

            <span className="nd-label" aria-hidden="true">
              <span className="nd-idx">{idx}</span>
              <span className="nd-title">{title}</span>
              <span className="nd-hint">{active ? "In focus" : "Open synopsis"}</span>
            </span>

            <span className="nd-focusring" aria-hidden="true" />
          </span>
        </span>
      </button>
    </div>
  );
});
