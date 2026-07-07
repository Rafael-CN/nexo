import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import {
  dsFieldTrigger,
  dsFieldTriggerOpen,
  dsFieldValue,
  dsHint,
  dsPopoverSurface,
} from "@/lib/designSystem";
import { cn } from "@/lib/utils";

export type PickerPopoverPlacement = "top" | "bottom";
export type PickerPopoverAlign = "start" | "end";

const POPOVER_MARGIN = 8;
const POPOVER_GAP = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveWidth(
  anchorWidth: number,
  viewportWidth: number,
  preferredWidth: number | "trigger",
  margin: number,
) {
  const maxWidth = Math.max(0, viewportWidth - margin * 2);
  if (preferredWidth === "trigger") {
    return clamp(anchorWidth, 0, maxWidth);
  }

  return clamp(preferredWidth, 0, maxWidth);
}

function resolvePlacement(
  spaceBelow: number,
  spaceAbove: number,
  desiredHeight: number,
): PickerPopoverPlacement {
  if (spaceBelow >= desiredHeight) return "bottom";
  if (spaceAbove >= desiredHeight) return "top";
  return spaceAbove > spaceBelow ? "top" : "bottom";
}

export function useAnchoredPickerPopover(
  anchorRef: RefObject<HTMLElement>,
  open: boolean,
  preferredWidth: number | "trigger",
  preferredHeight?: number,
  align: "auto" | PickerPopoverAlign = "auto",
  margin = POPOVER_MARGIN,
  gap = POPOVER_GAP,
) {
  const [placement, setPlacement] = useState<PickerPopoverPlacement>("bottom");
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = resolveWidth(rect.width, viewportWidth, preferredWidth, margin);

      const spaceBelow = viewportHeight - rect.bottom - margin - gap;
      const spaceAbove = rect.top - margin - gap;
      const desiredHeight = preferredHeight ?? 240;
      const nextPlacement = resolvePlacement(
        spaceBelow,
        spaceAbove,
        desiredHeight,
      );
      const availableHeight =
        nextPlacement === "bottom" ? spaceBelow : spaceAbove;
      const maxHeight = Math.min(desiredHeight, Math.max(0, availableHeight));

      const chosenAlign =
        align === "auto"
          ? rect.left + width > viewportWidth - margin &&
            rect.right - width >= margin
            ? "end"
            : "start"
          : align;

      const left =
        chosenAlign === "end"
          ? clamp(rect.right - width, margin, viewportWidth - margin - width)
          : clamp(rect.left, margin, viewportWidth - margin - width);

      setPlacement(nextPlacement);
      const nextStyle: CSSProperties & {
        "--picker-popover-max-height": string;
      } = {
        left,
        top: nextPlacement === "bottom" ? rect.bottom + gap : undefined,
        bottom: nextPlacement === "top" ? viewportHeight - rect.top + gap : undefined,
        width,
        maxWidth: viewportWidth - margin * 2,
        maxHeight,
        "--picker-popover-max-height": `${maxHeight}px`,
      };

      setStyle(nextStyle);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, anchorRef, gap, margin, open, preferredHeight, preferredWidth]);

  return { placement, style };
}

interface PickerPopoverProps {
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  preferredWidth: number | "trigger";
  preferredHeight?: number;
  align?: "auto" | PickerPopoverAlign;
  className?: string;
  children: ReactNode;
}

export function PickerPopover({
  anchorRef,
  open,
  onClose,
  preferredWidth,
  preferredHeight,
  align = "auto",
  className,
  children,
}: PickerPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { placement, style } = useAnchoredPickerPopover(
    anchorRef,
    open,
    preferredWidth,
    preferredHeight,
    align,
  );

  useLayoutEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      data-side={placement}
      data-picker-popover=""
      className={cn(
        // pointer-events-auto é obrigatório: dialogs modais do Radix aplicam
        // pointer-events:none no body, e este painel é portado para lá —
        // sem isso, nenhum clique dentro do popover chega aos elementos.
        "pointer-events-auto fixed z-[70] overflow-hidden rounded-[calc(var(--radius)+1px)]",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        dsPopoverSurface,
        placement === "bottom"
          ? "origin-top-left slide-in-from-top-1"
          : "origin-bottom-left slide-in-from-bottom-1",
        className,
      )}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Anatomia padrão de picker: gatilho → cabeçalho → corpo → rodapé.   */
/* Todo picker do app compõe estas peças — nenhum inventa a própria.  */
/* ------------------------------------------------------------------ */

interface PickerFieldProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  /** Popover correspondente está aberto (borda ativa + chevron girado). */
  open: boolean;
  /** Slot à esquerda do valor (swatch de cor, ícone selecionado). */
  leading?: ReactNode;
  /** Valor selecionado, exibido em mono uppercase. */
  value: ReactNode;
}

/**
 * Gatilho fechado de picker — a mesma casca de campo em todo o app:
 * h-9, hairline, valor mono e chevron. Cor, ícone e demais pickers
 * diferem apenas pelo conteúdo dos slots.
 */
export const PickerField = forwardRef<HTMLButtonElement, PickerFieldProps>(
  ({ open, leading, value, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(dsFieldTrigger, open && dsFieldTriggerOpen, className)}
      {...props}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <span className={cn("min-w-0 flex-1 truncate", dsFieldValue)}>
        {value}
      </span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-180",
        )}
        strokeWidth={1.5}
      />
    </button>
  ),
);
PickerField.displayName = "PickerField";

/** Cabeçalho do popover: zona de busca/entrada, separada por hairline. */
export function PickerPopoverHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 border-b border-border p-3", className)}>
      {children}
    </div>
  );
}

/**
 * Rodapé do popover: dicas de teclado no chip <Kbd> + nota contextual.
 * `keys` aceita pares [tecla, ação] — ex.: [["↵", "aplica"]].
 */
export function PickerPopoverFooter({
  keys,
  note,
  leading,
  className,
}: {
  keys?: Array<[string, string]>;
  note?: ReactNode;
  /** Ação à esquerda das dicas (ex.: botão "Hoje" do calendário). */
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-t border-border px-3 py-2",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {leading}
        {keys?.map(([key, action]) => (
          <span key={`${key}-${action}`} className="flex items-center gap-1">
            <Kbd>{key}</Kbd>
            <span className={cn(dsHint, "normal-case tracking-normal")}>
              {action}
            </span>
          </span>
        ))}
      </span>
      {note && <span className={cn(dsHint, "truncate")}>{note}</span>}
    </div>
  );
}
