// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialogFocus } from "./use-dialog-focus";

function TestDialog({ onClose }: { onClose: () => void }) {
  const ref = useDialogFocus<HTMLDivElement>(true, onClose);
  return <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}><button>First</button><button>Last</button></div>;
}

describe("useDialogFocus", () => {
  afterEach(cleanup);

  it("focuses the dialog, traps tab navigation, closes on Escape, and restores focus", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(<TestDialog onClose={onClose} />);
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
