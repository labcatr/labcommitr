import { consola } from "consola";
import boxen, { Options as BoxenOptions } from "boxen";

export interface BoxOptions extends Omit<BoxenOptions, "title"> {}

export class Logger {
  // CONSOLA LOG WRAPPERS

  static box(text: string, title: string, options: BoxOptions) {
    const box = boxen(text, { title, ...options });
    consola.info(box);
  }

  static info(message: string): void {
    consola.info(message);
  }

  static warn(message: string): void {
    consola.warn(message);
  }

  static success(message: string): void {
    consola.success(message);
  }

  static error(message: string): void {
    consola.error(message);
  }

  /* TODO:
   * add wrappers for consola logs
   * add processor to show configurator additions (diff colours)
   */
}
