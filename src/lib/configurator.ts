/*
 * TODO Use `magicast` to change the local configuration
 * Add a function that looks back from the command execution path to find the configuration file path. Perhaps use `minimatch` to match the paths?
 */

import { loadFile, writeFile } from "magicast";
import path from "path";
import fs from "fs";
import consola from "consola";

import Constants, { type ConfigPathResolvable } from "./util/constants.js";

export type MessageConfiguration = {
  message: string;
  emoji?: string;
  insertAtIndex?: number;
  replaceAtIndex?: number;
};

export type DefaultMessageOptions = {
  emoji?: string;
  fileName?: string;
};

class Configurator {
  static getNearestConfigurationFilePath(
    currentDirectory: string,
    level: number = 0,
  ): string {
    const currentDir = fs.readdirSync(currentDirectory);
    const query = currentDir.find((item) =>
      ([...Constants.ACCEPTED_CONFIG_FILENAMES] as string[]).includes(item),
    );
    if (query) return path.join(currentDirectory, query);
    else if (level <= Constants.CONFIG_FILE_MAX_DEPTH) {
      const parentDir = path.join(currentDirectory, "/..");
      return this.getNearestConfigurationFilePath(parentDir, level++);
    }

    // TODO: Replace this with custom error class/function?
    else {
      consola.error(
        `There is no labcommitr configuration file within ${Constants.CONFIG_FILE_MAX_DEPTH} directory levels from here.`,
      );
      process.exit(0);
    }
  }

  static getGitRootPath(currentDirectory: string, level: number = 0) {
    // TODO: Recursive find for the nearest directory with a .git path
    // Perhaps make this cacheable? Update at every change?
    // Maybe ENV Vars?
    currentDirectory;
    level;
  }

  static addMessageConfiguration(
    configFilePath: ConfigPathResolvable,
    message: MessageConfiguration,
  ): boolean {
    if (message.insertAtIndex && message.replaceAtIndex)
      throw new Error("You cannot insert and replace at the same time.");

    loadFile(configFilePath);

    return true;
  }

  static addDefaultMessageConfiguration(
    message: string,
    options: DefaultMessageOptions,
  ): boolean {
    const newMessage = {
      message,
      ...options,
    };
    newMessage;
    return true;
  }
}

export default Configurator;
