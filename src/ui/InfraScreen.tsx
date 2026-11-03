// MiniLocker film: the Infra screen (patch 07), ported from frontend/src/Infra.tsx. Top to bottom:
//   PageHead       "Control plane / Infrastructure" with the live chip
//   wiring diagram "How a task flows": six nodes (host, docker, sandboxes, egress proxy, inference, artifacts) joined by arrows
//   six panels     §1 Host (memory and disk Gauge meters, hostname, os, cpus, uptime, the Vultr rows), §2 Docker, §3 Sandboxes,
//                  §4 Egress proxy, §5 Inference, §6 Artifact storage; each with a badge and the accent hairline
//   footnote
//
// DUMB COMPONENT: props in, pixels out. Every host name, region, plan, model, bucket, number and duration is read from the
// InfraStatus the caller passes (evidence through src/data/select.ts). The static wording is src/config/copy.ts `inf`.
// The Vultr public IP is NOT drawn (BIBLE 10.5): the field exists in the data and this screen never reads it. A secret is never
// shown either: the API key row says only "set (never shown)" or "not set", as in the app.
//
// MOTION is passed in by the scene:
//   reveal[i]   0..1, index 0 = the wiring diagram, 1..6 = the six panels in order (§1..§6); a missing entry counts as 1.
//               A panel at 0 keeps its space, so the grid never reflows while it fills.
//   pulse       0..1 phase of the live dot (pulsePhase(frame))
//   flash[i]    optional 0..1 per reveal index: lights that frame in the tone of its status for a moment ("panels flash with real values")
//   scrollY     px the whole page is scrolled up
import React from "react";
import { alpha, fonts, theme } from "../config/theme";
import { inf } from "../config/copy";
import type { InfraStatus } from "../data/types";
import { clamp01 } from "../lib/ease";
import { riseStyle } from "../lib/rise";
import { Row, PageHead, TABULAR, TRUNCATE } from "./page";
import { Card, Chip, HairlineAccent, Meter, Pulse, SMCP, VAR, rem, sp, type Tint } from "./primitives";

// ---------------------------------------------------------------------------------------------- helpers (Infra.tsx)

const GIB = 1024 ** 3;
const gib = (v: number | null | undefined): string => (v == null ? "—" : `${(v / GIB).toFixed(1)} GiB`);
const dur = (s: number | null | undefined): string => {
  if (s == null) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${Math.floor(s % 60)}s`;
};

/** A card lit in its status tone for a moment (`flash` 0..1). */
function flashStyle(tone: Tint, flash: number): React.CSSProperties {
  const f = clamp01(flash);
  if (f <= 0) return {};
  const c = VAR[tone === "mute" ? "info" : tone];
  return { borderColor: alpha(c, 0.2 + 0.7 * f), boxShadow: `${theme.panelShadow}, 0 0 ${(26 * f).toFixed(1)}px -4px ${alpha(c, 0.55 * f)}` };
}

// ---------------------------------------------------------------------------------------------- Panel

export interface PanelProps {
  no: number;
  title: string;
  badge?: string;
  /** "info" draws a mute chip without a dot (as the source). */
  tone?: "ok" | "bad" | "info";
  /** 0..1 entrance. */
  p?: number;
  flash?: number;
  children?: React.ReactNode;
}

/** A numbered panel. Source: `Panel` in Infra.tsx: `§n`, title, a badge on the right, the accent hairline, then a `dl` of rows. */
export const Panel: React.FC<PanelProps> = ({ no, title, badge, tone = "info", p = 1, flash = 0, children }) => {
  const t: Tint = tone === "info" ? "mute" : tone;
  return (
    <Card style={{ padding: sp(4), ...riseStyle(p), ...flashStyle(t, flash) }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: sp(2.5) }}>
        <span style={{ fontStyle: "italic", color: theme.accentInk }}>§{no}</span>
        <div style={{ fontSize: rem(1.15), fontWeight: 700, color: theme.ink }}>{title}</div>
        {badge && (
          <Chip tone={t} dot={tone !== "info"} style={{ marginLeft: "auto" }}>
            {badge}
          </Chip>
        )}
      </div>
      <HairlineAccent style={{ marginTop: sp(1.5) }} />
      <div style={{ display: "flex", flexDirection: "column", gap: sp(1.5), marginTop: sp(3), fontSize: rem(0.92) }}>{children}</div>
    </Card>
  );
};

// ---------------------------------------------------------------------------------------------- Gauge

export interface GaugeProps {
  label: string;
  used: number | null | undefined;
  total: number | null | undefined;
  /** Formats one number (bytes as GiB). */
  fmt: (v: number) => string;
}

/** A labelled meter: how full something is, with the numbers beside it. Draws nothing without both numbers, like the source. */
export const Gauge: React.FC<GaugeProps> = ({ label, used, total, fmt }) => {
  if (used == null || !total) return null;
  const f = used / total;
  return (
    <div style={{ paddingBottom: sp(1) }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: sp(1), fontSize: rem(0.88) }}>
        <span style={{ color: theme.ink2 }}>{label}</span>
        <span style={{ ...TABULAR, color: theme.ink }}>
          {fmt(used)} <span style={{ color: theme.ink3 }}>{inf.text.of} {fmt(total)}</span>
        </span>
      </div>
      <Meter value={f} tone={f > 0.9 ? "bad" : f > 0.75 ? "warn" : "ok"} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- wiring diagram

/** One line of the system's wiring, as a node on the diagram. */
const Node: React.FC<{ name: string; detail: string; tone: Tint }> = ({ name, detail, tone }) => (
  <div
    style={{
      boxSizing: "border-box",
      display: "flex",
      minWidth: 0,
      flex: "1 1 0%",
      flexDirection: "column",
      alignItems: "center",
      borderRadius: 7,
      border: `1px solid ${tone === "ok" ? alpha(theme.ok, 0.5) : tone === "bad" ? alpha(theme.bad, 0.5) : theme.rule}`,
      backgroundColor: tone === "ok" ? theme.okWash : tone === "bad" ? theme.badWash : theme.sheet,
      backgroundImage: tone === "bad" ? theme.hatchBad : undefined,
      padding: `${sp(2.5)}px ${sp(3)}px`,
      textAlign: "center",
    }}
  >
    <span style={{ ...SMCP, fontSize: rem(0.86), color: theme.ink2 }}>{name}</span>
    <span style={{ ...TRUNCATE, marginTop: sp(0.5), maxWidth: "100%", fontSize: rem(0.9), fontWeight: 700, color: theme.ink }}>{detail}</span>
  </div>
);

const Arrow: React.FC = () => (
  <span aria-hidden style={{ flex: "none", display: "flex", alignItems: "center", padding: `0 ${sp(1)}px`, fontSize: rem(1.2), color: theme.ink3 }}>
    →
  </span>
);

// ---------------------------------------------------------------------------------------------- the screen

export interface InfraScreenProps {
  infra: InfraStatus;
  /** Index 0 = the wiring diagram, 1..6 = the panels §1..§6. A missing entry counts as 1. */
  reveal?: readonly number[];
  /** 0..1 phase of the live dot's ping (pulsePhase(frame)). */
  pulse?: number;
  /** Optional per reveal index: 0..1 flash in the item's status tone. */
  flash?: readonly number[];
  scrollY?: number;
  style?: React.CSSProperties;
}

export const InfraScreen: React.FC<InfraScreenProps> = ({ infra, reveal, pulse = 0, flash, scrollY = 0, style }) => {
  const { host, docker, egress, inference, storage, vultr } = infra;
  const rv = (i: number): number => reveal?.[i] ?? 1;
  const fl = (i: number): number => flash?.[i] ?? 0;
  const nSbx = docker.sandboxes.length;
  const allowed = egress.allowed_hosts ?? [];
  const brokered = egress.brokered_services ?? [];
  const memUsed = host.memory_total_bytes != null && host.memory_available_bytes != null ? host.memory_total_bytes - host.memory_available_bytes : null;
  const diagramTone: Tint = vultr.available ? "ok" : "mute";

  return (
    <div style={{ display: "flex", flex: "1 1 0%", flexDirection: "column", minHeight: 0, overflow: "hidden", ...style }}>
      <div style={{ boxSizing: "border-box", padding: `${sp(7)}px ${sp(6)}px`, transform: scrollY ? `translateY(${-scrollY}px)` : undefined }}>
        <div style={{ maxWidth: rem(64), marginLeft: "auto", marginRight: "auto", display: "flex", flexDirection: "column", gap: sp(5) }}>
          <PageHead
            eyebrow={inf.eyebrow}
            title={inf.title}
            sub={inf.sub}
            right={
              <Chip tone="ok">
                <Pulse tone="ok" phase={pulse} /> {inf.live}
              </Chip>
            }
          />

          <Card style={{ padding: sp(4), ...riseStyle(rv(0)), ...flashStyle(diagramTone, fl(0)) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: sp(2), marginBottom: sp(2.5) }}>
              <span style={{ ...SMCP, fontSize: rem(0.9), color: theme.ink }}>{inf.flowTitle}</span>
              <span style={{ fontSize: rem(0.84), fontStyle: "italic", color: theme.ink3 }}>{inf.flowNote}</span>
            </div>
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <Node name={inf.nodes.host} detail={vultr.available ? `${inf.nodeDetail.vultr} ${vultr.region ?? ""}` : host.hostname} tone="ok" />
              <Arrow />
              <Node name={inf.nodes.docker} detail={docker.available ? `v${docker.version}` : inf.nodeDetail.unreachable} tone={docker.available ? "ok" : "bad"} />
              <Arrow />
              <Node name={inf.nodes.sandboxes} detail={`${nSbx} ${inf.nodeDetail.live}`} tone={nSbx ? "ok" : "info"} />
              <Arrow />
              <Node
                name={inf.nodes.egress}
                detail={egress.attached ? `${allowed.length} ${inf.nodeDetail.hostsAllowed}` : inf.nodeDetail.noNetwork}
                tone={egress.attached ? "ok" : "bad"}
              />
              <Arrow />
              <Node name={inf.nodes.inference} detail={inference.model ?? inf.nodeDetail.notSet} tone={inference.configured ? "ok" : "info"} />
              <Arrow />
              <Node
                name={inf.nodes.artifacts}
                detail={storage.attached ? (storage.bucket ?? inf.nodeDetail.attached) : inf.nodeDetail.notAttached}
                tone={storage.attached ? "ok" : "info"}
              />
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: sp(4) }}>
            <Panel
              no={1}
              title={inf.panels.host}
              badge={vultr.available ? inf.badges.vultrVm : inf.badges.notVultrVm}
              tone={vultr.available ? "ok" : "info"}
              p={rv(1)}
              flash={fl(1)}
            >
              <Gauge label={inf.rows.memoryInUse} used={memUsed} total={host.memory_total_bytes} fmt={gib} />
              <Gauge label={inf.rows.diskInUse} used={host.disk_total_bytes - host.disk_free_bytes} total={host.disk_total_bytes} fmt={gib} />
              <Row k={inf.rows.hostname}>{vultr.hostname ?? host.hostname}</Row>
              <Row k={inf.rows.os}>{host.os}</Row>
              <Row k={inf.rows.cpusLoad}>{`${host.cpus ?? "—"} · ${host.load ? host.load.join(" ") : "—"}`}</Row>
              <Row k={inf.rows.uptime}>{dur(host.uptime_s)}</Row>
              {vultr.available ? (
                <>
                  <Row k={inf.rows.vultrRegion}>{vultr.region}</Row>
                  <Row k={inf.rows.vultrPlan}>{vultr.plan}</Row>
                  <Row k={inf.rows.instance} mono>
                    {vultr.instance_id}
                  </Row>
                </>
              ) : (
                <Row k={inf.rows.vultr}>
                  <span style={{ fontStyle: "italic", color: theme.ink2 }}>{vultr.reason}</span>
                </Row>
              )}
            </Panel>

            <Panel
              no={2}
              title={inf.panels.docker}
              badge={docker.available ? inf.badges.up : inf.badges.unreachable}
              tone={docker.available ? "ok" : "bad"}
              p={rv(2)}
              flash={fl(2)}
            >
              {docker.available ? (
                <>
                  <Row k={inf.rows.version}>{docker.version}</Row>
                  <Row k={inf.rows.storageDriver}>{docker.storage_driver}</Row>
                  <Row k={inf.rows.cgroup}>{`v${docker.cgroup_version ?? "?"}`}</Row>
                  <Row k={inf.rows.runtimes}>{(docker.runtimes ?? []).join(", ")}</Row>
                  <Row k={inf.rows.containersRunning}>{docker.containers_running}</Row>
                </>
              ) : (
                <Row k={inf.rows.error}>
                  <span style={{ color: theme.bad }}>{docker.reason}</span>
                </Row>
              )}
            </Panel>

            <Panel no={3} title={inf.panels.sandboxes} badge={`${nSbx} ${inf.badges.live}`} tone={nSbx ? "ok" : "info"} p={rv(3)} flash={fl(3)}>
              {nSbx === 0 && <div style={{ fontStyle: "italic", lineHeight: 1.375, color: theme.ink2 }}>{inf.text.noSandboxes}</div>}
              {docker.sandboxes.map((b) => (
                <Row key={b.name} k={<span style={{ fontFamily: fonts.mono, fontSize: "0.85em" }}>{b.name.replace("minilocker-", "")}</span>}>
                  {b.role} · {b.status} · {dur(b.age_s)}
                </Row>
              ))}
            </Panel>

            <Panel
              no={4}
              title={inf.panels.egress}
              badge={egress.attached ? (egress.proxy ?? inf.badges.up) : inf.badges.notAttached}
              tone={egress.attached ? "ok" : "bad"}
              p={rv(4)}
              flash={fl(4)}
            >
              {egress.attached ? (
                <>
                  <Row k={inf.rows.allowlist}>{allowed.join(", ") || inf.text.allRefused}</Row>
                  <Row k={inf.rows.credentialBroker}>{brokered.length ? brokered.join(", ") : inf.text.notConfigured}</Row>
                </>
              ) : (
                <Row k={inf.rows.effect}>{inf.text.noNetworkAtAll}</Row>
              )}
            </Panel>

            <Panel
              no={5}
              title={inf.panels.inference}
              badge={inference.vultr ? inf.badges.vultrInference : inference.configured ? inf.badges.otherProvider : inf.badges.notConfigured}
              tone={inference.vultr ? "ok" : "info"}
              p={rv(5)}
              flash={fl(5)}
            >
              <Row k={inf.rows.endpointHost}>{inference.host}</Row>
              <Row k={inf.rows.model}>{inference.model}</Row>
              <Row k={inf.rows.apiKey}>{inference.key_set ? inf.text.keySet : inf.text.keyNotSet}</Row>
              <Row k={inf.rows.toolMode}>{inference.tool_mode}</Row>
            </Panel>

            <Panel
              no={6}
              title={inf.panels.storage}
              badge={storage.attached ? (storage.vultr ? inf.badges.vultrStorage : inf.badges.attached) : inf.badges.notAttached}
              tone={storage.attached ? "ok" : "info"}
              p={rv(6)}
              flash={fl(6)}
            >
              <Row k={inf.rows.endpointHost}>{storage.endpoint_host}</Row>
              <Row k={inf.rows.bucket}>{storage.bucket}</Row>
              {storage.error && (
                <Row k={inf.rows.error}>
                  <span style={{ color: theme.bad }}>{storage.error}</span>
                </Row>
              )}
            </Panel>
          </div>

          <div style={{ borderTop: `1px solid ${theme.rule}`, paddingTop: sp(2.5), fontSize: rem(0.84), fontStyle: "italic", color: theme.ink3 }}>
            <span style={{ marginRight: sp(1), fontStyle: "normal" }}>†</span>
            {inf.footnote}
          </div>
        </div>
      </div>
    </div>
  );
};
