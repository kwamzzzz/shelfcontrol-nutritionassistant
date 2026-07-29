import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import AppSidebar from "@/components/layout/AppSidebar";

vi.mock("@/hooks/useMyInvites", () => ({
  useMyInvites: () => ({ pendingCount: 0 }),
}));

vi.mock("@/components/ModeToggle", async () => {
  const React = await import("react");
  const ModeToggle = React.forwardRef<HTMLButtonElement, { className?: string }>(
    ({ className }, ref) => (
      <button ref={ref} type="button" className={className}>Theme</button>
    ),
  );
  ModeToggle.displayName = "MockModeToggle";

  return {
    ModeToggle,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

describe("AppSidebar compact active state", () => {
  beforeEach(() => {
    const values = new Map<string, string>([["sidebar-collapsed", "true"]]);
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
  });

  it("keeps the current route coloured and accessible inside the tooltip trigger", () => {
    render(
      <MemoryRouter initialEntries={["/pantry/item-123"]}>
        <SidebarProvider>
          <TooltipProvider>
            <AppSidebar />
          </TooltipProvider>
        </SidebarProvider>
      </MemoryRouter>,
    );

    const pantryLink = screen.getByRole("link", { name: "Pantry" });
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });

    expect(pantryLink).toHaveAttribute("aria-current", "page");
    expect(pantryLink).toHaveClass("bg-emerald-600", "text-white");
    expect(pantryLink.className).not.toContain("=>");
    expect(dashboardLink).not.toHaveClass("bg-emerald-600");
  });
});
