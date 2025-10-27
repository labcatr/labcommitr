/**
 * Version utilities
 *
 * Utilities for retrieving and displaying version information.
 * Provides consistent version formatting across the CLI.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Get package version from package.json
 * @returns Version string (e.g., "0.0.1")
 */
export function getVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, '../../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

/**
 * Get full version info (name + version)
 * @returns Full version string (e.g., "@labcatr/labcommitr v0.0.1")
 */
export function getFullVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, '../../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return `${packageJson.name} v${packageJson.version}`;
}

