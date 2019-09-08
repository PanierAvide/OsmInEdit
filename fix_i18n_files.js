/**
 * Changes the language in the translation files retrieved from Transifex.
 */

const fs = require('fs');

const I18N_DIRS = [ "./src/config/locales/ui", "./src/config/locales/presets" ];
const JSON_RGX = /^[A-Za-z0-9_\-]+\.json$/;

//Read translation files
I18N_DIRS.forEach(i18n_dir => {
	fs.readdirSync(i18n_dir).forEach((file) => {
		if(JSON_RGX.test(file)) {
			const lng = file.substring(0, file.length - 5).replace("_", "-");
			try {
				//Read file
				const lngData = JSON.parse(fs.readFileSync(i18n_dir+"/"+file, 'utf8'));

				//If not already fixed
				if(lngData[lng] === undefined) {
					//Check if en available
					if(lngData["en"] !== undefined) {
						//Edit object, put en into lng locale
						const outData = {};
						outData[lng] = lngData.en;

						//Overwrite file
						fs.writeFile(i18n_dir+"/"+file, JSON.stringify(outData, null, 2), function(err) {
							if(err) {
								throw new Error(err);
							}
							else {
								console.log("[INFO] Translation file "+i18n_dir+"/"+file+" updated");
							}
						});
					}
					else {
						throw new Error("Unknown translation locale: "+i18n_dir+"/"+file);
					}
				}
				else {
					console.log("[INFO] Translation file "+i18n_dir+"/"+file+" already OK");
				}
			}
			catch(e) {
				if(e instanceof SyntaxError) {
					throw new Error("Invalid translation file: "+i18n_dir+"/"+file+" ("+e.message+")");
				}
				else {
					throw e;
				}
			}
		}
		else {
			console.log("[INFO] Ignored file "+i18n_dir+"/"+file);
		}
	});
});
