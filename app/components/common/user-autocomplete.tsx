import { Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import type { UserSummary } from "~/lib/api/users/users.types";
import { resolveImageUrl } from "~/lib/image-url";
import { cn } from "~/lib/utils";

interface UserAutocompleteProps {
  value: string;
  onChange: (next: string) => void;
  onSelect: (user: UserSummary) => void;
  searchFn: (q: string) => Promise<UserSummary[]>;
  placeholder?: string;
  minChars?: number;
  emptyMessage?: string;
  selectedLabel?: string | null;
  onClearSelection?: () => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export function UserAutocomplete({
  value,
  onChange,
  onSelect,
  searchFn,
  placeholder = "Buscar por nickname o correo...",
  minChars = 2,
  emptyMessage = "Sin coincidencias.",
  selectedLabel = null,
  onClearSelection,
  disabled,
  className,
  inputClassName,
  autoFocus,
}: UserAutocompleteProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim();
  const isLocked = Boolean(selectedLabel);

  useEffect(() => {
    if (isLocked) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (query.length < minChars) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const handle = setTimeout(async () => {
      try {
        const data = await searchFn(query);
        if (!cancelled) {
          setResults(data);
          setHighlight(0);
          setOpen(true);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo buscar.");
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, minChars, searchFn, isLocked]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function commit(user: UserSummary) {
    onSelect(user);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "ArrowDown" && query.length >= minChars) {
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlight];
      if (pick) commit(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel =
    open && !isLocked && (loading || results.length > 0 || error || query.length >= minChars);

  const hint = useMemo(() => {
    if (loading) return null;
    if (error) return error;
    if (query.length === 0) return null;
    if (query.length < minChars)
      return `Escribe al menos ${minChars} caracteres.`;
    if (results.length === 0) return emptyMessage;
    return null;
  }, [loading, error, query, minChars, results, emptyMessage]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {isLocked ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-blood/40 bg-blood/5 px-3 py-2 text-sm">
          <span className="truncate text-foreground">{selectedLabel}</span>
          {onClearSelection ? (
            <button
              type="button"
              onClick={onClearSelection}
              disabled={disabled}
              aria-label="Quitar selección"
              className="rounded-full p-1 text-muted-foreground transition hover:bg-blood/10 hover:text-blood"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (query.length >= minChars) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className={cn("pl-9", inputClassName)}
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      )}

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-md border border-border/60 bg-popover text-popover-foreground shadow-lg"
        >
          {results.length > 0 ? (
            <ul>
              {results.map((u, i) => (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(u);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                    i === highlight ? "bg-blood/10 text-foreground" : "text-foreground/90",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blood/20 text-xs font-semibold uppercase text-blood">
                    {u.avatar ? (
                      <img
                        src={resolveImageUrl(u.avatar) ?? undefined}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      (u.nickname || u.email || "?").charAt(0)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{u.nickname}</span>
                    <span className="block truncate font-serif text-xs italic text-muted-foreground">
                      {u.email}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : hint ? (
            <p className="px-3 py-2 text-xs italic text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
