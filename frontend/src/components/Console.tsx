import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AlertCircle,
  Clapperboard,
  Loader2,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import type { QueryType } from "../api/recommend";

const MOOD_CHIPS = [
  "Cozy, funny and low-stakes",
  "Rainy-day murder mystery",
  "Mind-bending sci-fi epic",
  "Slow-burn 90s thriller",
];

const TITLE_CHIPS = ["Interstellar", "The Office (US)", "Parasite", "Spirited Away"];

const MODE_META: Record<
  QueryType,
  { label: string; placeholder: string; hint: string; fieldLabel: string }
> = {
  context: {
    label: "By mood",
    fieldLabel: "Describe the vibe",
    placeholder: "I want something funny and light for a Friday night…",
    hint: "Enter to search · Shift + Enter for a new line",
  },
  title: {
    label: "By title",
    fieldLabel: "Name a film or series",
    placeholder: "e.g. Interstellar",
    hint: "Enter to search · we'll find its kindred spirits",
  },
};

interface ConsoleProps {
  mode: QueryType;
  loading: boolean;
  onModeChange: (mode: QueryType) => void;
  onSubmit: (queryType: QueryType, query: string) => void;
  registerInput?: (el: HTMLTextAreaElement | HTMLInputElement | null) => void;
}

export function Console({ mode, loading, onModeChange, onSubmit, registerInput }: ConsoleProps) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const meta = MODE_META[mode];
  const chips = mode === "context" ? MOOD_CHIPS : TITLE_CHIPS;

  // auto-grow the mood textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 138)}px`;
  }, [value, mode]);

  const submit = (next?: string) => {
    const query = (next ?? value).trim();
    if (loading) return;
    if (!query) {
      setLocalError(
        mode === "context" ? "Give the engine a mood to work with first." : "Name a title first.",
      );
      return;
    }
    setLocalError(null);
    onSubmit(mode, query);
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const pickChip = (chip: string) => {
    setValue(chip);
    setLocalError(null);
    submit(chip);
  };

  const switchMode = (next: QueryType) => {
    if (next === mode) return;
    onModeChange(next);
    setLocalError(null);
  };

  const sharedFieldProps = {
    id: "query-field",
    value,
    maxLength: 500,
    disabled: loading,
    "aria-invalid": localError ? true : undefined,
    "aria-describedby": localError ? "query-error" : "query-hint",
    placeholder: meta.placeholder,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setValue(e.target.value);
      if (localError) setLocalError(null);
    },
    className:
      "w-full bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500/70 focus:outline-none disabled:opacity-60",
  } as const;

  return (
    <form
      onSubmit={onFormSubmit}
      className="u-glass relative rounded-[26px] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
      aria-label="Recommendation request console"
      noValidate
    >
      {/* mode toggle */}
      <div className="seg" data-active={mode} role="tablist" aria-label="Search mode">
        <span className="seg-thumb" aria-hidden="true" />
        <button
          type="button"
          role="tab"
          id="tab-context"
          aria-selected={mode === "context"}
          aria-controls="query-field"
          className="seg-btn"
          onClick={() => switchMode("context")}
        >
          <Sparkles size={15} strokeWidth={1.8} aria-hidden="true" />
          <span className="hidden min-[380px]:inline">Describe the mood</span>
          <span className="min-[380px]:hidden">Mood</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-title"
          aria-selected={mode === "title"}
          aria-controls="query-field"
          className="seg-btn"
          onClick={() => switchMode("title")}
        >
          <Clapperboard size={15} strokeWidth={1.8} aria-hidden="true" />
          <span className="hidden min-[380px]:inline">Similar to a title</span>
          <span className="min-[380px]:hidden">Title</span>
        </button>
      </div>

      {/* input */}
      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor="query-field" className="mono-tag text-teal-glow/70">
            {meta.fieldLabel}
          </label>
          <span className="font-mono text-[10px] tracking-widest text-slate-600">
            {value.length > 0 ? `${value.length}/500` : ""}
          </span>
        </div>

        <div className="field-shell" data-invalid={localError ? true : undefined}>
          {mode === "context" ? (
            <textarea
              {...sharedFieldProps}
              ref={(el) => {
                textareaRef.current = el;
                registerInput?.(el);
              }}
              rows={2}
              onKeyDown={onTextareaKeyDown}
              className={`${sharedFieldProps.className} resize-none`}
            />
          ) : (
            <input
              {...sharedFieldProps}
              ref={(el) => {
                inputRef.current = el;
                registerInput?.(el);
              }}
              type="text"
              autoComplete="on"
            />
          )}
        </div>

        <div className="mt-2 min-h-4">
          {localError ? (
            <p id="query-error" role="alert" className="flex items-center gap-1.5 text-[12px] text-rose-300/90">
              <AlertCircle size={12} aria-hidden="true" />
              {localError}
            </p>
          ) : (
            <p id="query-hint" className="font-mono text-[10px] tracking-[0.14em] text-slate-500">
              {meta.hint}
            </p>
          )}
        </div>
      </div>

      {/* chips */}
      <div className="mt-2.5 flex flex-wrap gap-2" aria-label="Quick picks">
        {chips.map((chip) => (
          <button key={chip} type="button" className="chip" onClick={() => pickChip(chip)} disabled={loading}>
            <Zap size={10} strokeWidth={2} aria-hidden="true" className="text-violet-glow/80" />
            {chip}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button type="submit" className="btn-primary mt-4 w-full" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            Tracing your stars…
          </>
        ) : (
          <>
            <Wand2 size={17} strokeWidth={2} aria-hidden="true" />
            Get recommendations
          </>
        )}
      </button>
    </form>
  );
}
