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
  private currentX: number = 0;

  // Raw ASCII art frames (unprocessed)
  private readonly rawFrames = {
    standing: `  /\\_/\\  \n ( ^.^ ) \n /|   | \n(|_   |_)`,
    walk1: `  /\\_/\\  \n ( ^.^ ) \n /|   |\\ \n(_|   _|)`,
    walk2: `  /\\_/\\  \n ( ^.^ ) \n /|   |\\ \n(|_   |_)`,
    typing: `  /\\_/\\  \n ( -.- ) \n /|⌨ | \n(_|__|_)`,
    celebrate: `  /\\_/\\  \n ( ^ω^ ) \n  | |   \n/   \\ `,
    waving: `  /\\_/\\  \n ( ^.^ )~ \n /|   | \n(|_   |_)`,
  };

  // Normalized frames (uniform dimensions)
  private frames!: typeof this.rawFrames;

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
   * Normalize all frames to uniform width and height
   * Ensures consistent alignment across all animation frames
   * Critical for terminal compatibility with different fonts/dimensions
   */
  private normalizeFrames(): void {
    // Find maximum width across all frames
    const allLines = Object.values(this.rawFrames).flatMap((frame: string) =>
      frame.split("\n"),
    );
    this.frameWidth = Math.max(...allLines.map((line: string) => line.length));

    // Find maximum height across all frames
    this.frameHeight = Math.max(
      ...Object.values(this.rawFrames).map(
        (frame: string) => frame.split("\n").length,
      ),
    );

    // Normalize each frame to maximum dimensions
    const keyedFrames: Partial<typeof this.rawFrames> = {};
    (Object.keys(this.rawFrames) as Array<keyof typeof this.rawFrames>).forEach(
      (key) => {
        const lines = this.rawFrames[key].split("\n");
        const normalized = lines.map((line: string) =>
          line.padEnd(this.frameWidth, " "),
        );
        // Pad height if necessary
        while (normalized.length < this.frameHeight) {
          normalized.push(" ".repeat(this.frameWidth));
        }
        keyedFrames[key] = normalized.join("\n");
      },
    );
    this.frames = keyedFrames as typeof this.rawFrames;
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
   * Render ASCII art frame at specific horizontal position
   * Uses absolute cursor positioning for each line
   * Adds 1 line of padding above the cat (starts at line 2)
   */
  private renderFrame(frame: string, x: number): void {
    const lines = frame.split("\n");
    lines.forEach((line, idx) => {
      // Move cursor to position (row, column)
      // Start at line 2 (1 line padding above)
      process.stdout.write(`\x1B[${idx + 2};${x}H`);
      // Make cat white for better visibility
      process.stdout.write(textColors.pureWhite(line));
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
   * Continues until shouldContinue callback returns false
   */
  private async animateLegs(
    x: number,
    shouldContinue: () => boolean,
  ): Promise<void> {
    const frames = [this.frames.walk1, this.frames.walk2];
    let frameIndex = 0;

    while (shouldContinue()) {
      this.renderFrame(frames[frameIndex % 2], x);
      frameIndex++;
      await sleep(200); // Leg animation speed
    }
  }

  /**
   * Fade out cat Houston-style
   * Erases cat from bottom to top for smooth disappearance
   */
  private async fadeOut(x: number): Promise<void> {
    const catLines = this.frames.standing.split("\n");

    // Erase from bottom to top
    // Cat starts at line 2 (1 line padding), so fade from line 5 to line 2
    for (let i = catLines.length - 1; i >= 0; i--) {
      process.stdout.write(`\x1B[${2 + i};${x}H`);
      process.stdout.write(" ".repeat(20)); // Clear line with spaces
      await sleep(80);
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

    const frames = [this.frames.walk1, this.frames.walk2];
    const steps = 15;
    const delay = duration / steps;

    this.hideCursor();

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentX = Math.floor(startX + (endX - startX) * progress);

      this.clearScreen();
      this.renderFrame(frames[i % 2], currentX);

      await sleep(delay);
    }

    this.showCursor();
    this.currentX = endX;
  }

  /**
   * Introduction sequence
   * Cat appears stationary with animated legs, text types beside it
   * Houston-style: text types out, clears, new text types, then fades
   * Duration: approximately 5 seconds
   */
  async intro(): Promise<void> {
    if (!this.caps.supportsAnimation) {
      // Static fallback for non-TTY environments
      console.log(this.frames.standing);
      console.log("Hey there! My name is Clef!");
      console.log("Let me help you get started...meoww!\n");
      await sleep(2000);
      return;
    }

    this.hideCursor();
    this.clearScreen();

    const catX = 1; // Start at column 1 (adds 1 column of left padding)
    const textX = catX + this.frameWidth + 1; // 1 space padding after normalized frame
    const labelY = 3; // Line 2 of cat output - label "Clef:"
    const messageY = 4; // Line 3 of cat output - message text

    // Messages to type
    const messages = [
      "Hey there! My name is Clef!",
      "Let me help you get started...meoww!",
    ];

    // Start leg animation in background (non-blocking)
    let isAnimating = true;
    const animationPromise = this.animateLegs(catX, () => isAnimating);

    // Write static label "Clef:" in blue
    process.stdout.write(`\x1B[${labelY};${textX}H`);
    process.stdout.write(textColors.labelBlue("Clef: "));

    // Type first message on line below
    await this.typeText(messages[0], textX, messageY);
    await sleep(1000);

    // Clear message only (keep label)
    this.clearLine(messageY, textX);
    await sleep(300);

    // Type second message
    await this.typeText(messages[1], textX, messageY);
    await sleep(1200);

    // Stop leg animation
    isAnimating = false;
    await animationPromise;

    // Fade out cat Houston-style
    await this.fadeOut(catX);

    // Small pause before clearing
    await sleep(200);

    // Clear screen for prompts
    this.clearScreen();
    this.showCursor();
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

    // Show typing animation
    this.clearScreen();
    console.log(this.frames.typing);
    console.log(`      ${attention(message)}`);

    // Execute actual task
    await task();

    await sleep(500);

    // Walk off to right
    await this.walk(10, this.caps.terminalWidth, 800);

    // Complete clear
    this.clearScreen();
  }

  /**
   * Outro sequence
   * Cat and text display side by side using normal console output
   * Astro Houston-style: stays on screen as final message (no clear, no walk off)
   * Duration: approximately 2 seconds
   */
  async outro(): Promise<void> {
    if (!this.caps.supportsAnimation) {
      // Static fallback
      console.log(this.frames.waving);
      console.log("You're all set! Happy committing!");
      return; // No clear - message stays visible
    }

    // Add spacing before outro
    console.log();

    // Display cat and text side by side
    // Cat on left, "Clef:" label and message on right
    const catLines = this.frames.waving.split("\n");
    const catX = 1; // Start at column 1 (adds 1 column of left padding)
    const textX = catX + this.frameWidth + 1; // 1 space padding after cat

    // Display cat lines with label/message beside appropriate lines
    for (let i = 0; i < catLines.length; i++) {
      if (i === 1) {
        // Line 1: Face line - display "Clef:" label
        console.log(
          textColors.pureWhite(catLines[i]) +
            "  " +
            textColors.labelBlue("Clef:"),
        );
      } else if (i === 2) {
        // Line 2: Body line - display message text
        console.log(
          textColors.pureWhite(catLines[i]) +
            "  " +
            textColors.pureWhite("You're all set! Happy committing!"),
        );
      } else {
        // Other lines: just the cat in white
        console.log(textColors.pureWhite(catLines[i]));
      }
    }

    console.log(); // Extra line at end

    // Small pause to let user see the message
    await sleep(1500);

    // Done - cat and message remain visible (no clear, no cursor hide)
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
