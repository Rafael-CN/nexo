import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyPopoverState {
  text: string;
  x: number;
  y: number;
}

function getSelectionRoot(selection: Selection) {
  if (selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  return container.nodeType === Node.TEXT_NODE
    ? container.parentElement
    : container instanceof HTMLElement
      ? container
      : null;
}

function getSelectionPosition(selection: Selection) {
  if (selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
  const rect = rects.at(-1) ?? range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) return null;

  return {
    x: rect.left + rect.width / 2,
    y: rect.bottom + 10,
  };
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function SelectionCopyPopover() {
  const [state, setState] = useState<CopyPopoverState | null>(null);
  const [copied, setCopied] = useState(false);
  const completingCopyRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";

      if (completingCopyRef.current) return;

      if (!selection || text.length === 0) {
        setState(null);
        setCopied(false);
        return;
      }

      const root = getSelectionRoot(selection);
      if (!root?.closest(".selectable-text")) {
        setState(null);
        setCopied(false);
        return;
      }

      const position = getSelectionPosition(selection);
      if (!position) {
        setState(null);
        setCopied(false);
        return;
      }

      setState({ text, ...position });
      setCopied(false);
    };

    const scheduleUpdate = () => window.setTimeout(update, 0);

    document.addEventListener("selectionchange", scheduleUpdate);
    document.addEventListener("mouseup", scheduleUpdate);
    document.addEventListener("keyup", scheduleUpdate);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      document.removeEventListener("selectionchange", scheduleUpdate);
      document.removeEventListener("mouseup", scheduleUpdate);
      document.removeEventListener("keyup", scheduleUpdate);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  async function completeCopy() {
    if (!state || completingCopyRef.current) return;

    completingCopyRef.current = true;
    await copyText(state.text);
    setCopied(true);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      window.getSelection()?.removeAllRanges();
      completingCopyRef.current = false;
      setState(null);
      setCopied(false);
    }, 900);
  }

  useEffect(() => {
    if (!state) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void completeCopy();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [state]);

  if (!state) return null;

  return (
    <div
      className="fixed z-[100] -translate-x-1/2 border border-border bg-background px-1.5 py-1 shadow-xl"
      style={{
        left: Math.min(Math.max(state.x, 72), window.innerWidth - 72),
        top: Math.min(Math.max(state.y, 12), window.innerHeight - 44),
      }}
    >
      <button
        type="button"
        className={cn(
          "flex h-7 items-center gap-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground",
          copied && "text-success hover:text-success",
        )}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void completeCopy()}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
