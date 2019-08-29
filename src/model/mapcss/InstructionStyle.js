import Style from "./Style";

/**
 * InstructionStyle
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
var MapCSSInstructionStyle = function() {this.__init__()};
MapCSSInstructionStyle.prototype = {
	set_tags: null,
	breaker: false,
	styleType: 'InstructionStyle',
	
	__init__: function() {
	},
	
	addSetTag: function(k,v) {
		this.edited=true;
		if (!this.set_tags) this.set_tags={};
		this.set_tags[k]=v;
	},
	
};

//Inherit from Style
for(var p in Style.prototype) {
	if (MapCSSInstructionStyle.prototype[p] === undefined) {
		MapCSSInstructionStyle.prototype[p] = Style.prototype[p];
	}
}

export default MapCSSInstructionStyle;
