import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatISO,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PickerPopover } from "@/components/shared/pickerPopover";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  "aria-label"?: string;
}

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
  inputRef,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => formatDisplayDate(value));
  const [viewMonth, setViewMonth] = useState(() =>
    value ? startOfMonth(parseISO(value)) : startOfMonth(new Date()),
  );

  useEffect(() => {
    setText(formatDisplayDate(value));
    if (value) setViewMonth(startOfMonth(parseISO(value)));
  }, [value]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  function handleTextChange(nextText: string) {
    setText(nextText);

    if (nextText.trim() === "") {
      onChange("");
      return;
    }

    const parsed = parseTypedDate(nextText);
    if (parsed) {
      const iso = formatISO(parsed, { representation: "date" });
      onChange(iso);
      setViewMonth(startOfMonth(parsed));
    }
  }

  function selectDate(date: Date) {
    onChange(formatISO(date, { representation: "date" }));
    setText(format(date, "dd/MM/yyyy"));
    setViewMonth(startOfMonth(date));
    setOpen(false);
  }

  function clearDate() {
    onChange("");
    setText("");
    setOpen(false);
  }

  const selected = value ? parseISO(value) : null;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <CalendarDays
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.5}
        />
        <input
          id={id}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") setOpen(true);
            if (event.key === "Tab") setOpen(false);
          }}
          ref={inputRef}
          className={cn(
            "flex h-9 w-full border border-border bg-transparent py-1 pl-8 pr-8 font-mono text-sm transition-colors placeholder:text-muted-foreground/60 ui-focus-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
        {value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Limpar data"
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:text-foreground ui-focus-ring-inset"
            onClick={clearDate}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {open && !disabled && (
        <PickerPopover
          anchorRef={rootRef}
          open={open}
          onClose={() => setOpen(false)}
          preferredWidth={248}
          preferredHeight={340}
          className="p-2"
        >
          <div className="mb-2 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              tabIndex={-1}
              onClick={() => setViewMonth((month) => subMonths(month, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em]">
              {format(viewMonth, "MMM yyyy", { locale: ptBR })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              tabIndex={-1}
              onClick={() => setViewMonth((month) => addMonths(month, 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border border border-border">
            {WEEKDAYS.map((weekday, index) => (
              <div
                key={`${weekday}-${index}`}
                className="grid h-7 place-items-center bg-muted/30 font-mono text-[10px] text-muted-foreground"
              >
                {weekday}
              </div>
            ))}
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const active = selected ? isSameDay(day, selected) : false;
              return (
                <button
                  key={formatISO(day, { representation: "date" })}
                  type="button"
                  tabIndex={-1}
                  onClick={() => selectDate(day)}
                  className={cn(
                    "grid h-8 place-items-center bg-background font-mono text-[11px] tabular-nums transition-colors hover:bg-accent ui-focus-ring-inset",
                    !inMonth && "text-muted-foreground/35",
                    isToday(day) && "font-semibold text-foreground",
                    active &&
                      "bg-muted text-foreground ring-1 ring-inset ring-foreground/20 hover:bg-muted",
                  )}
                >
                  {format(day, "dd")}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              tabIndex={-1}
              className="px-2 font-mono text-[10px] uppercase tracking-wider"
              onClick={() => selectDate(new Date())}
            >
              Hoje
            </Button>
            <span className="font-mono text-[10px] text-muted-foreground">
              Digite ou selecione
            </span>
          </div>
        </PickerPopover>
      )}
    </div>
  );
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd/MM/yyyy") : value;
}

function parseTypedDate(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = parseISO(trimmed);
    return isValid(parsed) && format(parsed, "yyyy-MM-dd") === trimmed
      ? parsed
      : null;
  }

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(trimmed)) {
    const normalized = trimmed.replace(/-/g, "/");
    const parsed = parse(normalized, "dd/MM/yyyy", new Date());
    return isValid(parsed) && format(parsed, "dd/MM/yyyy") === normalized
      ? parsed
      : null;
  }

  return null;
}
