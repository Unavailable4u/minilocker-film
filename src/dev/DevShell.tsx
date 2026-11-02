// DEV ONLY (patch 05). QA sheets for the UI kit A: the app window + header, and every primitive in every tone.
// One composition, one page per FRAME, so each still is a clean 1:1 comparison with the real app:
//   frame 0  window, Workspace active (activeScreen 0)              <- compare with the real app at 1600 x 900, dark theme
//   frame 1  window, underline halfway between Timeline and Attack Lab (1.5), running chip, token applied, rim light 0.7
//   frame 2  window, Attack Lab active (2), a hovered tab, finished task
//   frame 3  every primitive in every tone and state
//   frame 4  the Donut at 0, 9/15, 15/15 (plus a mixed one) and the header in six more states
// Check it with:  npx remotion still src/index.ts DevShell out/qa/shell-0.png --frame=0   (and --frame=1 .. 4)
// Everything shown here (the sample task id, the 9/15 and 15/15, the labels) is a developer note or a made-up value, not film
// copy and not evidence.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../ui/theme.css";
import { fonts, theme } from "../config/theme";
import { LOGICAL, STAGE } from "../config/timeline";
import { FontsReady } from "../lib/fonts";
import { AppWindow } from "../ui/AppWindow";
import { Header, type HeaderProps } from "../ui/Header";
import {
  Btn,
  Card,
  Chip,
  Donut,
  Kbd,
  Label,
  Meter,
  PULSE_FRAMES,
  Pulse,
  SectionHead,
  Segmented,
  Spin,
  type BtnVariant,
  type DonutSegment,
  type Tint,
} from "../ui/primitives";

/** Number of QA pages (one per frame). */
export const DEV_SHELL_FRAMES = 5;

const TONES: readonly Tint[] = ["mute", "ok", "bad", "warn", "info"];
const VARIANTS: readonly BtnVariant[] = ["primary", "ghost", "danger", "warn", "info"];

/** Made-up sample id for the chip (dev only). */
const SAMPLE_ID = "9f3a7c21e0b4";

const note = (px = 18, color: string = theme.ink3): React.CSSProperties => ({
  fontFamily: fonts.mono,
  fontSize: px,
  color,
  lineHeight: 1.3,
});

// ---------------------------------------------------------------------------------------------- window pages

interface WindowPage {
  title: string;
  header: HeaderProps;
  rim: number;
}

const WINDOW_PAGES: readonly WindowPage[] = [
  {
    title: "window + header, activeScreen = 0 (idle, no token)",
    header: { activeScreen: 0, taskId: null, status: "idle", tokenApplied: false },
    rim: 0,
  },
  {
    title: "activeScreen = 1.5 (underline mid-slide), running, token applied, rim = 0.7",
    header: { activeScreen: 1.5, taskId: SAMPLE_ID, status: "running", tokenApplied: true, pulse: 0.35 },
    rim: 0.7,
  },
  {
    title: "activeScreen = 2, tabHighlight = 4, task finished",
    header: { activeScreen: 2, tabHighlight: 4, taskId: SAMPLE_ID, status: "done", tokenApplied: true },
    rim: 0,
  },
];

const WindowPageView: React.FC<{ page: WindowPage }> = ({ page }) => (
  <AbsoluteFill style={{ background: theme.stageGradient }}>
    <div style={{ position: "absolute", left: 40, top: 30, ...note(20, theme.ink2) }}>DevShell · patch 05 · dev only · {page.title}</div>
    <div style={{ position: "absolute", left: (STAGE.w - LOGICAL.w) / 2, top: (STAGE.h - LOGICAL.h) / 2 }}>
      <AppWindow header={<Header {...page.header} />} rim={page.rim}>
        <div style={{ flex: 1, display: "grid", placeItems: "center", ...note(20) }}>body slot (patch 06 and later)</div>
      </AppWindow>
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------- primitives page

const Row: React.FC<{ title: string; children: React.ReactNode; gap?: number }> = ({ title, children, gap = 14 }) => (
  <div style={{ marginTop: 22 }}>
    <div style={note(17)}>{title}</div>
    <div style={{ display: "flex", alignItems: "center", gap, marginTop: 8, flexWrap: "wrap" }}>{children}</div>
  </div>
);

const PrimitivesPage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.paper, backgroundImage: theme.appBackground, backgroundSize: theme.appBackgroundSize, padding: "28px 48px" }}>
    <div style={note(20, theme.ink2)}>DevShell · patch 05 · dev only · primitives, every tone and state</div>

    <Row title="Chip: tone x (plain, dot)">
      {TONES.map((t) => (
        <Chip key={t} tone={t}>
          {t}
        </Chip>
      ))}
      <span style={{ width: 20 }} />
      {TONES.map((t) => (
        <Chip key={t} tone={t} dot>
          {t}
        </Chip>
      ))}
      <span style={{ width: 20 }} />
      <Chip tone="info">
        <Pulse tone="info" phase={0.3} />
        <span style={{ fontFamily: fonts.mono, textTransform: "none", letterSpacing: "normal" }}>{SAMPLE_ID}</span>
        <span aria-hidden>·</span>running
      </Chip>
    </Row>

    <Row title="Btn: variant x md   |   sm   |   pressed, hover, disabled">
      {VARIANTS.map((v) => (
        <Btn key={v} variant={v}>
          Run in sandbox
        </Btn>
      ))}
      <span style={{ width: 16 }} />
      {VARIANTS.map((v) => (
        <Btn key={v} variant={v} size="sm">
          Run
        </Btn>
      ))}
    </Row>
    <Row title="">
      <Btn variant="primary" pressed>
        pressed
      </Btn>
      <Btn variant="primary" hover>
        hover
      </Btn>
      <Btn variant="ghost" hover>
        hover
      </Btn>
      <Btn variant="danger" hover>
        hover
      </Btn>
      <Btn variant="info" hover>
        hover
      </Btn>
      <Btn variant="primary" disabled>
        disabled
      </Btn>
      <Btn variant="ghost" size="sm" disabled>
        disabled
      </Btn>
      <span style={{ width: 16 }} />
      <Segmented
        value="strict"
        options={[
          { id: "strict", label: "strict" },
          { id: "observe", label: "observe" },
        ]}
      />
      <Segmented
        value="strict"
        hover="observe"
        options={[
          { id: "strict", label: "strict" },
          { id: "observe", label: "observe" },
        ]}
      />
      <span style={{ fontSize: 13.6, fontStyle: "italic", color: theme.ink3 }}>
        <Kbd>Ctrl</Kbd> + <Kbd>↵</Kbd> to run
      </span>
    </Row>

    <Row title="Label, SectionHead">
      <Label>blast radius</Label>
      <Label style={{ color: theme.accentInk, fontSize: 14.62 }}>eyebrow</Label>
      <div style={{ width: 520 }}>
        <SectionHead no={2} title="Policy decisions" note="what the engine said" right={<Chip tone="ok">measured</Chip>} />
      </div>
      <div style={{ width: 360 }}>
        <SectionHead title="No number, no note" />
      </div>
    </Row>

    <Row title="Card: tone (frame only)" gap={18}>
      {TONES.map((t) => (
        <Card key={t} tone={t} style={{ width: 200, height: 84, padding: 12 }}>
          <Label>{t}</Label>
        </Card>
      ))}
    </Row>

    <Row title="Meter: tone x value 0 / .02 / .25 / .5 / 1" gap={22}>
      {TONES.map((t) => (
        <div key={t} style={{ display: "flex", flexDirection: "column", gap: 8, width: 200 }}>
          {[0, 0.02, 0.25, 0.5, 1].map((v) => (
            <Meter key={v} value={v} tone={t} />
          ))}
        </div>
      ))}
    </Row>

    <Row title="Spin at 0 / .25 / .5 / .75 turns (ink, accent), Pulse at phase 0 / .2 / .4 / .6 / .75 / .9 (tones)" gap={18}>
      {[0, 0.25, 0.5, 0.75].map((p) => (
        <Spin key={p} progress={p} />
      ))}
      {[0, 0.25, 0.5, 0.75].map((p) => (
        <span key={p} style={{ color: theme.accent, display: "inline-flex" }}>
          <Spin progress={p} />
        </span>
      ))}
      <span style={{ width: 24 }} />
      {TONES.map((t) => (
        <div key={t} style={{ display: "flex", gap: 14 }}>
          {[0, 0.2, 0.4, 0.6, 0.75, 0.9].map((p) => (
            <span key={p} style={{ display: "inline-flex", padding: 6 }}>
              <Pulse tone={t} phase={p} />
            </span>
          ))}
        </div>
      ))}
    </Row>
    <div style={{ ...note(15), marginTop: 10 }}>one Pulse cycle = {PULSE_FRAMES} frames</div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------- donuts + header states

const NINE: DonutSegment[] = [{ value: 9, tone: "ok" }];
const FIFTEEN: DonutSegment[] = [{ value: 15, tone: "ok" }];
const MIXED: DonutSegment[] = [
  { value: 9, tone: "ok" },
  { value: 3, tone: "bad" },
  { value: 2, tone: "warn" },
  { value: 1, tone: "info" },
];

const DonutCell: React.FC<{ title: string; segments: DonutSegment[]; center: string; size?: number; stroke?: number }> = ({
  title,
  segments,
  center,
  size = 116,
  stroke = 10,
}) => (
  <div style={{ width: 200 }}>
    <Donut segments={segments} total={15} size={size} stroke={stroke}>
      <span className="display" style={{ fontSize: 28, color: theme.ink }}>
        {center}
      </span>
    </Donut>
    <div style={{ ...note(16), marginTop: 6 }}>{title}</div>
  </div>
);

const HEADER_STATES: readonly { title: string; header: HeaderProps }[] = [
  { title: "idle, active 0, no token (placeholder)", header: { activeScreen: 0, taskId: null, status: "idle", tokenApplied: false } },
  {
    title: "running (Pulse, no dot), active 1, token focused with 5 characters, not yet applied",
    header: { activeScreen: 1, taskId: SAMPLE_ID, status: "running", tokenApplied: false, tokenChars: 5, tokenFocused: true, pulse: 0.3 },
  },
  { title: "done, active 2, token applied (tick)", header: { activeScreen: 2, taskId: SAMPLE_ID, status: "done", tokenApplied: true } },
  {
    title: "error (hatched), active 3, theme icon = moon, theme button hovered",
    header: { activeScreen: 3, taskId: SAMPLE_ID, status: "error: policy", tokenApplied: true, themeIcon: "moon", themeHover: true },
  },
  { title: "halted (amber), active 5 (Infra), tabHighlight 0", header: { activeScreen: 5, tabHighlight: 0, taskId: SAMPLE_ID, status: "halted", tokenApplied: true } },
];

const DonutPage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.paper, backgroundImage: theme.appBackground, backgroundSize: theme.appBackgroundSize, padding: "28px 48px" }}>
    <div style={note(20, theme.ink2)}>DevShell · patch 05 · dev only · Donut (total 15) and header states</div>
    <div style={{ display: "flex", gap: 40, marginTop: 20 }}>
      <DonutCell title="0 of 15 (empty track)" segments={[]} center="0/15" />
      <DonutCell title="9 of 15 (ok gradient + glow)" segments={NINE} center="9/15" />
      <DonutCell title="15 of 15 (full ring)" segments={FIFTEEN} center="15/15" />
      <DonutCell title="mixed 9 ok, 3 bad, 2 warn, 1 info" segments={MIXED} center="15" />
      <DonutCell title="default size 132, stroke 11" segments={NINE} center="9/15" size={132} stroke={11} />
    </div>
    {HEADER_STATES.map((s) => (
      <div key={s.title} style={{ marginTop: 18 }}>
        <div style={{ ...note(16), marginBottom: 4 }}>{s.title}</div>
        <div style={{ width: LOGICAL.w, height: 67.47, position: "relative", overflow: "hidden", backgroundColor: theme.paper, backgroundImage: theme.appBackground, backgroundSize: theme.appBackgroundSize }}>
          <Header {...s.header} />
        </div>
      </div>
    ))}
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------- composition

export const DevShell: React.FC = () => {
  const frame = useCurrentFrame();
  const page = Math.min(DEV_SHELL_FRAMES - 1, Math.max(0, frame));
  return (
    <FontsReady>
      <AbsoluteFill className="film-root">
        {page < WINDOW_PAGES.length ? <WindowPageView page={WINDOW_PAGES[page]} /> : page === 3 ? <PrimitivesPage /> : <DonutPage />}
      </AbsoluteFill>
    </FontsReady>
  );
};
