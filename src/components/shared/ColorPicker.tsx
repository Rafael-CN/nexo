import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PickerPopover } from "@/components/shared/pickerPopover";

const quickColors = [
  { value: "#111827", label: "Grafite" },
  { value: "#334155", label: "Ardosia" },
  { value: "#52525B", label: "Zinco" },
  { value: "#64748B", label: "Neblina" },
  { value: "#0F766E", label: "Petroleo" },
  { value: "#2563EB", label: "Cobalto" },
  { value: "#4F46E5", label: "Indigo" },
  { value: "#7C3AED", label: "Violeta" },
  { value: "#BE185D", label: "Vinho" },
  { value: "#C2410C", label: "Terracota" },
  { value: "#B45309", label: "Ambar" },
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

function swatchTone(value: string) {
  return value.toUpperCase();
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
}: {
  value: string;
  active?: boolean;
}) {
  const dark = isDarkColor(value);

  return (
    <span
      className={cn(
        "relative grid h-5 w-5 shrink-0 place-items-center border border-border transition-transform",
        active && "scale-[1.02] ring-1 ring-inset ring-foreground/20",
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
  const customInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const current = useMemo(() => {
    return normalizeHex(value) ?? value.toUpperCase();
  }, [value]);

  useEffect(() => {
    if (open) {
      setDraft(current);
      requestAnimationFrame(() => customInputRef.current?.focus());
    }
  }, [current, open]);

  function closePicker() {
    setOpen(false);
    setDraft(current);
  }

  function openPicker() {
    if (disabled) return;
    setOpen((currentOpen) => !currentOpen);
  }

  function applyDraft() {
    const normalized = normalizeHex(draft);
    if (!normalized) return false;

    onChange(normalized);
    setDraft(normalized);
    setOpen(false);
    return true;
  }

  function handleDraftChange(next: string) {
    setDraft(next);
    const normalized = normalizeHex(next);
    if (normalized) {
      onChange(normalized);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-full items-center justify-between border border-border bg-background px-3 text-sm transition-colors ui-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <ColorSwatch value={current} active={open} />
          <span className="min-w-0 truncate font-mono text-xs uppercase tracking-[0.12em] text-foreground">
            {current}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <PickerPopover
          anchorRef={rootRef}
          open={open}
          onClose={closePicker}
          preferredWidth={288}
          preferredHeight={348}
          className="p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Paleta
            </p>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {current}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-6 gap-2">
            {quickColors.map((color) => {
              const active = current === swatchTone(color.value);
              return (
                <button
                  key={color.value}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(color.value);
                    setDraft(color.value);
                    setOpen(false);
                  }}
                  className="group flex flex-col items-center gap-1"
                  aria-label={color.label}
                  title={color.label}
                >
                  <ColorSwatch value={color.value} active={active} />
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Personalizada
            </p>
            <div className="relative mt-2">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden
              >
                <span
                  className="grid h-4 w-4 place-items-center border border-border"
                  style={{ backgroundColor: draft }}
                >
                  <Palette
                    className={cn(
                      "h-2.5 w-2.5",
                      isDarkColor(draft) ? "text-white" : "text-black",
                    )}
                    strokeWidth={1.75}
                  />
                </span>
              </span>
              <Input
                ref={customInputRef}
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onBlur={() => {
                  if (!applyDraft()) {
                    setDraft(current);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (!applyDraft()) {
                      setDraft(current);
                    }
                  }
                  if (event.key === "Tab") {
                    setOpen(false);
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closePicker();
                  }
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                inputMode="text"
                placeholder="#RRGGBB"
                className="h-9 border-border pl-10 font-mono text-xs uppercase tabular-nums"
              />
            </div>
          </div>
        </PickerPopover>
      )}
    </div>
  );
}
