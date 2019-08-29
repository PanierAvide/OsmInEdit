import Style from "./Style";

/**
 * TextStyle
 * Based on Overpass Turbo implementation
 * @see https://github.com/tyrasd/overpass-turbo
 */
var MapCSSTextStyle = function() {this.__init__()};
MapCSSTextStyle.prototype = {
	properties: ['font_family','font_bold','font_italic','font_caps','font_underline','font_size',
	'text_color','text_offset','max_width',
	'text','text_halo_color','text_halo_radius','text_center',
	'letter_spacing','text_opacity'],
	// TODO: font_bold??? wtf? -> support propper MapCSS properites!
	
	font_family: null,
	font_bold: false,
	font_italic: false,
	font_underline: false,
	font_caps: false,
	font_size: NaN,
	text_color: null,
	text_offset: NaN,
	max_width: NaN,
	text: null,
	text_halo_color: null,
	text_halo_radius: 0,
	text_center: true,
	letter_spacing: 0,
	styleType: 'TextStyle',
	
	fontStyler:function() {
		return {
			family: this.font_family ? this.font_family : 'Arial',
			size: this.font_size ? this.font_size*2 : '10px' ,
			weight: this.font_bold ? 'bold' : 'normal',
			style: this.font_italic ? 'italic' : 'normal'
		};
	},
	textStyler:function(_text) {
		return {
			decoration: this.font_underline ? 'underline' : 'none',
			align: 'middle',
			text: _text
		};
	},
	fillStyler:function() {
		// not implemented yet
		return this.dojoColor(0,1);
	},
	
	// getTextFormat, getHaloFilter, writeNameLabel
};

//Inherit from Style
for(var p in Style.prototype) {
	if (MapCSSTextStyle.prototype[p] === undefined) {
		MapCSSTextStyle.prototype[p] = Style.prototype[p];
	}
}

export default MapCSSTextStyle;
