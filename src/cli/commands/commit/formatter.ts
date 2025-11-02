/**
 * Message Formatter
 *
 * Formats commit messages according to configuration template
 */

import type { LabcommitrConfig } from "../../../lib/config/types.js";

/**
 * Format commit message from template
 */
export function formatCommitMessage(
  config: LabcommitrConfig,
  type: string,
  typeEmoji: string | undefined,
  scope: string | undefined,
  subject: string,
): string {
  let message = config.format.template;

  // Replace variables
  const emoji = config.config.emoji_enabled && typeEmoji ? typeEmoji : "";
  message = message.replace("{emoji}", emoji);
  message = message.replace("{type}", type);
  message = message.replace("{scope}", scope || "");
  message = message.replace("{subject}", subject);

  return message;
}
