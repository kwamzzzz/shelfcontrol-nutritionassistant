import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISPOSAL_CONFIRMATION_STORAGE_KEY,
  getDisposalConfirmationEnabled,
  setDisposalConfirmationEnabled,
} from "@/lib/pantry-exit-preferences";

describe("pantry disposal preferences", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
  });

  it("confirms disposals by default", () => {
    expect(getDisposalConfirmationEnabled()).toBe(true);
  });

  it("remembers when the user no longer wants single-item confirmations", () => {
    setDisposalConfirmationEnabled(false);

    expect(window.localStorage.getItem(DISPOSAL_CONFIRMATION_STORAGE_KEY)).toBe("never");
    expect(getDisposalConfirmationEnabled()).toBe(false);
  });

  it("can restore confirmations from settings", () => {
    setDisposalConfirmationEnabled(false);
    setDisposalConfirmationEnabled(true);

    expect(getDisposalConfirmationEnabled()).toBe(true);
  });
});
