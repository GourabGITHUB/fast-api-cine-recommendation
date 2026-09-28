import { useCallback, useRef, useState, useEffect } from "react";
import type { QueryType } from "./api/recommend";
import { useRecommendations } from "./hooks/useRecommendations";
import { Backdrop } from "./components/Backdrop";
import { Console } from "./components/Console";
import { Stage } from "./components/Stage";

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ee6d8" />
          <stop offset="1" stopColor="#8b7cff" />
        </linearGradient>
      </defs>
      <path d="M16 42 L26 24 L40 18 L46 38 L16 42" stroke="url(#bm-g)" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="42" r="4.6" fill="#5ee6d8" />
      <circle cx="26" cy="24" r="3.2" fill="#cfe3ff" />
      <circle cx="40" cy="18" r="4" fill="#8b7cff" />
      <circle cx="46" cy="38" r="5.4" fill="#ffb86b" />
    </svg>
  );
}

export default function App() {
  const [mode, setMode] = useState<QueryType>("context");
  const { status, items, error, lastQuery, request, retry, reset } = useRecommendations();
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const consoleCardRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = useCallback(
    (queryType: QueryType, query: string) => {
      void request(queryType, query);
    },
    [request],
  );

  useEffect(() => {
  fetch("https://astris-k0xu.onrender.com/health");
}, []);

  const handleEditQuery = useCallback(() => {
    inputRef.current?.focus({ preventScroll: false });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      consoleCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const liveMessage =
    status === "loading"
      ? "Searching for recommendations."
      : status === "success"
        ? `${items.length} recommendations ready and plotted as a constellation.`
        : status === "error"
          ? `Error: ${error ?? "request failed"}`
          : "";

  return (
    <div className="relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <Backdrop />

      <a
        href="#constellation"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-abyss focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to the recommendation constellation
      </a>

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-5 pt-5 sm:px-8 lg:px-10 lg:pt-6">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="leading-none">
            <p className="font-display text-[17px] font-semibold tracking-[0.34em] text-white">Astris</p>
            <p className="mono-tag mt-1.5 text-[9px] text-slate-500">Navigate the cinematic cosmos</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-md sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-glow shadow-[0_0_8px_#5ee6d8]" aria-hidden="true" />
          <span className="mono-tag text-slate-400">fastapi · gemini · react</span>
        </div>
      </header>

      {/* main split: console deck + constellation viewport */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1720px] flex-1 flex-col gap-6 px-5 pb-8 pt-8 sm:px-8 lg:min-h-0 lg:flex-row lg:gap-8 lg:px-10 lg:pt-4 xl:gap-12">
        <section
          aria-label="Search console"
          className="flex w-full flex-col lg:w-[clamp(400px,30vw,530px)] lg:shrink-0 lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
        >
          <div className="my-auto py-2 lg:py-8">
            <p className="eyebrow-rule mono-tag text-teal-glow/80">recommendation starfall n°01</p>
            <h1 className="mt-4 font-display text-[clamp(34px,4.6vw,56px)] font-medium leading-[1.04] tracking-[-0.02em] text-white">
              Turn a feeling into a{" "}
              <em className="bg-gradient-to-r from-teal-glow via-sky-glow to-violet-glow bg-clip-text pr-1 italic text-transparent">
                constellation
              </em>{" "}
              of what to watch.
            </h1>
            <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-slate-400">
              Describe a mood or name a title — the engine finds kindred films &amp; series, then
              plots each one as a star you can drift between and open.
            </p>

            <div ref={consoleCardRef} className="mt-7">
              <Console
                mode={mode}
                loading={status === "loading"}
                onModeChange={setMode}
                onSubmit={handleSubmit}
                registerInput={(el) => {
                  inputRef.current = el;
                }}
              />
            </div>

            {/* HUD strip */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-4">
              <p className="mono-tag text-slate-500">
                mode <span className="text-slate-300">{mode === "context" ? "context" : "title"}</span>
              </p>
              <p className="mono-tag text-slate-500">
                signals{" "}
                <span className="text-slate-300">
                  {status === "success" ? String(items.length).padStart(2, "0") : "——"}
                </span>
              </p>
              <p className="mono-tag text-slate-500">
                lens <span className="text-slate-300">1300mm</span>
              </p>
<p className="mono-tag hidden text-slate-600 xl:inline">
  {new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}
</p>            </div>
          </div>
        </section>

        <section id="constellation" aria-label="Results" className="relative min-h-0 flex-1">
          <Stage
            status={status}
            items={items}
            error={error}
            lastQuery={lastQuery}
            onRetry={retry}
            onReset={reset}
            onEditQuery={handleEditQuery}
          />
        </section>
      </main>

      {/* screen-reader status announcements */}
      <p aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </p>
    </div>
  );
}
