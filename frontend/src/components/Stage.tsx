import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Undo2 } from "lucide-react";
import type { RecommendationItem } from "../api/recommend";
import type { LastQuery, RequestStatus } from "../hooks/useRecommendations";
import { useElementSize } from "../hooks/useElementSize";
import {
  clamp,
  nodeWidthFor,
  placePanel,
  scatterNodes,
  type PlacedNode,
  type PxPoint,
} from "../utils/layout";
import { NodeCard } from "./NodeCard";
import { DetailPanel } from "./DetailPanel";
import { EmptyOrbit, ErrorCallout, LoadingField } from "./FieldStates";

export const ACCENTS = ["#5ee6d8", "#8b7cff", "#ffb86b", "#ff7eb6", "#7cc4ff"];

interface StageProps {
  status: RequestStatus;
  items: RecommendationItem[];
  error: string | null;
  lastQuery: LastQuery | null;
  onRetry: () => void;
  onReset: () => void;
  onEditQuery: () => void;
}

export function Stage({ status, items, error, lastQuery, onRetry, onReset, onEditQuery }: StageProps) {
  const [frameRef, frame] = useElementSize<HTMLDivElement>();
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [panelShellRef, panelSize] = useElementSize<HTMLDivElement>();

  const [selected, setSelected] = useState<number | null>(null);
  const reduceMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const parallaxFrame = useRef(0);

  /* ------------------------------------------------ layout */

  const liveCount = status === "success" ? items.length : status === "loading" ? 8 : 5;
  const w = frame.w;
  const h = frame.h;
  const nodeW = Math.round(
    w > 0 ? clamp(Math.min(nodeWidthFor(liveCount), w * 0.46), 132, 260) : nodeWidthFor(liveCount),
  );

  const placed = useMemo<PlacedNode[]>(() => {
    if (w < 10 || h < 10) return [];
    // stars are compact anchors (labels grow inward), so the field can spread wide
    const mx = clamp(Math.round(((34 / w) * 100) * 2) / 2, 6, 12);
    const my = clamp(Math.round(((40 / h) * 100) * 2) / 2, 8, 14);
    return scatterNodes(liveCount, mx, my);
  }, [liveCount, w, h]);

  const points = useMemo<PxPoint[]>(
    () => placed.map((p) => ({ x: (p.x / 100) * w, y: (p.y / 100) * h })),
    [placed, w, h],
  );
  const origin: PxPoint = { x: w / 2, y: h / 2 };

  /* ------------------------------------------------ selection lifecycle */

  useEffect(() => {
    if (status !== "success" || items.length === 0) {
      setSelected(null);
      return;
    }
    setSelected(null);
    const t = window.setTimeout(() => setSelected(0), items.length * 85 + 620);
    return () => window.clearTimeout(t);
  }, [status, items]);

  useEffect(() => {
    if (selected !== null && selected >= items.length) {
      setSelected(items.length ? items.length - 1 : null);
    }
  }, [items.length, selected]);

  const moveSelection = useCallback(
    (dir: 1 | -1) => {
      if (!items.length) return;
      const next =
        selected === null ? 0 : (selected + dir + items.length) % items.length;
      setSelected(next);
      window.setTimeout(() => nodeRefs.current[next]?.focus({ preventScroll: true }), 0);
    },
    [items.length, selected],
  );

  const onFrameKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (status !== "success") return;
    if (e.key === "Escape" && selected !== null) {
      e.preventDefault();
      setSelected(null);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveSelection(-1);
    }
  };

  const onNodeSelect = (index: number) => {
    setSelected((cur) => (cur === index ? null : index));
  };

  /* ------------------------------------------------ parallax */

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion.current || e.pointerType !== "mouse") return;
    const scene = sceneRef.current;
    if (!scene) return;
    const { clientX, clientY } = e;
    if (parallaxFrame.current) cancelAnimationFrame(parallaxFrame.current);
    parallaxFrame.current = requestAnimationFrame(() => {
      const rect = scene.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((clientY - rect.top) / rect.height - 0.5) * 2;
      scene.style.setProperty("--px", `${(nx * 13).toFixed(1)}px`);
      scene.style.setProperty("--py", `${(ny * 9).toFixed(1)}px`);
    });
  };
  const onPointerLeave = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.style.setProperty("--px", "0px");
    scene.style.setProperty("--py", "0px");
  };

  /* ------------------------------------------------ mobile scroll affordance */

  useEffect(() => {
    if (status !== "success") return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      frameRef.current?.scrollIntoView({
        behavior: reduceMotion.current ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [status, frameRef]);

  /* ------------------------------------------------ panel placement */

  const activeItem = selected !== null && status === "success" ? items[selected] : null;
  const activeAccent = selected !== null ? ACCENTS[selected % ACCENTS.length] : ACCENTS[0];

  const placement = useMemo(() => {
    if (!activeItem || selected === null || !points.length || selected >= points.length) return null;
    const nodePx = points[selected];
    // stars are tiny anchors and the focused label hides itself — dock close
    const nodeRadius = 36 * (placed[selected]?.scale ?? 1);
    return placePanel(w, h, nodePx, nodeRadius, panelSize.h > 0 ? panelSize.h : 300);
  }, [activeItem, selected, points, placed, w, h, panelSize.h]);

  /* ------------------------------------------------ wire geometry */

  const chainPath = useMemo(() => {
    if (points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [points]);

  const hotPaths = useMemo(() => {
    if (selected === null || !points.length || selected >= points.length) return [];
    const node = points[selected];
    const paths: Array<{ d: string; key: string }> = [
      { d: `M ${origin.x} ${origin.y} L ${node.x} ${node.y}`, key: "origin" },
    ];
    const prev = points[selected - 1];
    const next = points[selected + 1];
    if (prev) paths.push({ d: `M ${prev.x} ${prev.y} L ${node.x} ${node.y}`, key: "prev" });
    if (next) paths.push({ d: `M ${node.x} ${node.y} L ${next.x} ${next.y}`, key: "next" });
    return paths;
  }, [selected, points, origin.x, origin.y]);

  const tetherPath = useMemo(() => {
    if (!placement || selected === null || !points.length || selected >= points.length) return "";
    const node = points[selected];
    return `M ${node.x.toFixed(1)} ${node.y.toFixed(1)} L ${placement.attach.x.toFixed(1)} ${placement.attach.y.toFixed(1)}`;
  }, [placement, selected, points]);

  const kindLabel = lastQuery?.query_type === "title" ? "title" : "mood";

  // taller stage when many nodes render on the stacked (mobile) layout
  const stageMinH = clamp(
    status === "success" ? 300 + items.length * 66 : 640,
    620,
    1300,
  );

  /* ------------------------------------------------ render */

  return (
    <div
      ref={frameRef}
      className="stage-frame"
      role="region"
      aria-label="Recommendation constellation map"
      style={{ "--stage-h": `${stageMinH}px` } as CSSProperties}
    >
      {w > 0 && (
        <div
          ref={sceneRef}
          className="stage-scene"
          data-has-active={selected !== null || undefined}
          style={{ "--px": "0px", "--py": "0px", "--nw": `${nodeW}px` } as CSSProperties}
          onKeyDown={onFrameKeyDown}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          {/* constellation wires */}
          {status === "success" && points.length > 0 && (
            <svg className="wires" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
              {chainPath && <path className="wire-orbit" d={chainPath} fill="none" />}
              {points.map((p, i) => (
                <line
                  key={`spoke-${i}`}
                  className="wire"
                  x1={origin.x}
                  y1={origin.y}
                  x2={p.x}
                  y2={p.y}
                  opacity={0.5}
                />
              ))}
              {hotPaths.map((p) => (
                <path
                  key={p.key}
                  className="wire-hot"
                  d={p.d}
                  fill="none"
                  style={{ "--acc": activeAccent } as CSSProperties}
                />
              ))}
              {tetherPath && (
                <>
                  <path
                    className="wire-hot"
                    d={tetherPath}
                    fill="none"
                    opacity={0.9}
                    style={{ "--acc": activeAccent } as CSSProperties}
                  />
                  <circle
                    cx={placement!.attach.x}
                    cy={placement!.attach.y}
                    r={3}
                    fill={activeAccent}
                    opacity={0.9}
                  />
                </>
              )}
            </svg>
          )}

          {/* origin star = the query itself */}
          {status === "success" && lastQuery && (
            <div className="origin">
              <span className="origin-core">
                <span className="origin-ring" aria-hidden="true" />
                <span className="origin-ring r2" aria-hidden="true" />
              </span>
              <span className="origin-label" title={lastQuery.query}>
                {lastQuery.query}
              </span>
            </div>
          )}

          {/* states */}
          {status === "idle" && <EmptyOrbit placed={placed} />}
          {status === "loading" && <LoadingField placed={placed} />}

          {/* recommendation stars */}
          {status === "success" &&
            items.map((item, i) =>
              placed[i] ? (
                <NodeCard
                  key={`${item.title}-${i}`}
                  index={i}
                  count={items.length}
                  title={item.title}
                  accent={ACCENTS[i % ACCENTS.length]}
                  placed={placed[i]}
                  active={selected === i}
                  onSelect={onNodeSelect}
                  buttonRef={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                />
              ) : null,
            )}

          {/* floating synopsis panel */}
          {activeItem && placement && selected !== null && (
            <DetailPanel
              index={selected}
              count={items.length}
              title={activeItem.title}
              description={activeItem.description}
              accent={activeAccent}
              kindLabel={kindLabel}
              placement={placement}
              maxHeight={Math.max(220, h - 28)}
              shellRef={panelShellRef}
              onClose={() => setSelected(null)}
              onPrev={() => moveSelection(-1)}
              onNext={() => moveSelection(1)}
            />
          )}

          {status === "error" && (
            <ErrorCallout
              message={error ?? "The engine could not be reached."}
              query={lastQuery?.query ?? null}
              onRetry={onRetry}
              onEdit={onEditQuery}
            />
          )}
        </div>
      )}

      {/* decorative corner marks */}
      <span className="corner-mark left-3.5 top-3" aria-hidden="true">+</span>
      <span className="corner-mark right-3.5 top-3" aria-hidden="true">+</span>
      <span className="corner-mark bottom-3 left-3.5" aria-hidden="true">+</span>
      <span className="corner-mark bottom-3 right-3.5" aria-hidden="true">+</span>

      {/* HUD */}
      <div className="pointer-events-none absolute left-4 top-4 z-[70] flex items-center gap-2 rounded-full border border-white/10 bg-void/50 px-3 py-1.5 backdrop-blur-md">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "loading"
              ? "status-blink bg-amber-300"
              : status === "success"
                ? "bg-teal-glow"
                : status === "error"
                  ? "bg-rose-400"
                  : "bg-slate-500"
          }`}
        />
        <span className="mono-tag text-slate-400">
          {status === "loading"
            ? "Searching the universe…"
            : status === "success"
              ? `${items.length} signals locked · by ${kindLabel}`
              : status === "error"
                ? "Link down — retry available"
                : "Awaiting first signal"}
        </span>
      </div>

      {(status === "success" || status === "error") && (
        <button
          type="button"
          onClick={onReset}
          className="icon-btn absolute right-4 top-4 z-[70]"
          aria-label="Clear results and start over"
          title="Clear results"
        >
          <Undo2 size={15} aria-hidden="true" />
        </button>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 z-[70] hidden [@media(hover:hover)]:block">
        <p className="mono-tag text-slate-600">click a star · arrows navigate · esc closes</p>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-[70]">
        <p className="mono-tag text-slate-700">fig. 01 — stellar response map</p>
      </div>
    </div>
  );
}
