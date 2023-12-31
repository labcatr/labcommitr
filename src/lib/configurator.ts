/*
 * TODO Use `magicast` to change the local configuration
 * Add a function that looks back from the command execution path to find the configuration file path. Perhaps use `minimatch` to match the paths?
 */

import { loadFile, writeFile } from "magicast";
import path from "path";
import fs from "fs";
import consola from "consola";

import Constants from "./util/constants";

export interface MessageConfiguration {
	emoji: string;
	message: string;
	insertAtIndex?: number;
	replaceAtIndex?: number;
}

class Configurator {
	static getNearestConfigurationFilePath(
		currentDirectory: string,
		level: number = 0
	): string {
		const currentDir = fs.readdirSync(currentDirectory);
		const query = currentDir.find((item) =>
			Constants.ACCEPTED_CONFIG_FILENAMES.includes(item)
		);
		if (query) return path.join(currentDirectory, query);
		else if (level <= Constants.CONFIG_FILE_MAX_DEPTH) {
			const parentDir = path.join(currentDirectory, "/..");
			return this.getNearestConfigurationFilePath(parentDir, level++);
		}

		// TODO: Replace this with custom error class/function?
		else {
			consola.error(
				`There is no labcommitr configuration file within ${Constants.CONFIG_FILE_MAX_DEPTH} directory levels from here.`
			);
			process.exit(0);
		}
	}

	static addMessageConfiguration(
		filePath: string,
		message: MessageConfiguration
	): boolean {
		if (message.insertAtIndex && message.replaceAtIndex)
			throw new Error("You cannot insert and replace at the same time.");
		return true;
	}
}

export default Configurator;
