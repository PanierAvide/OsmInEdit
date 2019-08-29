import Style from "./Style";

/**
 * ShapeStyle
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
var MapCSSShapeStyle = function() {this.__init__()};

MapCSSShapeStyle.prototype = {
	properties: ['width','offset','color','opacity','dashes','linecap','linejoin','line_style',
	'fill_image','fill_color','fill_opacity','casing_width','casing_color','casing_opacity','casing_dashes','layer','z_index'],

	width:0, color:null, opacity:NaN, dashes:[],
	linecap:null, linejoin:null, line_style:null,
	fill_image:null, fill_color:null, fill_opacity:NaN,
	casing_width:NaN, casing_color:null, casing_opacity:NaN, casing_dashes:[],z_index:NaN,
	layer:NaN,				// optional layer override (usually set by OSM tag)
	styleType: 'ShapeStyle',

	drawn:function() {
		return (this.fill_image || !isNaN(this.fill_color) || this.width || this.casing_width);
	},
	maxwidth:function() {
		// If width is set by an eval, then we can't use it to calculate maxwidth, or it'll just grow on each invocation...
		if (this.evals.width || this.evals.casing_width) { return 0; }
		return (this.width + (this.casing_width ? this.casing_width*2 : 0));
	},
	strokeStyler:function() {
		var cap,join;
		switch (this.linecap ) { case 'round': cap ='round'; break; case 'square': cap='square'; break; default: cap ='butt' ; break; }
		switch (this.linejoin) { case 'bevel': join='bevel'; break; case 'miter' : join=4      ; break; default: join='round'; break; }
		return {
			color: this.dojoColor(this.color ? this.color : 0, this.opacity ? this.opacity : 1),
			style: 'Solid',			// needs to parse dashes
			width: this.width,
			cap:   cap,
			join:  join
		};
	},
	shapeStrokeStyler:function() {
		if (isNaN(this.casing_color)) { return { width:0 }; }
		return {
			color: this.dojoColor(this.casing_color, this.casing_opacity ? this.casing_opacity : 1),
			width: this.casing_width ? this.casing_width : 1
		};
	},
	shapeFillStyler:function() {
		if (isNaN(this.color)) { return null; }
		return this.dojoColor(this.color, this.opacity ? this.opacity : 1);
	},
	fillStyler:function() {
		return this.dojoColor(this.fill_color, this.fill_opacity ? this.fill_opacity : 1);
	},
	casingStyler:function() {
		var cap,join;
		switch (this.linecap ) { case 'round': cap ='round'; break; case 'square': cap='square'; break; default: cap ='butt' ; break; }
		switch (this.linejoin) { case 'bevel': join='bevel'; break; case 'miter' : join=4      ; break; default: join='round'; break; }
		return {
			color: this.dojoColor(this.casing_color ? this.casing_color : 0, this.casing_opacity ? this.casing_opacity : 1),
			width: this.width+this.casing_width*2,
			style: 'Solid',
			cap:   cap,
			join:  join
		};
	},

};

//Inherit from Style
for(var p in Style.prototype) {
	if (MapCSSShapeStyle.prototype[p] === undefined) {
		MapCSSShapeStyle.prototype[p] = Style.prototype[p];
	}
}

export default MapCSSShapeStyle;
