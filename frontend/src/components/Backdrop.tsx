import { useMemo } from "react";
import { seededRandom } from "../utils/layout";

/** Fixed cinematic ambience: nebulas, a twinkling starfield, film grain and a vignette. */
export function Backdrop() {
  const stars = useMemo(() => {
    const rnd = seededRandom(4242);
    return Array.from({ length: 110 }, (_, i) => {
      const size = rnd() < 0.86 ? 1 + rnd() * 1.4 : 2 + rnd() * 1.5;
      return {
        id: i,
        left: `${(rnd() * 100).toFixed(2)}%`,
        top: `${(rnd() * 100).toFixed(2)}%`,
        size: size.toFixed(1),
        ["--twmin" as string]: (0.06 + rnd() * 0.16).toFixed(2),
        ["--twmax" as string]: (0.32 + rnd() * 0.4).toFixed(2),
        ["--twd" as string]: `${(3.5 + rnd() * 5.5).toFixed(2)}s`,
        ["--twdel" as string]: `${(-rnd() * 9).toFixed(2)}s`,
      };
    });
  }, []);

  return (
    <>
      <div className="nebula nebula-a" aria-hidden="true" />
      <div className="nebula nebula-b" aria-hidden="true" />
      <div className="nebula nebula-c" aria-hidden="true" />
      {stars.map((s) => (
        <span
          key={s.id}
          className="star"
          aria-hidden="true"
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            ...(s as Record<string, string>),
          }}
        />
      ))}
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </>
  );
}
