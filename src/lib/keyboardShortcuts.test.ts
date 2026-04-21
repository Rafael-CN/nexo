import { describe, expect, it } from "vitest";
import { isEditableElement, isGlobalShortcutEvent } from "./keyboardShortcuts";

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
        repeat: false,
        defaultPrevented: false,
        target: null,
      } as unknown as KeyboardEvent),
    ).toBe(true);

    expect(
      isGlobalShortcutEvent({
        key: "2",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        repeat: false,
        defaultPrevented: false,
        target: null,
      } as unknown as KeyboardEvent),
    ).toBe(true);
  });

  it("blocks shortcuts while typing", () => {
    expect(
      isGlobalShortcutEvent({
        key: "n",
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        repeat: false,
        defaultPrevented: false,
        target: {
          closest: () => ({}),
        } as never,
      } as unknown as KeyboardEvent),
    ).toBe(false);
  });
});
