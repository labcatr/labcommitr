/**
 * Clef the Cat - Animated CLI Mascot
 *
 * Provides animated character that appears at key moments during
 * the initialization flow. Uses ANSI escape codes for terminal
 * control and animation effects.
 *
 * Appearance pattern:
 * - Intro: Walks in, introduces tool, walks off
 * - Processing: Appears during config generation
 * - Outro: Celebrates completion and exits
 *
 * Gracefully degrades to static display in non-TTY environments.
 */

import { setTimeout as sleep } from "timers/promises";
import { textColors, success, attention } from "./colors.js";

/** Color map keys for tuxedo coloring */
type ColorKey = "B" | "W" | "P" | "G" | " ";

/** Maps color key to its color function */
const COLOR_MAP: Record<ColorKey, ((text: string) => string) | null> = {
  B: textColors.tuxBlack,
  W: textColors.tuxWhite,
  P: textColors.tuxPink,
  G: textColors.tuxGreen,
  " ": null, // no color — use pureWhite
};

interface AnimationCapabilities {
  supportsAnimation: boolean;
  supportsColor: boolean;
  terminalWidth: number;
  terminalHeight: number;
}

/**
 * Clef mascot controller
 * Manages all animation sequences and terminal interactions
 */
class Clef {
  private caps: AnimationCapabilities;

  // Raw ASCII art frames — 11 chars wide x 5 lines tall
  private readonly rawFrames = {
    standing: `  /\\_/\\\n ( o.o )\n  > ^ <\n /|   |\\\n(_|   |_)`,
    walk1: `  /\\_/\\\n ( o.o )\n  > ^ <\n /|   |\\\n( |   _|)`,
    walk2: `  /\\_/\\\n ( o.o )\n  > ^ <\n /|   |\\\n(_|   | )`,
    typing: `  /\\_/\\\n ( -.- )\n  > ^ <\n /|[=]|\\\n(_|___|_)`,
    celebrate: `  /\\_/\\\n ( ^w^ )\n  > ^ <\n \\|   |/\n / \\ / \\`,
    waving: `  /\\_/\\\n ( o.o )~\n  > ^ <\n /|   |\\\n(_|   |_)`,
    earL: `  /\\_ \\\n ( o.o )\n  > ^ <\n /|   |\\\n(_|   |_)`,
    earR: `  / _/\\\n ( o.o )\n  > ^ <\n /|   |\\\n(_|   |_)`,
    surprised: `  /\\_/\\\n ( O.O )!\n  > ^ <\n /|   |\\\n(_|   |_)`,
  };

  // Parallel color maps — each row must match the exact char count of its frame row
  // B=tuxBlack (ears, body, legs), W=tuxWhite (face, bib), P=tuxPink (nose), G=tuxGreen (eyes)
  // space = pureWhite fallback
  private readonly rawColorMaps: Record<keyof typeof this.rawFrames, string> = {
    standing: `  BBBBB\n W GBG W\n  B P B\n B     B\nBB     BB`,
    walk1: `  BBBBB\n W GBG W\n  B P B\n B     B\nB     B B`,
    walk2: `  BBBBB\n W GBG W\n  B P B\n B     B\nBB      B`,
    typing: `  BBBBB\n W WBW W\n  B P B\n B BBB B\nBB BBB BB`,
    celebrate: `  BBBBB\n W WWW W\n  B P B\n B     B\n B B B B`,
    waving: `  BBBBB\n W GBG WW\n  B P B\n B     B\nBB     BB`,
    earL: `  BBW B\n W GBG W\n  B P B\n B     B\nBB     BB`,
    earR: `  B WBB\n W GBG W\n  B P B\n B     B\nBB     BB`,
    surprised: `  BBBBB\n W GBG WW\n  B P B\n B     B\nBB     BB`,
  };

  // Normalized frames and color maps (uniform dimensions)
  private frames!: Record<string, string>;
  private colorMaps!: Record<string, string>;

  // Frame dimensions after normalization
  private frameWidth = 0;
  private frameHeight = 0;

  constructor() {
    this.caps = this.detectCapabilities();
    this.normalizeFrames(); // Initializes this.frames

    // Debug: Log normalized frame dimensions
    if (process.env.LABCOMMITR_DEBUG) {
      console.log(
        `Normalized frame dimensions: ${this.frameWidth} x ${this.frameHeight}`,
      );
      console.log(
        "Standing frame lines:",
        this.frames.standing
          .split("\n")
          .map((l, i) => `${i}: [${l}] (len=${l.length})`),
      );
    }
  }

  /**
   * Normalize all frames and color maps to uniform width and height
   * Ensures consistent alignment across all animation frames
   */
  private normalizeFrames(): void {
    const allLines = Object.values(this.rawFrames).flatMap((frame: string) =>
      frame.split("\n"),
    );
    this.frameWidth = Math.max(...allLines.map((line: string) => line.length));
    this.frameHeight = Math.max(
      ...Object.values(this.rawFrames).map(
        (frame: string) => frame.split("\n").length,
      ),
    );

    const normalizeString = (raw: string): string => {
      const lines = raw.split("\n");
      const normalized = lines.map((line: string) =>
        line.padEnd(this.frameWidth, " "),
      );
      while (normalized.length < this.frameHeight) {
        normalized.push(" ".repeat(this.frameWidth));
      }
      return normalized.join("\n");
    };

    const keyedFrames: Record<string, string> = {};
    const keyedMaps: Record<string, string> = {};
    const keys = Object.keys(this.rawFrames) as Array<
      keyof typeof this.rawFrames
    >;
    keys.forEach((key) => {
      keyedFrames[key] = normalizeString(this.rawFrames[key]);
      keyedMaps[key] = normalizeString(this.rawColorMaps[key]);
    });
    this.frames = keyedFrames;
    this.colorMaps = keyedMaps;
  }

  /**
   * Detect terminal animation and color support
   * Returns capability object for conditional rendering
   */
  private detectCapabilities(): AnimationCapabilities {
    return {
      supportsAnimation:
        process.stdout.isTTY &&
        process.env.TERM !== "dumb" &&
        !process.env.CI &&
        process.env.NO_COLOR !== "1",
      supportsColor: process.stdout.isTTY && process.env.NO_COLOR !== "1",
      terminalWidth: process.stdout.columns || 80,
      terminalHeight: process.stdout.rows || 24,
    };
  }

  /**
   * Clear entire screen including scrollback buffer
   */
  private clearScreen(): void {
    if (this.caps.supportsAnimation) {
      process.stdout.write("\x1B[2J"); // Clear screen
      process.stdout.write("\x1B[H"); // Move cursor to home
      process.stdout.write("\x1B[3J"); // Clear scrollback
    }
  }

  /**
   * Hide terminal cursor during animations
   */
  private hideCursor(): void {
    if (this.caps.supportsAnimation) {
      process.stdout.write("\x1B[?25l");
    }
  }

  /**
   * Show terminal cursor after animations
   */
  private showCursor(): void {
    if (this.caps.supportsAnimation) {
      process.stdout.write("\x1B[?25h");
    }
  }

  /**
   * Render frame with per-character tuxedo coloring
   * Iterates frame and color map in parallel, applying mapped colors
   * Falls back to pureWhite when color is not supported
   */
  private renderColorizedFrame(frameName: string, x: number): void {
    const frame = this.frames[frameName];
    const cmap = this.colorMaps[frameName];
    if (!frame || !cmap) return;

    const frameLines = frame.split("\n");
    const cmapLines = cmap.split("\n");

    frameLines.forEach((line, idx) => {
      process.stdout.write(`\x1B[${idx + 2};${x}H`);
      const mapLine = cmapLines[idx] || "";
      let colored = "";
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === " ") {
          colored += " ";
          continue;
        }
        if (!this.caps.supportsColor) {
          colored += ch;
          continue;
        }
        const key = (mapLine[i] || " ") as ColorKey;
        const colorFn = COLOR_MAP[key];
        colored += colorFn ? colorFn(ch) : textColors.pureWhite(ch);
      }
      process.stdout.write(colored);
    });
  }

  /**
   * Type text character by character at specific position
   * Creates typewriter effect for introducing Clef
   * Repositions cursor for each character to handle concurrent animations
   */
  private async typeText(
    text: string,
    x: number,
    y: number,
    delay: number = 40,
  ): Promise<void> {
    // Type each character with explicit positioning
    // This ensures text appears correctly even while cat legs animate
    for (let i = 0; i < text.length; i++) {
      // Reposition cursor for each character (handles concurrent animations)
      process.stdout.write(`\x1B[${y};${x + i}H`);
      process.stdout.write(textColors.pureWhite(text[i]));
      await sleep(delay);
    }
  }

  /**
   * Clear a specific line from startX to end of line
   */
  private clearLine(y: number, startX: number): void {
    process.stdout.write(`\x1B[${y};${startX}H`);
    process.stdout.write("\x1B[K"); // Clear from cursor to end of line
  }

  /**
   * Animate legs in place without horizontal movement
   * Uses colorized rendering. Continues until shouldContinue returns false
   */
  private async animateLegs(
    x: number,
    shouldContinue: () => boolean,
  ): Promise<void> {
    const frameNames = ["walk1", "walk2"];
    let frameIndex = 0;

    while (shouldContinue()) {
      this.renderColorizedFrame(frameNames[frameIndex % 2], x);
      frameIndex++;
      await sleep(250);
    }
  }

  /**
   * Fade out cat bottom-to-top
   * Erases each line from bottom to top for smooth disappearance
   */
  private async fadeOut(x: number): Promise<void> {
    for (let i = this.frameHeight - 1; i >= 0; i--) {
      process.stdout.write(`\x1B[${2 + i};${x}H`);
      process.stdout.write(" ".repeat(this.frameWidth + 2));
      await sleep(100);
    }
  }

  /**
   * Animate character walking from start to end position
   * Creates smooth horizontal movement using frame interpolation
   * Used for processing and outro sequences
   */
  private async walk(
    startX: number,
    endX: number,
    duration: number,
  ): Promise<void> {
    if (!this.caps.supportsAnimation) return;

    const frameNames = ["walk1", "walk2"];
    const steps = 15;
    const delay = duration / steps;

    this.hideCursor();
    try {
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentX = Math.floor(startX + (endX - startX) * progress);

        this.clearScreen();
        this.renderColorizedFrame(frameNames[i % 2], currentX);

        await sleep(delay);
      }
    } finally {
      this.showCursor();
    }
  }

  /**
   * Introduction sequence — pop-up with ear twitch
   * 1. Instant appear  2. Ear twitch (600ms)  3. Label + typewriter (700ms)
   * 4. Hold (400ms)  5. Fade-out bottom-to-top (500ms)  6. Clear
   * Duration: ~2.7 seconds
   */
  async intro(): Promise<void> {
    if (!this.caps.supportsAnimation) {
      console.log(this.frames.standing);
      console.log("Clef: Hey there! Let me help you set things up.\n");
      await sleep(1500);
      return;
    }

    this.hideCursor();
    try {
      this.clearScreen();

      const catX = 1;
      const textX = catX + this.frameWidth + 2;
      const labelY = 3;
      const messageY = 4;

      // 1. Instant appear — standing frame with tuxedo coloring
      this.renderColorizedFrame("standing", catX);

      // 2. Ear twitch — 3 frames at 200ms each
      await sleep(200);
      this.renderColorizedFrame("earL", catX);
      await sleep(200);
      this.renderColorizedFrame("earR", catX);
      await sleep(200);
      this.renderColorizedFrame("standing", catX);

      // 3. Label appear
      process.stdout.write(`\x1B[${labelY};${textX}H`);
      process.stdout.write(textColors.labelBlue("Clef:"));

      // 4. Typewriter message with concurrent leg animation
      const message = "Hey there! Let me help you set things up.";
      let isAnimating = true;
      const animationPromise = this.animateLegs(catX, () => isAnimating);

      await this.typeText(message, textX, messageY, 20);

      // 5. Hold
      await sleep(400);

      // Stop leg animation before fade
      isAnimating = false;
      await animationPromise;

      // 6. Fade-out bottom-to-top, also clear text lines
      await this.fadeOut(catX);
      this.clearLine(labelY, textX);
      this.clearLine(messageY, textX);

      await sleep(100);

      // 7. Clear screen for prompts
      this.clearScreen();
    } finally {
      this.showCursor();
    }
  }

  /**
   * Processing sequence
   * Shows character typing while async task executes
   * Duration: depends on task execution time
   */
  async processing(message: string, task: () => Promise<void>): Promise<void> {
    if (!this.caps.supportsAnimation) {
      // Static fallback
      console.log(this.frames.typing);
      console.log(message);
      await task();
      return;
    }

    // Walk in from left
    await this.walk(0, 10, 800);

    // Show typing animation with tuxedo coloring
    this.clearScreen();
    const typingLines = this.frames.typing.split("\n");
    const typingCmap = this.colorMaps.typing.split("\n");
    for (let i = 0; i < typingLines.length; i++) {
      console.log(this.colorizeLineToString(typingLines[i], typingCmap[i]));
    }
    console.log(`      ${attention(message)}`);

    // Execute actual task
    await task();

    await sleep(500);

    // Walk off to right
    await this.walk(10, this.caps.terminalWidth, 800);

    // Complete clear
    this.clearScreen();
  }

  /** Randomized farewell messages for the outro */
  private readonly farewellMessages = [
    "You're all set! Happy committing!",
    "All done! Go ship something great!",
    "Configuration complete! Time to commit!",
  ];

  /**
   * Outro sequence — build-up from bottom + dance + farewell
   * 1. Build-up celebrate frame bottom-to-top (400ms)
   * 2. Dance cycle (600ms)  3. Final waving frame with farewell  4. Hold (1s)
   * Duration: ~2 seconds. Output stays visible.
   */
  async outro(): Promise<void> {
    const farewell =
      this.farewellMessages[
        Math.floor(Math.random() * this.farewellMessages.length)
      ];

    if (!this.caps.supportsAnimation) {
      console.log(this.frames.waving);
      console.log(`Clef: ${farewell}`);
      return;
    }

    console.log(); // spacing after processing steps

    this.hideCursor();
    try {
      // 1. Build-up from bottom — render celebrate frame line-by-line
      //    Print blank lines to reserve space, then use relative cursor movement
      const celebrateLines = this.frames.celebrate.split("\n");
      const celebrateCmap = this.colorMaps.celebrate.split("\n");
      for (let i = 0; i < this.frameHeight; i++) {
        console.log();
      }
      // Move cursor up to top of the reserved area
      process.stdout.write(`\x1B[${this.frameHeight}A`);
      // Save cursor position at top of frame area
      process.stdout.write("\x1B[s");

      // Render from bottom to top
      for (let i = this.frameHeight - 1; i >= 0; i--) {
        // Restore to saved position, then move down i lines
        process.stdout.write("\x1B[u");
        if (i > 0) process.stdout.write(`\x1B[${i}B`);
        process.stdout.write("\r");
        this.writeColorizedLine(celebrateLines[i], celebrateCmap[i]);
        await sleep(100);
      }

      // 2. Quick dance — 3 frames at 200ms using relative positioning
      const danceSequence = ["celebrate", "waving", "waving"];
      for (const frameName of danceSequence) {
        const lines = this.frames[frameName].split("\n");
        const clines = this.colorMaps[frameName].split("\n");
        for (let i = 0; i < this.frameHeight; i++) {
          process.stdout.write("\x1B[u");
          if (i > 0) process.stdout.write(`\x1B[${i}B`);
          process.stdout.write("\r\x1B[K"); // move to col 1 and clear line
          this.writeColorizedLine(lines[i], clines[i]);
        }
        await sleep(200);
      }

      // 3. Clear the dance area and reprint final frame via console.log (persists in scrollback)
      for (let i = 0; i < this.frameHeight; i++) {
        process.stdout.write("\x1B[u");
        if (i > 0) process.stdout.write(`\x1B[${i}B`);
        process.stdout.write("\r\x1B[K");
      }
      // Move cursor back to top of frame area
      process.stdout.write("\x1B[u\r");
    } finally {
      this.showCursor();
    }

    // Print final waving frame with side text via console.log (persists in scrollback)
    const wavingLines = this.frames.waving.split("\n");
    const wavingCmap = this.colorMaps.waving.split("\n");
    for (let i = 0; i < wavingLines.length; i++) {
      let line = this.colorizeLineToString(wavingLines[i], wavingCmap[i]);
      if (i === 1) {
        line += "  " + textColors.labelBlue("Clef:");
      } else if (i === 2) {
        line += "  " + textColors.pureWhite(farewell);
      }
      console.log(line);
    }

    console.log();

    // 4. Hold — let user read the message
    await sleep(1000);
  }

  /**
   * Build a colorized line string from a frame line and its color map line
   */
  private colorizeLineToString(line: string, mapLine: string): string {
    let colored = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === " ") {
        colored += " ";
        continue;
      }
      if (!this.caps.supportsColor) {
        colored += ch;
        continue;
      }
      const key = (mapLine?.[i] || " ") as ColorKey;
      const colorFn = COLOR_MAP[key];
      colored += colorFn ? colorFn(ch) : textColors.pureWhite(ch);
    }
    return colored;
  }

  /** Write a single colorized line to stdout (no newline) */
  private writeColorizedLine(line: string, mapLine: string): void {
    process.stdout.write(this.colorizeLineToString(line, mapLine));
  }

  /** One-line success reaction: cat face + message */
  successReaction(message: string): void {
    if (!this.caps.supportsColor) {
      console.log(`\u2713 ${message}`);
      return;
    }
    console.log(` ( ^w^ )  ${success("\u2713")} ${message}`);
  }

  /** One-line error reaction: cat face + message */
  errorReaction(message: string): void {
    if (!this.caps.supportsColor) {
      console.error(`\u2717 ${message}`);
      return;
    }
    console.error(` ( O.O )  \u2717 ${message}`);
  }

  /** One-line nudge: cat face + hint */
  nudge(message: string): void {
    if (!this.caps.supportsColor) {
      console.log(message);
      return;
    }
    console.log(` ( o.o )  ${message}`);
  }

  /**
   * Stop any running animation
   * Ensures cursor is visible on interrupt
   */
  stop(): void {
    this.showCursor();
  }
}

// Singleton instance for use across init command
export const clef = new Clef();
