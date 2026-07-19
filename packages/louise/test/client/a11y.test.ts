// happy-dom coverage for the shared modal-dialog accessibility helper: the four
// behaviours every Louise overlay (Settings drawer, version history, inspector)
// needs — focus moves in on open, Tab stays inside, Escape closes, and focus
// returns to the opener on close.

import { afterEach, describe, expect, it } from "vitest";
import { wireDialogA11y } from "../../src/client/a11y.js";

/** Let the helper's deferred initial focus (a queued microtask) run. */
const flush = () => new Promise<void>((r) => queueMicrotask(r));

/** A dialog appended to the body, with a focused "opener" button behind it. */
function mountDialog(inner: string): { dialog: HTMLElement; opener: HTMLButtonElement } {
  const opener = document.createElement("button");
  opener.textContent = "Open";
  document.body.appendChild(opener);
  opener.focus();
  const dialog = document.createElement("aside");
  dialog.innerHTML = inner;
  document.body.appendChild(dialog);
  return { dialog, opener };
}

const press = (el: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));

afterEach(() => document.body.replaceChildren());

describe("wireDialogA11y", () => {
  it("marks the dialog modal and moves focus into it", async () => {
    const { dialog } = mountDialog('<button id="a">A</button><button id="b">B</button>');
    const off = wireDialogA11y(dialog, { onClose: () => {} });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("tabindex")).toBe("-1");
    await flush();
    expect(document.activeElement).toBe(dialog.querySelector("#a"));
    off();
  });

  it("honours an explicit initialFocus", async () => {
    const { dialog } = mountDialog('<button id="a">A</button><button id="b">B</button>');
    const off = wireDialogA11y(dialog, {
      onClose: () => {},
      initialFocus: () => dialog.querySelector<HTMLElement>("#b"),
    });
    await flush();
    expect(document.activeElement).toBe(dialog.querySelector("#b"));
    off();
  });

  it("closes on Escape from anywhere inside", async () => {
    let closed = 0;
    const { dialog } = mountDialog('<button id="a">A</button>');
    const off = wireDialogA11y(dialog, { onClose: () => closed++ });
    await flush();
    press(dialog.querySelector<HTMLElement>("#a")!, "Escape");
    expect(closed).toBe(1);
    off();
  });

  it("wraps Tab at both edges so focus can't reach the page behind", async () => {
    const { dialog } = mountDialog('<button id="a">A</button><button id="b">B</button>');
    const off = wireDialogA11y(dialog, { onClose: () => {} });
    await flush();
    const a = dialog.querySelector<HTMLElement>("#a")!;
    const b = dialog.querySelector<HTMLElement>("#b")!;

    b.focus();
    press(b, "Tab"); // last → first
    expect(document.activeElement).toBe(a);

    a.focus();
    press(a, "Tab", { shiftKey: true }); // first → last
    expect(document.activeElement).toBe(b);
    off();
  });

  it("leaves the contents of a collapsed <details> out of the tab ring", async () => {
    const { dialog } = mountDialog(
      '<button id="a">A</button><button id="z">Z</button>' +
        '<details><summary id="s">More</summary><button id="buried">B</button></details>',
    );
    const off = wireDialogA11y(dialog, { onClose: () => {} });
    await flush();
    // The summary is the last tabbable — the buried button inside the closed
    // <details> doesn't count — so Tab from it wraps back to the first.
    const s = dialog.querySelector<HTMLElement>("#s")!;
    s.focus();
    press(s, "Tab");
    expect(document.activeElement).toBe(dialog.querySelector("#a"));
    off();
  });

  it("restores focus to the opener and unmarks the dialog on dispose", async () => {
    const { dialog, opener } = mountDialog('<button id="a">A</button>');
    const off = wireDialogA11y(dialog, { onClose: () => {} });
    await flush();
    expect(document.activeElement).not.toBe(opener);
    off();
    expect(document.activeElement).toBe(opener);
    expect(dialog.hasAttribute("aria-modal")).toBe(false);
  });

  it("doesn't fight an opener that has since been removed", async () => {
    const { dialog, opener } = mountDialog('<button id="a">A</button>');
    const off = wireDialogA11y(dialog, { onClose: () => {} });
    await flush();
    opener.remove(); // e.g. the on-canvas ⚙ unmounts with the chrome
    expect(() => off()).not.toThrow();
  });
});
