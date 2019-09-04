/**
 * Changes the language in the translation files retrieved from Transifex.
 */

const fs = require('fs');

const I18N_DIR = "./src/config/locales";
const JSON_RGX = /^[A-Za-z0-9_\-]+\.json$/;

//Read translation files
fs.readdirSync(I18N_DIR).forEach((file) => {
	if(JSON_RGX.test(file)) {
		const lng = file.substring(0, file.length - 5).replace("_", "-");
		try {
			//Read file
			const lngData = JSON.parse(fs.readFileSync(I18N_DIR+"/"+file, 'utf8'));
			
			//If not already fixed
			if(lngData[lng] === undefined) {
				//Check if en available
				if(lngData["en"] !== undefined) {
					//Edit object, put en into lng locale
					const outData = {};
					outData[lng] = lngData.en;
					
					//Overwrite file
					fs.writeFile(I18N_DIR+"/"+file, JSON.stringify(outData, null, 2), function(err) {
						if(err) {
							throw new Error(err);
						}
						else {
							console.log("[INFO] Translation file "+file+" updated");
						}
					});
				}
				else {
					throw new Error("Unknown translation locale: "+file);
				}
			}
			else {
				console.log("[INFO] Translation file "+file+" already OK");
			}
		}
		catch(e) {
			if(e instanceof SyntaxError) {
				throw new Error("Invalid translation file: "+file+" ("+e.message+")");
			}
			else {
				throw e;
			}
		}
	}
	else {
		throw new Error("Invalid file in "+I18N_DIR+": "+file);
	}
});
