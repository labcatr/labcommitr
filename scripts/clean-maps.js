#!/usr/bin/env node

/**
 * Remove all .map files from dist directory
 * Cross-platform solution for cleaning source maps before publishing
 */

import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";

async function removeMaps(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await removeMaps(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".map")) {
        await unlink(fullPath);
        console.log(`Removed: ${fullPath}`);
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

const distDir = join(process.cwd(), "dist");
removeMaps(distDir).catch((error) => {
  console.error("Error removing source maps:", error);
  process.exit(1);
});
