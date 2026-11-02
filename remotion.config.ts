import { Config } from "@remotion/cli/config";

// Render defaults for the whole film. scripts/render.mjs adds codec, audio and loudness on top.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
