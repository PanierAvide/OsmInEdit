/*
 * Creates a JSON file for Transifex to allow translation of XML presets.
 */

const fs = require('fs');
const parseString = require('xml2js').parseString;
const Hash = require("object-hash");

const PRESETS_DIR = "./public/presets";
const LOCALES_DIR = "./src/config/locales/presets";
const XML_RGX = /^[A-Za-z0-9_\-]+\.xml$/;

const foundLabels = {};

const entryToLabels = entry => {
	Object.entries(entry).forEach(e => {
		const [ k, v ] = e;

		if(k === "$") {
			Object.entries(v).forEach(ve => {
				const [ vk, vv ] = ve;

				if([ "text", "name", "display_values", "display_value"].includes(vk)) {
					foundLabels[Hash(vv)] = vv;
				}
			});
		}
		else {
			entryToLabels(v);
		}
	});
};

//Read translation files
fs.readdirSync(PRESETS_DIR).forEach((file) => {
	if(XML_RGX.test(file)) {
		try {
			const xml = fs.readFileSync(PRESETS_DIR+"/"+file, 'utf8');

			// Parse XML content
			parseString(xml, (err, result) => {
				if (err) {
					throw new Error("Parse error", e.message);
				}
				else {
					entryToLabels(result);
				}
			});
		}
		catch(e) {
			throw new Error("Can't read file: "+file+" ("+e.message+")");
		}
	}
	else {
		console.log("[INFO] Ignored file "+file);
	}
});

// Export found labels
fs.writeFile(LOCALES_DIR+"/en.json", JSON.stringify({ "en": foundLabels }, null, 2), function(err) {
	if(err) {
		throw new Error(err);
	}
	else {
		console.log("[INFO] Translation file for presets updated");
	}
});
