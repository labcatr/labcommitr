/**
 * GPG Capabilities Detection and Setup
 *
 * Provides centralized GPG detection, package manager detection,
 * and configuration utilities for commit signing setup.
 *
 * Detection Flow:
 * 1. Check if GPG is installed (gpg --version)
 * 2. Check for existing signing keys (gpg --list-secret-keys)
 * 3. Check if Git is configured for signing (git config user.signingkey)
 * 4. Determine overall capability state
 */

import { spawnSync } from "child_process";
import { platform } from "os";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * GPG capability states representing the user's signing readiness
 */
export type GpgState =
  | "fully_configured" // GPG + keys + Git configured
  | "partial_config" // GPG + keys, Git not configured
  | "no_keys" // GPG installed, no keys
  | "not_installed"; // GPG not found

/**
 * Detailed GPG capabilities information
 */
export interface GpgCapabilities {
  state: GpgState;
  gpgInstalled: boolean;
  gpgVersion: string | null;
  keysExist: boolean;
  keyId: string | null;
  keyEmail: string | null;
  gitConfigured: boolean;
  gitSigningKey: string | null;
}

/**
 * Supported package managers for GPG installation
 */
export type PackageManager =
  | "brew" // macOS
  | "apt" // Debian/Ubuntu
  | "dnf" // Fedora/RHEL
  | "pacman" // Arch
  | "winget" // Windows 10+
  | "choco" // Windows (Chocolatey)
  | null; // None detected

/**
 * Platform-specific installation information
 */
export interface PlatformInfo {
  os: "darwin" | "linux" | "win32" | "unknown";
  packageManager: PackageManager;
  installCommand: string | null;
  manualInstallUrl: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Install commands for each package manager
 */
const INSTALL_COMMANDS: Record<Exclude<PackageManager, null>, string> = {
  brew: "brew install gnupg",
  apt: "sudo apt-get install gnupg",
  dnf: "sudo dnf install gnupg2",
  pacman: "sudo pacman -S gnupg",
  winget: "winget install GnuPG.GnuPG",
  choco: "choco install gnupg",
};

/**
 * Manual installation URL for GPG
 */
const MANUAL_INSTALL_URL = "https://gnupg.org/download/";

/**
 * Timeout for detection commands (5 seconds)
 */
const DETECTION_TIMEOUT = 5000;

/**
 * Timeout for key generation (2 minutes)
 */
const KEY_GENERATION_TIMEOUT = 120000;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute a command and return the result
 * Uses spawnSync with timeout for safety
 */
function execCommand(
  command: string,
  args: string[],
  timeout: number = DETECTION_TIMEOUT,
): { success: boolean; output: string; stderr: string } {
  try {
    const result = spawnSync(command, args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });

    if (result.error) {
      return { success: false, output: "", stderr: result.error.message };
    }

    return {
      success: result.status === 0,
      output: result.stdout?.toString().trim() || "",
      stderr: result.stderr?.toString().trim() || "",
    };
  } catch {
    return { success: false, output: "", stderr: "Command execution failed" };
  }
}

/**
 * Check if a command exists on the system
 * Uses platform-specific detection method
 */
function commandExists(command: string): boolean {
  const os = platform();

  if (os === "win32") {
    // Windows: use 'where' command
    const result = execCommand("where", [command]);
    return result.success;
  } else {
    // Unix-like: use 'command -v' via shell
    const result = spawnSync("sh", ["-c", `command -v ${command}`], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: DETECTION_TIMEOUT,
    });
    return result.status === 0;
  }
}

// ============================================================================
// GPG Detection Functions
// ============================================================================

/**
 * Detect GPG installation and version
 */
function detectGpgInstallation(): { installed: boolean; version: string | null } {
  const result = execCommand("gpg", ["--version"]);

  if (!result.success) {
    return { installed: false, version: null };
  }

  // Parse version from first line: "gpg (GnuPG) 2.2.41" or "gpg (GnuPG/MacGPG2) 2.2.41"
  const firstLine = result.output.split("\n")[0] || "";
  const versionMatch = firstLine.match(/(\d+\.\d+\.\d+)/);
  const version = versionMatch ? versionMatch[1] : null;

  return { installed: true, version };
}

/**
 * Detect existing GPG signing keys
 */
function detectGpgKeys(): {
  keysExist: boolean;
  keyId: string | null;
  keyEmail: string | null;
} {
  const result = execCommand("gpg", [
    "--list-secret-keys",
    "--keyid-format",
    "LONG",
  ]);

  if (!result.success || !result.output) {
    return { keysExist: false, keyId: null, keyEmail: null };
  }

  // Parse key ID from "sec" line: "sec   rsa4096/AF08DCD261E298CB 2024-11-16"
  const secMatch = result.output.match(/sec\s+\w+\/([A-F0-9]+)/i);
  const keyId = secMatch ? secMatch[1] : null;

  // Parse email from "uid" line: "uid                 [ultimate] Name <email@example.com>"
  const uidMatch = result.output.match(/uid\s+.*<([^>]+)>/);
  const keyEmail = uidMatch ? uidMatch[1] : null;

  return {
    keysExist: !!keyId,
    keyId,
    keyEmail,
  };
}

/**
 * Check if Git is configured for commit signing
 */
function detectGitSigningConfig(): {
  configured: boolean;
  signingKey: string | null;
} {
  const result = execCommand("git", ["config", "--get", "user.signingkey"]);

  if (!result.success || !result.output) {
    return { configured: false, signingKey: null };
  }

  return {
    configured: true,
    signingKey: result.output,
  };
}

/**
 * Detect complete GPG capabilities
 * Main entry point for GPG detection
 */
export function detectGpgCapabilities(): GpgCapabilities {
  // Step 1: Check GPG installation
  const gpgInstall = detectGpgInstallation();

  if (!gpgInstall.installed) {
    return {
      state: "not_installed",
      gpgInstalled: false,
      gpgVersion: null,
      keysExist: false,
      keyId: null,
      keyEmail: null,
      gitConfigured: false,
      gitSigningKey: null,
    };
  }

  // Step 2: Check for signing keys
  const keys = detectGpgKeys();

  if (!keys.keysExist) {
    return {
      state: "no_keys",
      gpgInstalled: true,
      gpgVersion: gpgInstall.version,
      keysExist: false,
      keyId: null,
      keyEmail: null,
      gitConfigured: false,
      gitSigningKey: null,
    };
  }

  // Step 3: Check Git configuration
  const gitConfig = detectGitSigningConfig();

  if (!gitConfig.configured) {
    return {
      state: "partial_config",
      gpgInstalled: true,
      gpgVersion: gpgInstall.version,
      keysExist: true,
      keyId: keys.keyId,
      keyEmail: keys.keyEmail,
      gitConfigured: false,
      gitSigningKey: null,
    };
  }

  // Fully configured
  return {
    state: "fully_configured",
    gpgInstalled: true,
    gpgVersion: gpgInstall.version,
    keysExist: true,
    keyId: keys.keyId,
    keyEmail: keys.keyEmail,
    gitConfigured: true,
    gitSigningKey: gitConfig.signingKey,
  };
}

// ============================================================================
// Package Manager Detection
// ============================================================================

/**
 * Detect available package manager for GPG installation
 */
export function detectPackageManager(): PlatformInfo {
  const os = platform();
  const manualInstallUrl = MANUAL_INSTALL_URL;

  // Map Node.js platform to our OS type
  let detectedOs: PlatformInfo["os"];
  switch (os) {
    case "darwin":
      detectedOs = "darwin";
      break;
    case "linux":
      detectedOs = "linux";
      break;
    case "win32":
      detectedOs = "win32";
      break;
    default:
      detectedOs = "unknown";
  }

  // Detect package manager based on platform
  let packageManager: PackageManager = null;

  switch (detectedOs) {
    case "darwin":
      // macOS: check for Homebrew
      if (commandExists("brew")) {
        packageManager = "brew";
      }
      break;

    case "linux":
      // Linux: check in order of popularity
      if (commandExists("apt-get")) {
        packageManager = "apt";
      } else if (commandExists("dnf")) {
        packageManager = "dnf";
      } else if (commandExists("pacman")) {
        packageManager = "pacman";
      }
      break;

    case "win32":
      // Windows: check winget first (built-in on Windows 10+), then Chocolatey
      if (commandExists("winget")) {
        packageManager = "winget";
      } else if (commandExists("choco")) {
        packageManager = "choco";
      }
      break;
  }

  // Get install command if package manager found
  const installCommand = packageManager
    ? INSTALL_COMMANDS[packageManager]
    : null;

  return {
    os: detectedOs,
    packageManager,
    installCommand,
    manualInstallUrl,
  };
}

// ============================================================================
// GPG Configuration Functions
// ============================================================================

/**
 * Configure Git to use a specific GPG key for signing
 * Sets both user.signingkey and commit.gpgsign globally
 */
export function configureGitSigning(keyId: string): boolean {
  // Set the signing key
  const keyResult = execCommand("git", [
    "config",
    "--global",
    "user.signingkey",
    keyId,
  ]);

  if (!keyResult.success) {
    return false;
  }

  // Enable commit signing by default
  const signResult = execCommand("git", [
    "config",
    "--global",
    "commit.gpgsign",
    "true",
  ]);

  return signResult.success;
}

/**
 * Generate a new GPG key using the user's Git identity
 * Uses gpg --quick-generate-key for non-interactive generation
 */
export async function generateGpgKey(): Promise<boolean> {
  // Get user info from Git config
  const nameResult = execCommand("git", ["config", "--get", "user.name"]);
  const emailResult = execCommand("git", ["config", "--get", "user.email"]);

  const name = nameResult.output.trim();
  const email = emailResult.output.trim();

  if (!name || !email) {
    console.error("\n  Git user.name and user.email must be configured first.");
    console.error('  Run: git config --global user.name "Your Name"');
    console.error('       git config --global user.email "you@example.com"');
    return false;
  }

  console.log(`\n  Generating GPG key for: ${name} <${email}>`);
  console.log("  This may take a moment...\n");

  // Use gpg --quick-generate-key for non-interactive generation
  // RSA 4096-bit key, sign-only capability, expires in 2 years
  const result = spawnSync(
    "gpg",
    [
      "--batch",
      "--quick-generate-key",
      `${name} <${email}>`,
      "rsa4096",
      "sign",
      "2y",
    ],
    {
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"], // inherit stdin for passphrase
      timeout: KEY_GENERATION_TIMEOUT,
    },
  );

  if (result.status === 0) {
    console.log("  GPG key generated successfully!\n");
    return true;
  } else {
    const errorMsg = result.stderr?.toString().trim() || "Unknown error";
    console.error(`\n  Failed to generate GPG key: ${errorMsg}\n`);
    return false;
  }
}

/**
 * Test if GPG signing actually works with the configured key
 * Useful for verifying the setup is complete
 */
export function testGpgSigning(keyId: string): boolean {
  // Create a test signature
  const result = spawnSync(
    "gpg",
    ["--batch", "--yes", "--clearsign", "--default-key", keyId],
    {
      input: "test",
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: DETECTION_TIMEOUT,
    },
  );

  return result.status === 0;
}
