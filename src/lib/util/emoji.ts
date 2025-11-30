/**
 * Emoji Detection and Display Utilities
 *
 * Provides terminal emoji support detection and emoji stripping
 * functionality for clean display on non-emoji terminals.
 *
 * Industry Standard Approach:
 * - Always store Unicode emojis in Git commits
 * - Strip emojis from Labcommitr's UI display when terminal doesn't support them
 * - This ensures GitHub and emoji-capable terminals show emojis correctly
 */

import { platform } from "os";

/**
 * Detects whether the current terminal supports emoji display
 *
 * Uses industry-standard heuristics:
 * - Disable in CI environments (CI=true)
 * - Disable for dumb terminals (TERM=dumb)
 * - Disable on older Windows terminals
 * - Check for NO_COLOR environment variable
 * - Allow user override via FORCE_EMOJI_DETECTION
 *
 * @returns Whether emojis should be displayed in the terminal
 */
export function detectEmojiSupport(): boolean {
  // User override (highest priority)
  const forceDetection = process.env.FORCE_EMOJI_DETECTION;
  if (forceDetection !== undefined) {
    return forceDetection.toLowerCase() === "true" || forceDetection === "1";
  }

  // NO_COLOR standard (https://no-color.org/)
  if (process.env.NO_COLOR) {
    return false;
  }

  // CI environments typically don't support emojis well
  if (process.env.CI === "true" || process.env.CI === "1") {
    return false;
  }

  // Dumb terminals don't support emojis
  const term = process.env.TERM;
  if (term === "dumb" || term === "unknown") {
    return false;
  }

  // Windows terminal detection
  const isWindows = platform() === "win32";
  if (isWindows) {
    // Modern Windows Terminal (10+) supports emojis
    // Older cmd.exe and PowerShell may not
    // Check for Windows Terminal specific environment variables
    const wtSession = process.env.WT_SESSION;
    if (wtSession) {
      // Windows Terminal detected - supports emojis
      return true;
    }

    // Check for ConEmu or other modern terminals
    const conEmu = process.env.CONEMUANSI;
    if (conEmu === "ON") {
      return true;
    }

    // For older Windows terminals, be conservative
    // Check if we're in a TTY (interactive terminal)
    if (!process.stdout.isTTY) {
      return false;
    }

    // Default to false for older Windows (can be overridden by FORCE_EMOJI_DETECTION)
    return false;
  }

  // Unix-like systems: check TERM variable
  // Most modern terminals support emojis
  if (term) {
    // Known non-emoji terminals
    const nonEmojiTerms = ["linux", "vt100", "vt220", "xterm-mono"];
    if (nonEmojiTerms.includes(term.toLowerCase())) {
      return false;
    }

    // Modern terminals typically support emojis
    // xterm-256color, screen-256color, tmux-256color, etc.
    return true;
  }

  // Default: assume emoji support if we have a TTY
  return process.stdout.isTTY === true;
}

/**
 * Strips Unicode emojis from a string for display on non-emoji terminals
 *
 * Uses Unicode emoji pattern matching to remove emoji characters
 * while preserving the rest of the text.
 *
 * @param text - Text that may contain emojis
 * @returns Text with emojis removed
 */
export function stripEmojis(text: string): string {
  // Unicode emoji pattern matching
  // Matches emoji characters including:
  // - Emoticons (😀-🙏)
  // - Symbols & Pictographs (🌀-🗿)
  // - Transport & Map Symbols (🚀-🛿)
  // - Flags (country flags)
  // - Regional indicators
  // - Variation selectors
  const emojiPattern =
    /[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}]/gu;

  return text.replace(emojiPattern, "").trim();
}

/**
 * Conditionally strips emojis from text based on terminal support
 *
 * If terminal supports emojis, returns original text.
 * If terminal doesn't support emojis, returns text with emojis stripped.
 *
 * @param text - Text that may contain emojis
 * @param terminalSupportsEmojis - Whether terminal supports emoji display
 * @returns Text with emojis conditionally stripped
 */
export function formatForDisplay(
  text: string,
  terminalSupportsEmojis: boolean,
): string {
  if (terminalSupportsEmojis) {
    return text;
  }
  return stripEmojis(text);
}

