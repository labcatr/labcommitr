/**
 * Custom Color Palette
 *
 * Provides bright, energetic colors using ANSI 256-color codes
 * for a modern, high-contrast CLI experience.
 *
 * Design Philosophy:
 * - Vibrant but readable
 * - Positive energy with warm, inviting tones
 * - High contrast for easy scanning
 * - Consistent visual hierarchy
 */

/**
 * Bright background colors for step labels
 * Uses ANSI 256-color palette for vibrant, saturated colors
 * Text is black (30m) for maximum contrast
 */
export const labelColors = {
  /**
   * Bright Magenta - Vibrant, energetic, attention-grabbing
   * Perfect for the first step (preset selection)
   */
  bgBrightMagenta: (text: string) => `\x1b[48;5;201m\x1b[30m${text}\x1b[0m`,

  /**
   * Bright Cyan - Fresh, modern, tech-forward
   * Great for emoji and next steps
   */
  bgBrightCyan: (text: string) => `\x1b[48;5;51m\x1b[30m${text}\x1b[0m`,

  /**
   * Bright Blue - Clear, professional, confident
   * Ideal for scope and types configuration
   */
  bgBrightBlue: (text: string) => `\x1b[48;5;39m\x1b[30m${text}\x1b[0m`,

  /**
   * Bright Yellow - Attention-grabbing, action-oriented
   * Perfect for call-to-action (next steps)
   */
  bgBrightYellow: (text: string) => `\x1b[48;5;226m\x1b[30m${text}\x1b[0m`,

  /**
   * Bright Green - Success, completion, positive
   * Excellent for config result and success messages
   */
  bgBrightGreen: (text: string) => `\x1b[48;5;46m\x1b[30m${text}\x1b[0m`,
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
