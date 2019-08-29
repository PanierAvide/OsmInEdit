import Style from "./Style";

/**
 * MetaStyle
 * Handles properties specific to meta rules.
 * 
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
var MapCSSMetaStyle = function() {this.__init__()};
MapCSSMetaStyle.prototype = {
	properties: ['title'],

	styleType: 'MetaStyle'
};

//Inherit from Style
for(var p in Style.prototype) {
	if (MapCSSMetaStyle.prototype[p] === undefined) {
		MapCSSMetaStyle.prototype[p] = Style.prototype[p];
	}
}

export default MapCSSMetaStyle;
