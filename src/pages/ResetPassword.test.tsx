import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "@/pages/ResetPassword";

const updateUser = vi.fn();
let session: object | null = { user: { id: "u1" } };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { updateUser: (...a: unknown[]) => updateUser(...a) } },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session, loading: false }) }));
vi.mock("@/components/brand/BrandLogo", () => ({ BrandLogo: () => null }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>,
  );

describe("ResetPassword", () => {
  beforeEach(() => {
    updateUser.mockReset().mockResolvedValue({ error: null });
    session = { user: { id: "u1" } };
  });

  it("refuses two different passwords", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "first-pass" } });
    fireEvent.change(screen.getByLabelText("Type it again"), { target: { value: "other-pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("don't match");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("saves the new password to the signed-in account", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "same-pass" } });
    fireEvent.change(screen.getByLabelText("Type it again"), { target: { value: "same-pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "same-pass" }));
  });

  it("offers a new link when the link has expired", () => {
    session = null;
    renderPage();
    expect(screen.getByText(/link has expired/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send a new link" })).toBeInTheDocument();
  });
});
