// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const signIn = vi.fn();
const push = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("AuthForm", () => {
  beforeEach(() => { signIn.mockReset(); push.mockReset(); });
  afterEach(cleanup);

  it("submits an email and password sign in", async () => {
    signIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "secure-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(signIn).toHaveBeenCalledOnce());
    const formData = signIn.mock.calls[0]?.[1] as FormData;
    expect(signIn.mock.calls[0]?.[0]).toBe("password");
    expect(formData.get("flow")).toBe("signIn");
    expect(push).toHaveBeenCalledWith("/dashboard/onboarding");
  });

  it("completes both password recovery steps", async () => {
    signIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    await user.type(screen.getByLabelText("Email"), "owner@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset code" }));

    expect(await screen.findByText("Resetting the password for owner@example.com")).toBeVisible();
    await user.type(screen.getByLabelText("Reset code"), "123456");
    await user.type(screen.getByLabelText("New password"), "new-secure-password");
    await user.click(screen.getByRole("button", { name: "Set new password" }));

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
    const request = signIn.mock.calls[0]?.[1] as FormData;
    const verification = signIn.mock.calls[1]?.[1] as FormData;
    expect(request.get("flow")).toBe("reset");
    expect(verification.get("flow")).toBe("reset-verification");
    expect(verification.get("email")).toBe("owner@example.com");
    expect(verification.get("code")).toBe("123456");
    expect(verification.get("newPassword")).toBe("new-secure-password");
  });
});
