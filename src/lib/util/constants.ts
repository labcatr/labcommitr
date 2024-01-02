/*
 * Here, we will put important constant values for the project.
 */

// Put not any leading dot modifiers (.labrc -> labrc)
const ACCEPTED_CONFIG_FILENAMES = [
	"labrc.mjs", // default
	"labrc",
	"labrc.json", // if we want to support a JSON config file.
] as const;

interface CONSTANTS {
	ACCEPTED_CONFIG_FILENAMES: typeof ACCEPTED_CONFIG_FILENAMES;
	CONFIG_FILE_MAX_DEPTH: number;
}

const constants: CONSTANTS = {
	ACCEPTED_CONFIG_FILENAMES,
	CONFIG_FILE_MAX_DEPTH: 5,
};

export default constants;

export type FileNameResolvable = (typeof ACCEPTED_CONFIG_FILENAMES)[number];
export type DotOption = "" | ".";
export type ConfigPathResolvable = `${string}${DotOption}${FileNameResolvable}`;

