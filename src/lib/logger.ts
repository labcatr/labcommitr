import { consola } from "consola";
import boxen from "boxen";

export interface BoxOptions {
	titleAlignment: "left" | "right" | "center";
}

export class Logger {
	// log a box with a title
	static box(text: string, title: string, options: BoxOptions) {
		const box = boxen(

		)
	}

	/* TODO:
	 * add wrappers for consola logs
	 * add processor to show configurator additions (diff colours)
	 */
}
