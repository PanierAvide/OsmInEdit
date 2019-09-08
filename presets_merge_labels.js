/*
 * Updates XML presets files using translations from Transifex
 */

const fs = require('fs');
const xml2js = require('xml2js');
const Hash = require("object-hash");

const PRESETS_DIR = "./public/presets";
const LOCALES_DIR = "./src/config/locales/presets";
const XML_RGX = /^[A-Za-z0-9_\-]+\.xml$/;
const JSON_RGX = /^[A-Za-z0-9_\-]+\.json$/;

// Load in-memory all translation files
let locales = {};

fs.readdirSync(LOCALES_DIR).forEach((file) => {
	if(JSON_RGX.test(file) && file !== "en.json") {
		try {
			const localeJson = JSON.parse(fs.readFileSync(LOCALES_DIR+"/"+file, 'utf8'));
			locales = Object.assign(locales, localeJson);
		}
		catch(e) {
			throw new Error("Can't parse translation file: "+file+" ("+e.message+")");
		}
	}
});


// Function for adding translation to given object
const addTranslation = entry => {
	Object.entries(entry).forEach(e => {
		const [ k, v ] = e;

		if(k === "$") {
			Object.entries(v).forEach(ve => {
				const [ vk, vv ] = ve;

				if([ "text", "name", "display_values"].includes(vk)) {
					const strhash = Hash(vv);
					Object.keys(locales).forEach(l => {
						if(locales[l][strhash] && locales[l][strhash] !== vv) {
							v[l+"."+vk] = locales[l][strhash];
						}
					});
				}
			});
		}
		else {
			addTranslation(v);
		}
	});

	return entry;
};


// Read all presets files, add translations, and rewrite them
fs.readdirSync(PRESETS_DIR).forEach((file) => {
	if(XML_RGX.test(file)) {
		try {
			const xml = fs.readFileSync(PRESETS_DIR+"/"+file, 'utf8');

			// Parse XML content
			xml2js.parseString(xml, (err, result) => {
				if (err) {
					throw new Error("Parse error", e.message);
				}
				else {
					// Append translations to JS object
					result = addTranslation(result);

					// Rewrite XML file
					const newXml = (new xml2js.Builder({ renderOpts: { pretty: true, indent: '\t' } })).buildObject(result);

					fs.writeFile(PRESETS_DIR+"/"+file, newXml, function(err) {
						if(err) {
							throw new Error(err);
						}
						else {
							console.log("[INFO] Preset file "+file+" updated");
						}
					});
				}
			});
		}
		catch(e) {
			throw new Error("Can't update preset: "+file+" ("+e.message+")");
		}
	}
	else {
		console.log("[INFO] Ignored file "+file);
	}
});
