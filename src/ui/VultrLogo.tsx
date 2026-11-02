// The slot for the OFFICIAL Vultr logo. The film never redraws it: save the official white or monochrome SVG as
// public/brand/vultr-logo.svg and run `npm run assets`, which records the file in public/brand/manifest.json.
//
// Whether the logo exists is decided from that generated manifest, imported at build time. Nothing here touches the
// network or the file system while a frame renders. If the logo is absent, a plain text "Vultr" wordmark in the body
// font is drawn instead, and ONE warning is logged.
import React from "react";
import { Img, staticFile } from "remotion";
import { fonts, theme } from "../config/theme";
import manifestJson from "../../public/brand/manifest.json";

interface BrandManifest {
  vultrLogo: boolean;
  vultrLogoFile: string;
}

const manifest = manifestJson as BrandManifest;

/** True when public/brand/manifest.json says the official logo file is installed. */
export const hasVultrLogo: boolean = manifest.vultrLogo === true;

let warned = false;
function warnOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    `[minilocker-film] public/brand/${manifest.vultrLogoFile} is not installed (per public/brand/manifest.json), ` +
      `so a plain text "Vultr" wordmark is shown. Save the official Vultr logo there and run "npm run assets".`,
  );
}

export interface VultrLogoProps {
  /** Height in px. The logo keeps its own aspect ratio. */
  height: number;
  /** 0..1 */
  opacity?: number;
}

export const VultrLogo: React.FC<VultrLogoProps> = ({ height, opacity = 1 }) => {
  if (hasVultrLogo) {
    return (
      <Img
        src={staticFile(`brand/${manifest.vultrLogoFile}`)}
        alt="Vultr"
        style={{ height, width: "auto", display: "block", opacity }}
      />
    );
  }
  warnOnce();
  return (
    <span
      role="img"
      aria-label="Vultr"
      style={{
        display: "inline-block",
        height,
        lineHeight: `${height}px`,
        fontFamily: fonts.serif,
        fontWeight: 700,
        fontSize: Math.round(height * 0.82),
        letterSpacing: "-0.012em",
        color: theme.ink,
        opacity,
        whiteSpace: "nowrap",
      }}
    >
      Vultr
    </span>
  );
};
