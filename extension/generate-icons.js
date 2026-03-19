#!/usr/bin/env node
/*
 * Generates simple placeholder PNG icons for the extension.
 * Run this once: node generate-icons.js
 * Replace the output files with your real logo before publishing.
 *
 * Requires: npm install canvas  (or use any image editor to create 16/48/128px PNGs)
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, "icons");

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

sizes.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background: WhatsApp green
  ctx.fillStyle = "#25D366";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Letter "C" for CRM
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(size * 0.6)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("C", size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(outputDir, `icon${size}.png`), buffer);
  console.log(`Created icons/icon${size}.png`);
});
