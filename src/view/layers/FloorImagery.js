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

import L from 'leaflet'
import { MapLayer, withLeaflet } from 'react-leaflet';
import 'leaflet-toolbar';
import 'leaflet-distortableimage';
import 'leaflet-distortableimage/dist/leaflet.distortableimage.css';
import Body from '../Body';
import deepEqual from 'fast-deep-equal';
import PubSub from 'pubsub-js';


// Fix for _scaleBy function and 0-sized images
const CORRESP_HANDLE = { 0: 3, 1: 2, 2: 1, 3: 0 };

L.DistortableImage.Edit.include({
	_scaleBy: function(scale) {
		if(scale === Infinity || isNaN(scale) || scale === 0) {
			scale = 1;
		}

		let overlay = this._overlay,
			map = overlay._map,
			zoom = map.getZoom(),
			center = map.project(overlay.getCorner(CORRESP_HANDLE[this._lastDragUsed]), zoom),
			i,
			p;

		for (i = 0; i < 4; i++) {
			if(i !== CORRESP_HANDLE[this._lastDragUsed]) {
				p = map
					.project(overlay.getCorner(i), zoom)
					.subtract(center)
					.multiplyBy(scale)
					.add(center);
				overlay.setCorner(i, map.unproject(p, zoom));
			}
		}

		overlay._reset();
	},

	_rotateBy: function(angle) {
		var overlay = this._overlay,
			map = overlay._map,
			zoom = map.getZoom(),
			center = map.project(overlay.getCenter(), zoom),
			i,
			p,
			q;

		for (i = 0; i < 4; i++) {
			p = map.project(overlay.getCorner(i), zoom).subtract(center);
			q = L.point(
				Math.cos(angle) * p.x - Math.sin(angle) * p.y,
				Math.sin(angle) * p.x + Math.cos(angle) * p.y
			);
			overlay.setCorner(i, map.unproject(q.add(center), zoom));
		}

		// window.angle = L.TrigUtil.radiansToDegrees(angle);

		this._overlay.rotation -= L.TrigUtil.radiansToDegrees(angle);

		overlay._reset();
	},

	_showMarkers: function() {
		if (this._mode === 'lock') { return; }

		var currentHandle = this._handles[this._mode];

		let i=0;
		currentHandle.eachLayer((layer) => {
			var drag = layer.dragging,
				opts = layer.options;

			layer.setOpacity(1);
			if (drag) { drag.enable(); }
			if (opts.draggable) { opts.draggable = true; }

			const myId = parseInt(i.toString());

			layer.once("dragstart", () => {
				this._lastDragUsed = myId;
			});

			i++;
		});
	}
});

L.ScaleHandle.include({
	_calculateScalingFactor: function(latlngA, latlngB) {
		var overlay = this._handled,
			map = overlay._map,

		centerPoint = map.latLngToLayerPoint(overlay.getCorner(CORRESP_HANDLE[this._corner])),
		formerPoint = map.latLngToLayerPoint(latlngA),
		newPoint = map.latLngToLayerPoint(latlngB),
		formerRadiusSquared = this._d2(centerPoint, formerPoint),
		newRadiusSquared = this._d2(centerPoint, newPoint);

		return Math.sqrt(newRadiusSquared / formerRadiusSquared);
	}
});


/**
 * FloorImagery is a Leaflet layer allowing display of images, and their manipulation.
 */
class FloorImagery extends MapLayer {
	createLeafletElement(props) {
		const img = L.distortableImageOverlay(
			props.data.image,
			{
				selected: props.data.editing,
				corners: [
					props.data.topleft,
					props.data.topright,
					props.data.bottomleft,
					props.data.bottomright ? props.data.bottomright : L.latLng(props.data.bottomleft.lat, props.data.topright.lng)
				],
				keymapper: false,
				suppressToolbar: true,
				mode: "scale"
			}
		);

		return img;
	}

	componentDidMount() {
		super.componentDidMount();
		this.leafletElement.setOpacity(this.props.opacity);

		this.updateLeafletElement({ tool: "scale", data: {} }, this.props);

		// Look for dragend events to avoid too much floorimagery updates
		this._onDragging(this.leafletElement, this.props);

		// Check if image is still selected
		this._checkSelect = setInterval(() => {
			if(this.props.mode === Body.MODE_FLOOR_IMAGERY && this.props.data.selected && this.props.tool && this.props.data.visible) {
				if(!this.leafletElement.editing.enabled()) {
					this.leafletElement.editing.enable();
				}
				if(!this.leafletElement.editing._selected) {
					this.leafletElement.editing._select();
				}
			}
		}, 100);
	}

	_onDragEnd(elem, props) {
		return () => {
			if(this._timerDragend) {
				clearTimeout(this._timerDragend);
			}
			this._timerDragend = setTimeout(() => {
				const crns = elem.getCorners();
				PubSub.publish("body.floorimagery.update", { imagery: [ Object.assign({}, props.data, {
					topleft: crns[0],
					topright: crns[1],
					bottomleft: crns[2],
					bottomright: crns[3]
				}) ] });
			}, 10);
		};
	}

	_onDragging(elem, props) {
		const dragend = this._onDragEnd(elem, props);

		if(elem.editing.dragging) {
			elem.editing.dragging.once("dragend", dragend);
		}

		if(elem.editing._handles) {
			Object.entries(elem.editing._handles).forEach(e => {
				e[1].eachLayer(l => {
					l.once("dragend", dragend);
				});
			});
		}
	}

	updateLeafletElement(fromProps, toProps) {
		if(toProps.data.image !== fromProps.data.image) {
			this.leafletElement.setUrl(toProps.data.image)
		}

		if(toProps.bounds !== fromProps.bounds) {
			this.leafletElement.setBounds(L.latLngBounds(toProps.bounds))
		}

		// Position changes
		if(
			toProps.data.topleft !== fromProps.data.topleft
			|| toProps.data.topright !== fromProps.data.topright
			|| toProps.data.bottomleft !== fromProps.data.bottomleft
			|| toProps.data.bottomright !== fromProps.data.bottomright
		) {
			const prevCorners = this.leafletElement.getCorners();
			const nextCorners = [
				toProps.data.topleft,
				toProps.data.topright,
				toProps.data.bottomleft,
				toProps.data.bottomright ? toProps.data.bottomright : L.latLng(toProps.data.bottomleft.lat, toProps.data.topright.lng)
			];

			if(!deepEqual(prevCorners, nextCorners)) {
				this.leafletElement.setCorners(nextCorners);

				// Hack for forcing refresh of handles
				if(this.leafletElement.editing && this.leafletElement.editing._handles) {
					Object.values(this.leafletElement.editing._handles).forEach(layer => {
						layer.eachLayer(l => {
							if(l.updateHandle) {
								l.updateHandle();
							}
						});
					});
				}
			}
		}

		// Enable/disable
		if(toProps.tool && toProps.data.selected && toProps.data.visible) {
			if(!this.leafletElement.editing.enabled()) {
				this.leafletElement.editing.enable();
			}
			if(!this.leafletElement.editing._selected) {
				this.leafletElement.editing._select();
			}
			this.leafletElement.setZIndex(1000);
		}
		if(!toProps.tool || !toProps.data.selected || !toProps.data.visible) {
			if(this.leafletElement.editing.enabled()) {
				this.leafletElement.editing.disable();
			}
			if(this.leafletElement.editing._selected) {
				this.leafletElement.editing._deselect();
			}
			this.leafletElement.setZIndex(1);
		}

		if(
			toProps.data.visible
			&& (
				(fromProps.tool !== toProps.tool && toProps.data.selected)
				|| (fromProps.data.selected !== toProps.data.selected && toProps.data.selected)
			)
		) {
			// Editing changes
			if(toProps.tool === "scale") {
				if(this.leafletElement.editing._mode !== "scale") {
					this.leafletElement.editing._toggleScale();
				}
				this.leafletElement.setOpacity(toProps.opacity);
			}

			// Rotating changes
			if(toProps.tool === "rotate") {
				if(this.leafletElement.editing._mode !== "rotate") {
					this.leafletElement.editing._toggleRotate();
				}
			}

			// Distorting changes
			if(toProps.tool === "distort") {
				if(this.leafletElement.editing._mode !== "distort") {
					if(this.leafletElement.editing._mode === "rotate") {
						this.leafletElement.editing._toggleRotate();
					}
					if(this.leafletElement.editing._mode === "scale") {
						this.leafletElement.editing._toggleScale();
					}
				}
			}
		}

		// Mode changes
		if(!toProps.data.visible) {
			this.leafletElement.setOpacity(0);
		}
		else if(toProps.mode === Body.MODE_FLOOR_IMAGERY) {
			this.leafletElement.setOpacity(toProps.opacity);
			this._onDragging(this.leafletElement, toProps);
		}
		else {
			// Opacity changes
			if(!isNaN(toProps.data.level) && toProps.level === toProps.data.level) {
				this.leafletElement.setOpacity(toProps.opacity);
			}
			else {
				this.leafletElement.setOpacity(0);
			}
		}
	}

	componentWillUnmount() {
		super.componentWillUnmount();

		if(this._checkSelect) {
			clearInterval(this._checkSelect);
			delete this._checkSelect;
		}
	}
}

export default withLeaflet(FloorImagery);
