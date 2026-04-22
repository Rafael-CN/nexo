import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FinanceIcon } from "@/components/shared/IconPicker";
import type { Category, TransactionType } from "@/types";
import { filterTransactionCategories } from "./transactionModalUtils";

interface Props {
  categories: Category[];
  type: TransactionType;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: MutableRefObject<HTMLInputElement | null>;
  onForwardTab?: () => void;
  onBackwardTab?: () => void;
}

export function CategoryPicker({
  categories,
  type,
  value,
  onChange,
  disabled,
  inputRef,
  onForwardTab,
  onBackwardTab,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(
    () => filterTransactionCategories(categories, type, query),
    [categories, type, query],
  );
  const selected = categories.find((category) => category.id === value) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery(selected?.name ?? "");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((category) => category.id === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, options, value]);

  function openPicker() {
    if (disabled) return;
    setOpen(true);
    setQuery(selected?.name ?? "");
    requestAnimationFrame(() => internalInputRef.current?.select());
  }

  function closePicker() {
    setOpen(false);
    setQuery(selected?.name ?? "");
  }

  function selectCategory(category: Category) {
    onChange(category.id);
    setQuery(category.name);
    setOpen(false);
  }

  function setInputNode(node: HTMLInputElement | null) {
    internalInputRef.current = node;
    if (inputRef) {
      inputRef.current = node;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === "Tab") {
      event.preventDefault();
      closePicker();
      if (event.shiftKey) {
        onBackwardTab?.();
      } else {
        onForwardTab?.();
      }
      return;
    }

    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      openPicker();
      return;
    }

    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        options.length === 0 ? 0 : Math.min(current + 1, options.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(options.length - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const option = options[activeIndex];
      if (option) {
        event.preventDefault();
        selectCategory(option);
      }
    }
  }

  const preview = open ? query : selected?.name ?? "";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70"
          strokeWidth={1.5}
        />
        <Input
          ref={setInputNode}
          value={preview}
          readOnly={!open}
          disabled={disabled}
          onFocus={openPicker}
          onClick={openPicker}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Selecionar"
          className="h-9 py-2 pl-9 pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={open ? closePicker : openPicker}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Abrir categorias"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-full border border-border bg-background shadow-sm">
          <div className="max-h-64 overflow-auto p-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Nenhuma categoria encontrada.
              </div>
            ) : (
              options.map((category, index) => {
                const active = index === activeIndex;
                const chosen = category.id === value;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCategory(category)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/70",
                    )}
                  >
                    <span
                      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: category.color }}
                      aria-hidden
                    />
                    <FinanceIcon
                      name={category.icon}
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-current" : "text-muted-foreground",
                      )}
                      strokeWidth={1.5}
                    />
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    {chosen && (
                      <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
