/**
 * StyleList
 * A list of styles, defining the look of objects.
 * 
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
class MapCSSStyleList {
	constructor() {
		this.shapeStyles  = {};
		this.textStyles   = {};
		this.pointStyles  = {};
		this.shieldStyles = {};
		this.metaStyles   = {};
		
		this.maxwidth = 0;
		this.subparts = [];			// List of subparts used in this StyleList
		this.validAt = -1;				// Zoom level this is valid at (or -1 at all levels - saves recomputing)

	}

	hasStyles() {
		// summary:		Does this StyleList contain any styles?
		return (this.hasShapeStyles() || this.hasTextStyles() || this.hasPointStyles() || this.hasShieldStyles() || this.hasMetaStyles());
	}

	hasFills() {
		// summary:		Does this StyleList contain any styles with a fill?
		for (var s in this.shapeStyles) {
			if (!isNaN(this.shapeStyles(s).fill_color) || this.shapeStyles(s).fill_image) return true;
		}
		return false;
	}

	layerOverride() {
		// summary:		If this StyleList manually forces an OSM layer, return it, otherwise null.
		for (var s in this.shapeStyles) {
			if (!isNaN(this.shapeStyles[s].layer)) return this.shapeStyles[s].layer;
		}
		return NaN;
	}

	addSubpart(s) {
		// summary:		Record that a subpart is used in this StyleList. 
		if (this.subparts.indexOf(s)===-1) { this.subparts.push(s); }
	}

	isValidAt(zoom) {
		// summary:		Is this StyleList valid at a given zoom? 
		return (this.validAt===-1 || this.validAt===zoom);
	}

	toString() {
		// summary:		Summarise StyleList as String - for debugging
		var str = '';
		var k;
		for (k in this.shapeStyles ) { str+="- SS "+k+"="+this.shapeStyles[k]+"\n"; }
		for (k in this.textStyles  ) { str+="- TS "+k+"="+this.textStyles[k]+"\n"; }
		for (k in this.pointStyles ) { str+="- PS "+k+"="+this.pointStyles[k]+"\n"; }
		for (k in this.shieldStyles) { str+="- sS "+k+"="+this.shieldStyles[k]+"\n"; }
		for (k in this.metaStyles  ) { str+="- MS "+k+"="+this.metaStyles[k]+"\n"; }
		return str;
	}

	hasShapeStyles()  { for (var a in this.shapeStyles ) { return true; } return false; }
	hasTextStyles()   { for (var a in this.textStyles  ) { return true; } return false; }
	hasPointStyles()  { for (var a in this.pointStyles ) { return true; } return false; }
	hasShieldStyles() { for (var a in this.shieldStyles) { return true; } return false; }
	hasMetaStyles()   { for (var a in this.metaStyles  ) { return true; } return false; }
}

export default MapCSSStyleList;
