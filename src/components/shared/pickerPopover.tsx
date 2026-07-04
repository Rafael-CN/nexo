import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type PickerPopoverPlacement = "top" | "bottom";
export type PickerPopoverAlign = "start" | "end";

const POPOVER_MARGIN = 8;
const POPOVER_GAP = 6;
const SURFACE_SHADOW = "shadow-[0_24px_56px_-30px_rgba(0,0,0,0.85)]";
const SURFACE_CLASS =
  "border border-border bg-popover text-popover-foreground " +
  SURFACE_SHADOW;

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
        SURFACE_CLASS,
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
