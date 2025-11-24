/**
 * Commit Message Parser
 *
 * Parses commit messages to extract type, scope, and subject
 * for use in revert commit templates
 */

import type { ParsedCommit } from "./types.js";

/**
 * Parse commit message following conventional commits format
 * Format: {emoji}{type}({scope}): {subject}
 */
export function parseCommitMessage(message: string): ParsedCommit {
  if (!message || !message.trim()) {
    return {
      subject: message || "",
      parseSuccess: false,
    };
  }

  // Remove leading/trailing whitespace
  const trimmed = message.trim();

  // Try to match: {emoji}{type}({scope}): {subject}
  // Emoji is optional, scope is optional
  const pattern1 = /^(?:\p{Emoji}*\s*)?(\w+)(?:\(([^)]+)\))?:\s*(.+)$/u;
  const match1 = trimmed.match(pattern1);

  if (match1) {
    const [, type, scope, subject] = match1;
    return {
      type: type.toLowerCase(),
      scope: scope || undefined,
      subject: subject.trim(),
      parseSuccess: true,
    };
  }

  // Try to match: {type}({scope}): {subject} (no emoji)
  const pattern2 = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/;
  const match2 = trimmed.match(pattern2);

  if (match2) {
    const [, type, scope, subject] = match2;
    return {
      type: type.toLowerCase(),
      scope: scope || undefined,
      subject: subject.trim(),
      parseSuccess: true,
    };
  }

  // Try to match: {type}: {subject} (no scope)
  const pattern3 = /^(\w+):\s*(.+)$/;
  const match3 = trimmed.match(pattern3);

  if (match3) {
    const [, type, subject] = match3;
    return {
      type: type.toLowerCase(),
      subject: subject.trim(),
      parseSuccess: true,
    };
  }

  // If no pattern matches, return entire message as subject
  return {
    subject: trimmed,
    parseSuccess: false,
  };
}

/**
 * Generate revert subject following industry standards
 */
export function generateRevertSubject(
  originalSubject: string,
  maxLength: number,
): string {
  // Industry standard: Revert "original subject"
  let base = `Revert "${originalSubject}"`;

  // Handle quotes: if double quotes in subject, use single quotes
  if (originalSubject.includes('"')) {
    base = `Revert '${originalSubject}'`;
  }

  // Truncate if too long
  if (base.length > maxLength) {
    // Reserve space for "Revert \"...\""
    const availableLength = maxLength - 15; // "Revert \"...\""
    const truncated = originalSubject.substring(0, Math.max(0, availableLength));
    return `Revert "${truncated}..."`;
  }

  return base;
}

