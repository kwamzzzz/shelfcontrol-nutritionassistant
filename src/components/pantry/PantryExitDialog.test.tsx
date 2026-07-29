import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InventoryRow } from "@/hooks/usePantry";
import PantryExitDialog from "@/components/pantry/PantryExitDialog";

vi.mock("@/hooks/usePantry", () => ({
  useUpdateInventory: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useConsumption", () => ({
  useCreateConsumptionLog: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useWasteLogs", () => ({
  useCreateWasteLog: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-shell-mode", () => ({
  useIsPhone: () => false,
}));

const entry = (id: string, name: string): InventoryRow => ({
  id,
  item_id: `item-${id}`,
  quantity: 1,
  unit: "unit",
  status: "active",
  archived_at: null,
  items: { name },
} as InventoryRow);

describe("PantryExitDialog action isolation", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    };
    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("ResizeObserver", class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  it("shows one consumption-only surface for a single item", () => {
    render(
      <PantryExitDialog
        entry={entry("one", "Rice")}
        mode="consume"
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Record Rice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save consumption" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dispose/i })).not.toBeInTheDocument();
  });

  it("shows one disposal-only confirmation for a single item", () => {
    render(
      <PantryExitDialog
        entry={entry("two", "Milk")}
        mode="dispose"
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Dispose Milk?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dispose item" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /consum/i })).not.toBeInTheDocument();
  });

  it("provides a dedicated bulk consumption confirmation", () => {
    render(
      <PantryExitDialog
        entries={[entry("three", "Apples"), entry("four", "Carrots")]}
        mode="consume"
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Consume 2 items?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Consume 2 items" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dispose/i })).not.toBeInTheDocument();
  });

  it("provides a dedicated bulk disposal confirmation", () => {
    render(
      <PantryExitDialog
        entries={[entry("five", "Yoghurt"), entry("six", "Spinach")]}
        mode="dispose"
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Dispose 2 items?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dispose 2 items" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /consum/i })).not.toBeInTheDocument();
  });
});
