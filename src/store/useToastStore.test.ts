import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useToastStore } from "./useToastStore";

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useToastStore", () => {
  it("pushes and auto-dismisses after the duration", () => {
    toast("Salvo");
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(6001);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("caps the stack at three, dropping the oldest", () => {
    toast("a");
    toast("b");
    toast("c");
    toast("d");

    const messages = useToastStore.getState().toasts.map((t) => t.message);
    expect(messages).toEqual(["b", "c", "d"]);
  });

  it("dismisses manually and keeps the rest", () => {
    const id = toast("a");
    toast("b");

    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["b"]);

    // o timer do dispensado não derruba o restante depois
    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("keeps action metadata for undo flows", () => {
    const onAction = vi.fn();
    toast("Excluído", { actionLabel: "Desfazer", onAction });

    const entry = useToastStore.getState().toasts[0];
    expect(entry.actionLabel).toBe("Desfazer");
    entry.onAction?.();
    expect(onAction).toHaveBeenCalledOnce();
  });
});
