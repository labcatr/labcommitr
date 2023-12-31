/*
 * Here, we will put important constant values for the project.
 */

interface CONSTANTS {
	ACCEPTED_CONFIG_FILENAMES: string[];
	CONFIG_FILE_MAX_DEPTH: number;
}

const constants: CONSTANTS = {
	ACCEPTED_CONFIG_FILENAMES: [
		".labrc.mjs", // default
		".labrc",
		".labrc.json", // if we want to support a JSON config file.
	],
	CONFIG_FILE_MAX_DEPTH: 5,
};

export default constants;
