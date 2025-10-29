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
   * No padding above the cat - starts at line 1
   */
  private renderFrame(frame: string, x: number): void {
    const lines = frame.split("\n");
    lines.forEach((line, idx) => {
      // Move cursor to position (row, column)
      // Start at line 1 (no padding)
      process.stdout.write(`\x1B[${idx + 1};${x}H`);
      process.stdout.write(line);
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
      // Use normal white for clean, readable intro text
      process.stdout.write(textColors.white(text[i]));
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
    // Cat starts at line 1 (no padding), so fade from line 4 to line 1
    for (let i = catLines.length - 1; i >= 0; i--) {
      process.stdout.write(`\x1B[${1 + i};${x}H`);
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

    const catX = 1; // Left edge of terminal (no indentation)
    const catWidth = 18; // Actual visible width of cat ASCII art (rightmost char)
    const textX = catX + catWidth + 1; // 1 space padding on either side
    const textY = 3; // Vertically centered with cat (cat is 4 lines tall, centered at line 3)

    // Messages to type
    const messages = [
      "Hey there! My name is Clef!",
      "Let me help you get started...meoww!",
    ];

    // Start leg animation in background (non-blocking)
    let isAnimating = true;
    const animationPromise = this.animateLegs(catX, () => isAnimating);

    // Type first message
    await this.typeText(messages[0], textX, textY);
    await sleep(1000);

    // Clear first message
    this.clearLine(textY, textX);
    await sleep(300);

    // Type second message
    await this.typeText(messages[1], textX, textY);
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

    // Split cat into lines for side-by-side display
    const catLines = this.frames.waving.split("\n");
    const message = `   ${textColors.white("You're all set! Happy committing!")}`;

    // Display cat and message side by side (line by line)
    for (let i = 0; i < catLines.length; i++) {
      if (i === 2) {
        // Show message on the middle line of the cat (vertically centered)
        console.log(catLines[i] + message);
      } else {
        console.log(catLines[i]);
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
