/*
 * This file is part of OsmInEdit, released under ISC license (see LICENSE.md)
 *
 * Copyright (c) Adrien Pavie 2019
 * Copyright (c) Daimler AG 2019
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 */

import RuleSet from "./RuleSet";

/**
 * Map styler generates style for Leaflet according to a {@link https://wiki.openstreetmap.org/wiki/MapCSS/0.2|MapCSS} stylesheet.
 * The stylesheet is automatically loaded from `src/config/style.mapcss`.
 *
 * Parts of this mapcss package are based on {@link https://github.com/tyrasd/overpass-turbo|Overpass-Turbo} MapCSS interpreter.
 */
class MapStyler {
	constructor() {
		fetch('./style.mapcss')
		.then(res => res.text())
		.then(styles => {
			this.mapcss = new RuleSet();
			this.mapcss.parseCSS(styles);
		});
	}

	/**
	 * Get the Leaflet Path style for given feature.
	 * @param {Object} feature The GeoJSON feature to style
	 * @param {boolean} highlight Is this feature selected ?
	 * @return {Object} The style for Leaflet object (see {@link https://leafletjs.com/reference-1.4.0.html#path|documentation} for details)
	 */
	getFeatureStyle(feature, highlight) {
		if(!feature) { return {}; }

		// Override for building doors
		if(feature.properties.tags && feature.properties.tags.door && feature.properties.own && feature.properties.own.onBuildingContour) {
			return { opacity: 1, fillOpacity: 1, weight: 2, radius: 7, color: "#8B3100", fillColor: "#FF6B00" };
		}

		const stl = {};
		const s = this._getFeatureStyleMapCSS(feature, highlight);
		if(!s) { return stl; }

		// apply mapcss styles
		const get_property = (st, properties) => {
			if(st && properties) {
				for (let i = properties.length - 1; i >= 0; i--) {
					if (st && st[properties[i]] !== undefined) {
						return st[properties[i]];
					}
				}
			}
			return undefined;
		};

		let styles;

		switch (feature.geometry.type) {
			case "Point":
				styles = Object.assign(
					{},
					s.shapeStyles["default"],
					s.pointStyles["default"]
				);

				stl.color = get_property(styles, [
					"color",
					"symbol_stroke_color"
				]);

				stl.opacity = get_property(styles, [
					"opacity",
					"symbol_stroke_opacity"
				]);

				stl.weight = get_property(styles, [
					"width",
					"symbol_stroke_width"
				]);

				stl.radius = get_property(styles, [
					"symbol_size"
				]);

				stl.fillColor = get_property(styles, [
					"fill_color",
					"symbol_fill_color"
				]);

				stl.fillOpacity = get_property(styles, [
					"fill_opacity",
					"symbol_fill_opacity"
				]);

				stl.zIndex = get_property(styles, ["z_index"]);
				stl.iconImage = this._getImageIconUrl(styles, feature);

				let pda = get_property(styles, ["dashes"]);
				if (pda !== undefined) stl.dashArray = pda.join(",");

				break;

			case "LineString":
			case "MultiLineString":
				styles = Object.assign(
					{},
					s.shapeStyles["default"],
					s.pointStyles["default"]
				);
				stl.color = get_property(styles, ["color"]);
				stl.opacity = get_property(styles, ["opacity"]);
				stl.weight = get_property(styles, ["width"]);
				stl.lineCap = get_property(styles, ["linecap"]);
				stl.zIndex = get_property(styles, ["z_index"]);
				stl.iconImage = this._getImageIconUrl(styles, feature);
				if(stl.lineCap === "none") { stl.lineCap = "butt"; }

				let p1 = get_property(styles, ["offset"]);
				if (p1 !== undefined) stl.offset = -p1; // MapCSS and PolylineOffset definitions use different signs

				let p2 = get_property(styles, ["dashes"]);
				if (p2 !== undefined) stl.dashArray = p2.join(",");
				break;

			case "Polygon":
			case "MultiPolygon":
				styles = Object.assign(
					{},
					s.shapeStyles["default"],
					s.pointStyles["default"]
				);
				stl.color = get_property(styles, ["color", "casing_color"]);
				stl.zIndex = get_property(styles, ["z_index"]);
				stl.iconImage = this._getImageIconUrl(styles, feature);

				stl.opacity = get_property(styles, [
					"opacity",
					"casing_opacity"
				]);
				stl.weight = get_property(styles, ["width", "casing_width"]);
				stl.fillColor = get_property(styles, ["fill_color"]);
				stl.fillOpacity = get_property(styles, ["fill_opacity"]);

				let p = get_property(styles, ["dashes"]);
				if (p !== undefined) stl.dashArray = p.join(",");

				break;

			default:
		}

		// todo: more style properties? linejoin?

		// Clean up undefined values
		for(const k in stl) {
			if(stl[k] === undefined) { delete stl[k]; }
		}

		// return style object
		return stl;
	}

	_getFeatureStyleMapCSS(feature, highlight) {
		return this.mapcss ? this.mapcss.getStyles(
			{
				isSubject: this._isSubject(feature),
				getParentObjects: this._getParentObjects(feature)
			},
			Object.assign(
				feature.properties && feature.properties.tainted
					? {":tainted": true}
					: {},
				feature.properties && feature.properties.geometry
					? {":placeholder": true}
					: {},
				feature.is_placeholder ? {":placeholder": true} : {},
				this._hasInterestingTags(feature.properties)
					? {":tagged": true}
					: {":untagged": true},
				highlight ? {":active": true} : {},
				(function(tags, meta, id) {
					const res = {"@id": id};
					for (let key in meta) res["@" + key] = meta[key];
					for (let key in tags) {
						res[key.replace(/^@/, "@@")] = tags[key];
					}
					return res;
				})(
					feature.properties.tags,
					feature.properties.meta,
					feature.properties.id
				)
			),
			18
		) : null;
	}

	/**
	 * @private
	 */
	_hasInterestingTags(props) {
		return true; // disabled
// 		// this checks if the node has any tags other than "created_by"
// 		return (
// 			props &&
// 			props.tags &&
// 			(function(o) {
// 				for (let k in o)
// 				if (k != "created_by" && k != "source") return true;
// 				return false;
// 			})(props.tags)
// 		);
	}

	/**
	 * Get image URL
	 * @private
	 */
	_getImageIconUrl(styles, feature) {
		if(styles && styles.icon_image) {
			const rgxUrl = /url\('([a-zA-Z0-9.-_$[\]]+)'\)/;
			const rgxUrlJoker = /\$\[(\w+)\]/;
			if(styles.icon_image.match(rgxUrl)) {
				let img = rgxUrl.exec(styles.icon_image)[1];

				//Replace joker values in icon URL
				while(img && rgxUrlJoker.test(img)) {
					//Replace tag name with actual tag value
					const fIconRgxTagName = rgxUrlJoker.exec(img)[1];
					let fIconRgxTagValue = feature.properties.tags[fIconRgxTagName];

					//If an alias exists for the given value, replace
					if(typeof styles.icon_image_aliases[fIconRgxTagValue] === "string") {
						fIconRgxTagValue = styles.icon_image_aliases[fIconRgxTagValue];
					}

					img = img.replace(rgxUrlJoker, fIconRgxTagValue);
				}

				return img;
			}
			else {
				return undefined;
			}
		}
		else {
			return undefined;
		}
	}

	/**
	 * Check if current feature is concerned by style being checked
	 * @private
	 */
	_isSubject(feature) {
		return (subject) => {
			switch (subject) {
				case "node":
					return (
						feature.properties.type === "node" ||
						feature.geometry.type === "Point"
					);

				case "area":
					return (
						feature.geometry.type === "Polygon" ||
						feature.geometry.type === "MultiPolygon"
					);

				case "line":
					return (
						feature.geometry.type === "LineString" ||
						feature.geometry.type === "MultiLineString"
					);

				case "way":
					return feature.properties.type === "way";

				case "relation":
					return feature.properties.type === "relation";

				default:
					return false;
			}
		};
	}

	/**
	 * Get parent objects for this feature
	 * @private
	 */
	_getParentObjects(feature) {
		return () => {
			if (feature.properties.relations.length === 0) {
				return [];
			}
			else {
				return feature.properties.relations.map((rel) => {
					return {
						tags: rel.reltags,
						isSubject: (subject) => {
							return (
								subject === "relation" ||
								(subject === "area" &&
									rel.reltags.type === "multipolyon")
							);
						},
						getParentObjects: function() {
							return [];
						}
					};
				});
			}
		};
	}
}

export default MapStyler;
