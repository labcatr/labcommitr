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
import pc from "picocolors";

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

  // ASCII art frames for different states
  private readonly frames = {
    standing: `       /\\_/\\     \n      ( ^.^ )    \n      /|   |     \n     (_|   |_)   `,
    walk1: `       /\\_/\\     \n      ( ^.^ )    \n      /|   |\\    \n     (_|  _|)   `,
    walk2: `       /\\_/\\     \n      ( ^.^ )    \n      /|   |\\    \n     (|_  |_)   `,
    typing: `       /\\_/\\     \n      ( -.- )    \n      /|⌨ |     \n     (_|_|_)   `,
    celebrate: `       /\\_/\\     \n      ( ^ω^ )    \n       | |       \n      /   \\      `,
    waving: `       /\\_/\\     \n      ( ^.^ )~   \n      /|   |     \n     (_|   |_)   `,
  };

  constructor() {
    this.caps = this.detectCapabilities();
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
   */
  private renderFrame(frame: string, x: number): void {
    const lines = frame.split("\n");
    lines.forEach((line, idx) => {
      // Move cursor to position (row, column)
      process.stdout.write(`\x1B[${idx + 5};${x}H`);
      process.stdout.write(line);
    });
  }

  /**
   * Animate character walking from start to end position
   * Creates smooth horizontal movement using frame interpolation
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
   * Character walks in from left, displays greeting, then exits
   * Duration: approximately 3 seconds
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

    // Walk in from left side
    await this.walk(0, 10, 1000);

    // Display introduction message
    this.clearScreen();
    console.log(this.frames.standing);
    console.log(pc.cyan("      Hey there! My name is Clef!"));
    console.log(pc.cyan("      Let me help you get started...meoww!\n"));

    await sleep(2000);

    // Walk off to right side
    await this.walk(10, this.caps.terminalWidth, 800);

    // Complete clear for next section
    this.clearScreen();
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
    console.log(pc.dim(`      ${message}`));

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
   * Character celebrates completion and waves goodbye
   * Duration: approximately 4 seconds
   */
  async outro(): Promise<void> {
    if (!this.caps.supportsAnimation) {
      // Static fallback
      console.log(this.frames.waving);
      console.log("Happy committing!\n");
      await sleep(2000);
      return;
    }

    // Walk in quickly
    await this.walk(0, 10, 600);

    // Show celebration
    this.clearScreen();
    console.log(this.frames.celebrate);
    await sleep(1000);

    // Wave goodbye
    this.clearScreen();
    console.log(this.frames.waving);
    console.log(pc.cyan("      Happy committing!\n"));
    await sleep(2000);

    // Walk off
    await this.walk(10, this.caps.terminalWidth, 800);

    // Final complete clear
    this.clearScreen();
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
