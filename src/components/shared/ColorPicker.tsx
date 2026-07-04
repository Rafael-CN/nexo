import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PickerPopover } from "@/components/shared/pickerPopover";

const GRID_COLUMNS = 6;

const quickColors = [
  { value: "#111827", label: "Grafite" },
  { value: "#334155", label: "Ardósia" },
  { value: "#52525B", label: "Zinco" },
  { value: "#64748B", label: "Neblina" },
  { value: "#0F766E", label: "Petróleo" },
  { value: "#2563EB", label: "Cobalto" },
  { value: "#4F46E5", label: "Índigo" },
  { value: "#7C3AED", label: "Violeta" },
  { value: "#BE185D", label: "Vinho" },
  { value: "#C2410C", label: "Terracota" },
  { value: "#B45309", label: "Âmbar" },
  { value: "#166534", label: "Oliva" },
] as const;

function normalizeHex(value: string) {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const expanded = hex
      .split("")
      .map((char) => char + char)
      .join("");
    return `#${expanded.toUpperCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex.toUpperCase()}`;
  }

  return null;
}

function isDarkColor(value: string) {
  const hex = normalizeHex(value);
  if (!hex) return false;

  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);

  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance < 140;
}

function ColorSwatch({
  value,
  active = false,
  className,
}: {
  value: string;
  active?: boolean;
  className?: string;
}) {
  const dark = isDarkColor(value);

  return (
    <span
      className={cn(
        "relative grid h-5 w-5 shrink-0 place-items-center border border-border",
        className,
      )}
      style={{ backgroundColor: value }}
      aria-hidden
    >
      {active && (
        <Check
          className={cn("h-3 w-3", dark ? "text-white" : "text-black")}
          strokeWidth={2}
        />
      )}
    </span>
  );
}

/**
 * Seletor de cor com o mesmo padrão de teclado dos outros pickers do app:
 * o campo de hex mantém o foco, as setas movem o destaque na paleta,
 * Enter confirma (destaque ou hex digitado) e Esc fecha.
 */
export function ColorPicker({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);

  const current = useMemo(
    () => normalizeHex(value) ?? value.toUpperCase(),
    [value],
  );
  const highlighted = activeIndex >= 0 ? quickColors[activeIndex] : null;

  useEffect(() => {
    if (!open) return;

    setDraft(current);
    setActiveIndex(
      quickColors.findIndex((color) => color.value.toUpperCase() === current),
    );
    const frame = window.requestAnimationFrame(() => {
      hexInputRef.current?.focus();
      hexInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [current, open]);

  function closePicker(returnFocus = true) {
    setOpen(false);
    setDraft(current);
    if (returnFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function selectColor(hex: string) {
    onChange(hex.toUpperCase());
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function applyDraft() {
    const normalized = normalizeHex(draft);
    if (!normalized) return false;
    selectColor(normalized);
    return true;
  }

  function handleDraftChange(next: string) {
    setDraft(next);
    setActiveIndex(-1);
    const normalized = normalizeHex(next);
    if (normalized) {
      onChange(normalized);
    }
  }

  function moveHighlight(delta: number) {
    setActiveIndex((currentIndex) => {
      if (currentIndex < 0) {
        return delta > 0 ? 0 : quickColors.length - 1;
      }
      const next = currentIndex + delta;
      if (next < 0 || next >= quickColors.length) return currentIndex;
      return next;
    });
  }

  function handleHexKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowLeft": {
        // Só navega na paleta quando o cursor não está editando o texto.
        const input = event.currentTarget;
        const atEdge =
          event.key === "ArrowRight"
            ? input.selectionStart === input.value.length
            : input.selectionStart === 0;
        if (!atEdge && activeIndex < 0) return;
        event.preventDefault();
        moveHighlight(event.key === "ArrowRight" ? 1 : -1);
        return;
      }
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(GRID_COLUMNS);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-GRID_COLUMNS);
        return;
      case "Enter":
        event.preventDefault();
        if (highlighted) {
          selectColor(highlighted.value);
        } else if (!applyDraft()) {
          setDraft(current);
        }
        return;
      case "Escape":
        event.preventDefault();
        closePicker();
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        return;
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((state) => !state)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-full items-center justify-between border border-border bg-background px-3 text-sm transition-colors ui-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <ColorSwatch value={current} />
          <span className="min-w-0 truncate font-mono text-xs uppercase tracking-[0.12em] text-foreground">
            {current}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <PickerPopover
          anchorRef={rootRef}
          open={open}
          onClose={() => closePicker(false)}
          preferredWidth={288}
          preferredHeight={320}
          className="p-3"
        >
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden
            >
              <ColorSwatch
                value={normalizeHex(draft) ?? current}
                className="h-4 w-4"
              />
            </span>
            <Input
              ref={hexInputRef}
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onKeyDown={handleHexKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              inputMode="text"
              placeholder="#RRGGBB"
              aria-label="Cor personalizada em hexadecimal"
              className="h-9 border-border pl-10 font-mono text-xs uppercase tabular-nums ui-focus-ring-inset"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Paleta
            </p>
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {highlighted?.label ?? "setas navegam · enter aplica"}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-6 gap-1.5" role="listbox" aria-label="Cores da paleta">
            {quickColors.map((color, index) => {
              const selected = current === color.value.toUpperCase();
              const focused = index === activeIndex;

              return (
                <button
                  key={color.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectColor(color.value)}
                  title={color.label}
                  aria-label={color.label}
                  className={cn(
                    "grid place-items-center border p-1 transition-colors",
                    focused
                      ? "border-foreground/50 bg-accent"
                      : "border-transparent hover:border-border",
                  )}
                >
                  <span
                    className="relative grid h-7 w-full min-w-7 place-items-center border border-border"
                    style={{ backgroundColor: color.value }}
                  >
                    {selected && (
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          isDarkColor(color.value) ? "text-white" : "text-black",
                        )}
                        strokeWidth={2}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </PickerPopover>
      )}
    </div>
  );
}
