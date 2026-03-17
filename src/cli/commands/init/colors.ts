/**
 * Custom Color Palette
 *
 * Provides cool-toned, high-contrast colors using ANSI 256-color codes
 * for a modern, professional CLI experience.
 *
 * Design Philosophy:
 * - Cool-toned palette (indigo, teal, navy, slate, jade)
 * - Deep, saturated backgrounds for excellent white text contrast
 * - WCAG AA+ contrast ratios with bright white foreground
 * - Visually distinct labels for easy scanning
 */

/**
 * Distinct background colors for step labels
 * Each label uses a unique ANSI 256-color for visual distinction.
 * Text is bright white (97m) for readability on deep backgrounds.
 *
 * | Name    | ANSI 256 | Hex     | Description    |
 * |---------|----------|---------|----------------|
 * | magenta | 55       | #5f00af | Deep Indigo    |
 * | cyan    | 30       | #008787 | Deep Teal      |
 * | blue    | 25       | #005faf | Deep Navy      |
 * | yellow  | 61       | #5f5faf | Slate Blue     |
 * | green   | 29       | #00875f | Deep Jade      |
 */
export const labelColors = {
  bgBrightMagenta: (text: string) => `\x1b[48;5;55m\x1b[97m${text}\x1b[0m`,
  bgBrightCyan: (text: string) => `\x1b[48;5;30m\x1b[97m${text}\x1b[0m`,
  bgBrightBlue: (text: string) => `\x1b[48;5;25m\x1b[97m${text}\x1b[0m`,
  bgBrightYellow: (text: string) => `\x1b[48;5;61m\x1b[97m${text}\x1b[0m`,
  bgBrightGreen: (text: string) => `\x1b[48;5;29m\x1b[97m${text}\x1b[0m`,
};

/**
 * Bright foreground colors for text
 * High visibility, energetic tones
 */
export const textColors = {
  /**
   * Bright Cyan - Clear, friendly, welcoming
   * Perfect for intro text and informational content
   */
  brightCyan: (text: string) => `\x1b[38;5;51m${text}\x1b[0m`,

  /**
   * Bright Green - Celebratory, positive, success
   * Ideal for completion messages and success indicators
   */
  brightGreen: (text: string) => `\x1b[38;5;46m${text}\x1b[0m`,

  /**
   * Bright Yellow - Active, processing, attention
   * Great for processing messages and highlights
   */
  brightYellow: (text: string) => `\x1b[38;5;226m${text}\x1b[0m`,

  /**
   * Bright Magenta - Emphasis, important, highlight
   * Perfect for filenames and key information
   */
  brightMagenta: (text: string) => `\x1b[38;5;201m${text}\x1b[0m`,

  /**
   * Bright White - Maximum visibility, bold statements
   * Excellent for headings and important text
   */
  brightWhite: (text: string) => `\x1b[38;5;231m${text}\x1b[0m`,

  /**
   * Normal White - Clean, neutral, readable
   * Perfect for intro/outro messages (normal weight, not bold)
   */
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,

  /**
   * Pure White (#FFF) - Maximum brightness, perfect white
   * For typed message text that needs to be crystal clear
   */
  pureWhite: (text: string) => `\x1b[38;5;231m${text}\x1b[0m`,

  /**
   * Label Blue (#547fef) - Character name/speaker label color
   * Perfect for "Clef:" label
   */
  labelBlue: (text: string) => `\x1b[38;5;75m${text}\x1b[0m`,

  /**
   * Tuxedo Cat Colors - For Clef's tuxedo pattern
   */
  // Dark grey (visible on dark terminals) - ears outer, body sides, legs
  tuxBlack: (text: string) => `\x1b[38;5;236m${text}\x1b[0m`,
  // Near-white for bib/face
  tuxWhite: (text: string) => `\x1b[38;5;255m${text}\x1b[0m`,
  // Pink for nose (^)
  tuxPink: (text: string) => `\x1b[38;5;218m${text}\x1b[0m`,
  // Green for eyes (o)
  tuxGreen: (text: string) => `\x1b[38;5;120m${text}\x1b[0m`,

  /**
   * Git Status Colors — Cool-toned, readable on dark backgrounds
   *
   * | Status   | ANSI 256 | Hex     | Description      |
   * |----------|----------|---------|------------------|
   * | Added    | 114      | #87d787 | Cool sage green  |
   * | Modified | 110      | #87afd7 | Steel blue       |
   * | Deleted  | 174      | #d78787 | Muted rose       |
   * | Renamed  | 80       | #5fd7d7 | Cool aqua        |
   * | Copied   | 141      | #af87ff | Cool violet      |
   */
  // Added (A) - Cool sage green
  gitAdded: (text: string) => `\x1b[38;5;114m${text}\x1b[0m`,

  // Modified (M) - Steel blue
  gitModified: (text: string) => `\x1b[38;5;110m${text}\x1b[0m`,

  // Deleted (D) - Muted rose
  gitDeleted: (text: string) => `\x1b[38;5;174m${text}\x1b[0m`,

  // Renamed (R) - Cool aqua
  gitRenamed: (text: string) => `\x1b[38;5;80m${text}\x1b[0m`,

  // Copied (C) - Cool violet
  gitCopied: (text: string) => `\x1b[38;5;141m${text}\x1b[0m`,
};

/**
 * Text modifiers
 */
export const modifiers = {
  /**
   * Bold text for emphasis
   */
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,

  /**
   * Combine bold with color
   */
  boldColor: (text: string, colorFn: (s: string) => string) =>
    `\x1b[1m${colorFn(text)}\x1b[22m\x1b[0m`,
};

/**
 * Convenience function: Bold + Bright Green (success messages)
 */
export const success = (text: string) =>
  modifiers.boldColor(text, textColors.brightGreen);

/**
 * Convenience function: Bold + Bright Cyan (friendly messages)
 */
export const info = (text: string) =>
  modifiers.boldColor(text, textColors.brightCyan);

/**
 * Convenience function: Bold + Bright Yellow (attention/action)
 */
export const attention = (text: string) =>
  modifiers.boldColor(text, textColors.brightYellow);

/**
 * Convenience function: Bold + Bright Magenta (highlight/important)
 */
export const highlight = (text: string) =>
  modifiers.boldColor(text, textColors.brightMagenta);
