import Style from "./Style";

/**
 * ShieldStyle
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
var MapCSSShieldStyle = function() {this.__init__()};

MapCSSShieldStyle.prototype = {
	has: function(k) {
		return this.properties.indexOf(k)>-1;
	},
	properties: ['shield_image','shield_width','shield_height'],
	shield_image: null,
	shield_width: NaN,
	shield_height: NaN,
	styleType: 'ShieldStyle',
};

//Inherit from Style
for(var p in Style.prototype) {
	if (MapCSSShieldStyle.prototype[p] === undefined) {
		MapCSSShieldStyle.prototype[p] = Style.prototype[p];
	}
}

export default MapCSSShieldStyle;
