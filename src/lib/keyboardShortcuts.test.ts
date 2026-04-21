import { describe, expect, it } from "vitest";
import {
  formatShortcut,
  isEditableElement,
  isGlobalShortcutEvent,
  isShortcutEvent,
} from "./keyboardShortcuts";

describe("keyboard shortcuts", () => {
  it("detects editable elements", () => {
    expect(isEditableElement(null)).toBe(false);
    expect(
      isEditableElement({
        closest: (selector: string) => (selector.includes("input") ? {} : null),
      } as never),
    ).toBe(true);
    expect(isEditableElement({ isContentEditable: true } as never)).toBe(true);
  });

  it("allows app shortcuts outside editable elements", () => {
    expect(
      isGlobalShortcutEvent({
        key: "k",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        repeat: false,
        defaultPrevented: false,
        target: null,
      } as unknown as KeyboardEvent),
    ).toBe(true);

    expect(
      isGlobalShortcutEvent({
        key: ",",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        repeat: false,
        defaultPrevented: false,
        target: null,
      } as unknown as KeyboardEvent),
    ).toBe(true);

    expect(
      isShortcutEvent(
        {
          key: "p",
          ctrlKey: false,
          metaKey: true,
          altKey: false,
          shiftKey: false,
          repeat: false,
          defaultPrevented: false,
          target: null,
        } as unknown as KeyboardEvent,
        "mod+p",
      ),
    ).toBe(true);
  });

  it("formats shortcut labels for display", () => {
    expect(formatShortcut("mod+k")).toBe("Ctrl/Cmd+K");
    expect(formatShortcut("mod+,")).toBe("Ctrl/Cmd+,");
    expect(formatShortcut("escape")).toBe("Esc");
  });

  it("blocks shortcuts while typing", () => {
    expect(
      isGlobalShortcutEvent({
        key: "n",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        repeat: false,
        defaultPrevented: false,
        target: {
          closest: () => ({}),
        } as never,
      } as unknown as KeyboardEvent),
    ).toBe(false);
  });
});
