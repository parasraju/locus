import { useEffect, useRef, useState } from "react";

export interface PromptRequest {
  title: string;
  placeholder?: string;
  initial?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
}

export function PromptModal({
  request,
  onClose,
}: {
  request: PromptRequest | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (request) {
      setValue(request.initial ?? "");
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.select();
      });
    }
  }, [request]);

  if (!request) return null;

  const req = request;

  function commit() {
    const v = value.trim();
    if (!v) return;
    req.onSubmit(v);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-locus-ink/20"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-80 rounded-locus-md border border-locus-border bg-locus-surface p-4 shadow-xl"
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onClose();
        }}
      >
        <h2 className="font-locus-serif text-lg text-locus-ink">{request.title}</h2>
        <input
          ref={inputRef}
          className="mt-3 w-full rounded-locus-sm border border-locus-border bg-locus-bg px-2 py-1.5 text-[13px] text-locus-ink placeholder:text-locus-ink-muted focus:border-locus-info focus:outline-none"
          placeholder={request.placeholder ?? "Name"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-locus-sm px-3 py-1 text-[13px] text-locus-ink-secondary hover:bg-locus-border-soft"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-locus-sm bg-locus-info px-3 py-1 text-[13px] text-white hover:opacity-90 disabled:opacity-40"
            disabled={!value.trim()}
            onClick={commit}
          >
            {request.submitLabel ?? "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
