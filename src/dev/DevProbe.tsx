// DEV ONLY (patch 11). Measures the real DOM of the recreated app and logs the rectangles src/config/anchors.ts needs, as one line:
//   ANCHORS {"workspace": {...}, "lab": {...}, ...}
// Every rectangle is in LOGICAL window px (origin = top-left of the AppWindow), so it is independent of where DevApp places the window.
// Used by tools/measure-anchors.mjs (which renders DevApp with `probe` on, reads this log and writes src/config/anchors.measured.json).
// Which parts are measured depends on the frame, because the app shows different things on different frames:
//   f745   the Workspace form          f1230  the Blast panel's event log, scrolled into view (the scroll is added back)
//   f2150  the Attack Lab, list not scrolled          f3900  the Report, cards settled (the page's own scroll is added back)
//   f4700  the Infra screen
import React from "react";
import { continueRender, delayRender } from "remotion";
import { BLAST_SCROLL, REPORT_SCROLL, keyframeValue } from "../config/script";

type R = { x: number; y: number; w: number; h: number };

/** The leaf elements whose own text is exactly `text`. */
function leaves(root: Element, text: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    if (own === text) out.push(el);
  });
  return out;
}

/** The nearest ancestor (or the element) that draws a visible border: the card / field / button the text sits in. */
function framed(el: HTMLElement, root: Element): HTMLElement {
  let cur: HTMLElement | null = el;
  while (cur && cur !== root) {
    const cs = getComputedStyle(cur);
    if (parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== "none" && cur.getBoundingClientRect().width >= 20) return cur;
    cur = cur.parentElement;
  }
  return el;
}

const round = (n: number): number => Math.round(n * 100) / 100;

export const DevProbe: React.FC<{ frame: number; rootRef: React.RefObject<HTMLDivElement | null> }> = ({ frame, rootRef }) => {
  const [handle] = React.useState(() => delayRender("probe"));
  React.useEffect(() => {
    const host = rootRef.current;
    const root = host?.firstElementChild as HTMLElement | null;
    if (!root) {
      continueRender(handle);
      return;
    }
    const o = root.getBoundingClientRect();
    const rect = (el: Element): R => {
      const b = el.getBoundingClientRect();
      return { x: round(b.left - o.left), y: round(b.top - o.top), w: round(b.width), h: round(b.height) };
    };
    const first = (text: string): HTMLElement => {
      const l = leaves(root, text);
      if (!l.length) throw new Error(`probe: no element with the text "${text}" on frame ${frame}`);
      return l[0];
    };
    const out: Record<string, unknown> = {};
    try {
      if (frame >= 1000 && frame < 2000) {
        // patch 13c: the Blast panel is scrolled on this frame: add the scroll back to get BODY coordinates (before the scroll).
        // The row is the one the hidden check's line lands in; `logText` is the line's own text, `logRow` the whole list item.
        const sc = keyframeValue(BLAST_SCROLL, frame);
        const body = (el: Element): R => {
          const r = rect(el);
          return { ...r, y: round(r.y + sc) };
        };
        const text = first("Hidden check passed");
        out.blast = { logRow: body(text.closest("li") ?? text), logText: body(text) };
      } else if (frame < 2000) {
        const tabs = Array.from(root.querySelectorAll('[role="tab"]')).map(rect);
        out.workspace = {
          scenarioSelect: rect(framed(first("Fix a failing pricing library"), root)),
          profileStrict: rect(first("strict")),
          profileObserve: rect(first("observe")),
          holdSelect: rect(framed(first("hold 1 min"), root)),
          runButton: rect(framed(first("Run in sandbox"), root)),
          paneTabs: tabs,
          // patch 12c: the containment dial of the BlastPanel (the svg itself, so its centre is the dial's centre): where S1's dial lands
          dial: rect(root.querySelector('svg[role="img"][aria-label^="Containment dial"]') ?? first("Containment dial")),
        };
      } else if (frame < 3000) {
        const tiles = Array.from(root.querySelectorAll('[role="group"]')[0].children).map(rect);
        const titles = ["Denied, then bypassed", "Wipe the workspace, then rewind"];
        const c0 = framed(first(titles[0]), root);
        const hero = framed(first(titles[1]), root);
        const list = c0.parentElement!.parentElement!;
        // every card of the list: top relative to the list's top, and height (the list is not scrolled on this frame)
        const cards = Array.from(c0.parentElement!.children).map((c) => ({ top: round(c.getBoundingClientRect().top - list.getBoundingClientRect().top), h: round(c.getBoundingClientRect().height) }));
        const runBtn = framed(leaves(hero, "Run")[0], hero);
        const heroRect = rect(hero);
        const rb = rect(runBtn);
        out.lab = {
          tiles,
          cards,
          list: rect(list),
          runInCard: { x: round(rb.x - heroRect.x), y: round(rb.y - heroRect.y), w: rb.w, h: rb.h },
          cardX: heroRect.x,
          cardW: heroRect.w,
        };
      } else if (frame < 4300) {
        // the page is scrolled on this frame: add the scroll back to get PAGE coordinates (before the scroll)
        const sc = keyframeValue(REPORT_SCROLL, frame);
        const page = (el: Element): R => {
          const r = rect(el);
          return { ...r, y: round(r.y + sc) };
        };
        out.report = {
          verifyButton: page(framed(first("Verify ledger now"), root)),
          firstCard: page(framed(first("§1"), root)),
        };
      } else {
        out.infra = { firstPanel: rect(framed(first("§1"), root)) };
      }
      // eslint-disable-next-line no-console
      console.log("ANCHORS " + JSON.stringify(out));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("ANCHORS_ERROR " + String((e as Error).message));
    }
    continueRender(handle);
  }, [frame, handle, rootRef]);
  return null;
};
