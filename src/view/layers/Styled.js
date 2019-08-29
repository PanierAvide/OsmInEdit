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

import { Path, withLeaflet } from 'react-leaflet';
import { CircleMarker, GeoJSON, Icon, LayerGroup, Marker, Polygon, Polyline } from 'leaflet';
import deepEqual from 'fast-deep-equal';

const existingIcons = {};

/**
 * Styled layer is an extension of GeoJSON layer in order to manage advanced styling of geometries.
 *
 * @property {MapStyler} [styler] The map styler
 */
class StyledLayer extends Path {
	createLeafletElement(props) {
		// Add some defaults
		const thatStyler = props.styler.getFeatureStyle.bind(props.styler);
		const myprops = Object.assign({}, {
			pointToLayer: (feature, latlng) => {
				const marker = new CircleMarker(latlng, thatStyler(feature));
				return marker;
			},
			onFeatureClick: (() => {}),
			style: thatStyler
		}, props);

		// Create the GeoJSON layer
		const lGeojson = this._populateLayer(new GeoJSON(null, this.getOptions(myprops)), myprops);

		return lGeojson;
	}

	componentDidMount() {
		super.componentDidMount();

		this._sortFeaturesZIndex(this.leafletElement);
	}

	updateLeafletElement(fromProps, toProps) {
		// Add style property according to styler
		if(!toProps.style) {
			toProps = Object.assign({}, toProps, { style: toProps.styler.getFeatureStyle.bind(toProps.styler) });
		}

		//Style
		if(fromProps.styler !== toProps.styler) {
			this.setStyle(toProps.style);
		}
		else {
			this.setStyleIfChanged(fromProps, toProps);
		}

		//Data
		if(
			fromProps.data !== toProps.data
			&& !deepEqual(fromProps.data, toProps.data)
		) {
			this.leafletElement.clearLayers();
			this._populateLayer(this.leafletElement, toProps);
		}

		this._sortFeaturesZIndex(this.leafletElement);
	}

	/**
	 * Sort features by size and type
	 * @private
	 */
	_sortFeaturesZIndex(layer) {
		// First, lines
		layer.eachLayer(l => {
			if(l.feature && l instanceof Polyline && !(l instanceof Polygon)) {
				l.bringToFront();
			}
		});
		// Last, nodes
		layer.eachLayer(l => {
			if(l.feature && l.feature.id.startsWith("node/")) {
				l.bringToFront();
			}
		});
	}

	/**
	 * Add icons of features
	 * @private
	 */
	_addIcons(layer) {
		if(this._featureIcons && layer.hasLayer(this._featureIcons)) {
			layer.removeLayer(this._featureIcons);
		}

		this._featureIcons = new LayerGroup();

		const featuresWithIcons = layer.getLayers().filter(l => l.options && l.options.iconImage && (!this.props.selection || l.feature.id !== this.props.selection.id));
		const iconSize = 20;

		featuresWithIcons.forEach(l => {
			const iconUrl = "img/icons/"+l.options.iconImage;
			const coords = l.getLatLng ? l.getLatLng() : (l.getBounds ? l.getBounds().getCenter() : null);

			if(coords) {
				let icon = existingIcons[iconUrl];

				if(!icon) {
					icon = new Icon({
						iconUrl: iconUrl,
						iconSize: [iconSize,iconSize],
						iconAnchor: [iconSize/2,iconSize/2]
					});
					existingIcons[iconUrl] = icon;
				}

				this._featureIcons.addLayer(new Marker(coords, { icon: icon, interactive: false }));
			}
		});

		layer.addLayer(this._featureIcons);

		layer.once("add", () => {
			document.querySelectorAll('img').forEach(function(img){
				img.onerror = function() { this.style.display='none'; };
			})
;
		});
	}

	/**
	 * Load content into the leaflet layer
	 * @private
	 */
	_populateLayer(layer, props) {
		layer.addData(props.data);
		this._addIcons(layer);
		return layer;
	}
}

export default withLeaflet(StyledLayer);
