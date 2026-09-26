/**
 * Spatial layout math for the recommendation constellation.
 * Deterministic golden-angle scatter that adapts to ANY node count,
 * with seeded jitter, optical margins and a depth channel per node.
 */

export interface PlacedNode {
  /** position in percent of the stage, 0–100 */
  x: number;
  y: number;
  /** -1 (far) … 1 (near) */
  depth: number;
  /** render scale derived from depth */
  scale: number;
  /** parallax multiplier */
  k: number;
  /** stacking order */
  z: number;
  /** float animation duration (s) */
  floatDur: number;
  /** float animation delay (s, negative = mid-cycle) */
  floatDel: number;
  /** entrance animation delay (s) */
  enterDel: number;
}

/** Deterministic pseudo-random generator (mulberry-ish). */
export function seededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.399963

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Place `count` nodes inside the safe box (percent space), spiralling
 * outward from a shared origin star, evenly distributed for any count.
 */
export function scatterNodes(count: number, marginX: number, marginY: number): PlacedNode[] {
  if (count <= 0) return [];
  const nodes: PlacedNode[] = [];
  const inner = 0.24; // keep clear of the origin star

  for (let i = 0; i < count; i++) {
    const rnd = seededRandom(i * 7919 + 1013);

    // radius: 0…1 within safe area, single node gets a fixed gentle offset
    const t = count === 1 ? 0.16 : Math.sqrt(i / Math.max(count - 1, 1));
    const radius = count === 1 ? 0.2 : inner + t * (1 - inner);
    const angle = i * GOLDEN_ANGLE + 1.05 + (rnd() - 0.5) * 0.42;
    const rJitter = 1 + (rnd() - 0.5) * 0.14;

    const halfX = 50 - marginX;
    const halfY = 50 - marginY;

    const x = clamp(50 + Math.cos(angle) * radius * rJitter * halfX, marginX, 100 - marginX);
    const y = clamp(50 + Math.sin(angle * 1.02) * radius * rJitter * halfY, marginY, 100 - marginY);

    const depth = rnd() * 2 - 1;
    const near = (depth + 1) / 2;

    nodes.push({
      x,
      y,
      depth,
      scale: 0.84 + near * 0.3, // 0.84 … 1.14
      k: 0.45 + near * 0.85, // parallax factor
      z: 10 + Math.round(near * 38),
      floatDur: 6 + rnd() * 3.2,
      floatDel: -(rnd() * 7),
      enterDel: 0.12 + i * 0.085,
    });
  }
  return nodes;
}

/** Node card pixel width, adapting to how crowded the constellation is. */
export function nodeWidthFor(count: number): number {
  if (count <= 5) return 216;
  if (count <= 10) return 196;
  if (count <= 16) return 174;
  return 156;
}

export interface PxPoint {
  x: number;
  y: number;
}

export interface PanelPlacement {
  /** top-left of the panel in stage px */
  px: number;
  py: number;
  width: number;
  /** connector end point attached to the panel edge */
  attach: PxPoint;
}

/**
 * Position the floating detail panel near the selected node,
 * preferring the side with more room and clamping inside the stage.
 * On narrow stages it docks as a bottom sheet.
 */
export function placePanel(
  stageW: number,
  stageH: number,
  node: PxPoint,
  nodeRadius: number,
  panelH: number,
): PanelPlacement {
  const inset = 14;
  const width = Math.min(354, stageW - inset * 2);
  const height = clamp(panelH, 150, stageH - inset * 2);
  const gap = 22;

  // bottom-sheet mode for narrow stages
  if (stageW < 620) {
    const px = inset;
    const py = stageH - height - inset;
    return {
      px,
      py,
      width,
      attach: { x: clamp(node.x, px + 30, px + width - 30), y: py },
    };
  }

  const roomRight = stageW - (node.x + nodeRadius + gap) - width - inset;
  const roomLeft = node.x - nodeRadius - gap - width - inset;

  let px: number;
  if (roomRight >= 0 || roomRight >= roomLeft) {
    px = clamp(node.x + nodeRadius + gap, inset, stageW - width - inset);
  } else {
    px = clamp(node.x - nodeRadius - gap - width, inset, stageW - width - inset);
  }
  const py = clamp(node.y - height / 2, inset, stageH - height - inset);

  // nearest point on the panel rect to the node = connector end
  const attach = {
    x: clamp(node.x, px + 6, px + width - 6),
    y: clamp(node.y, py + 24, py + height - 24),
  };
  return { px, py, width, attach };
}
