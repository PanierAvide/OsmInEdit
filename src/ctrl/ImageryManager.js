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

import Action from '../model/Action';
import booleanIntersects from '@turf/boolean-intersects';
import L from 'leaflet';
import 'leaflet-geometryutil';
import Hash from 'object-hash';
import HistorizedManager from './HistorizedManager';
import request from 'request-promise-native';

const LAYERS_URL = "https://osmlab.github.io/editor-layer-index/imagery.geojson";
const LAYERS_BLACKLIST = [
	'osmbe', 'osmfr', 'osm-mapnik-german_style', 'HDM_HOT', 'osm-mapnik-black_and_white', 'osm-mapnik-no_labels',
	'OpenStreetMap-turistautak', 'hike_n_bike', 'landsat', 'skobbler', 'public_transport_oepnv', 'tf-cycle',
	'tf-landscape', 'qa_no_address', 'wikimedia-map', 'openinframap-petroleum', 'openinframap-power', 'openinframap-telecoms',
	'openpt_map', 'openrailwaymap', 'openseamap', 'opensnowmap-overlay', 'US-TIGER-Roads-2012', 'US-TIGER-Roads-2014',
	'Waymarked_Trails-Cycling', 'Waymarked_Trails-Hiking', 'Waymarked_Trails-Horse_Riding', 'Waymarked_Trails-MTB',
	'Waymarked_Trails-Skating', 'Waymarked_Trails-Winter_Sports', 'OSM_Inspector-Addresses', 'OSM_Inspector-Geometry',
	'OSM_Inspector-Highways', 'OSM_Inspector-Multipolygon', 'OSM_Inspector-Places', 'OSM_Inspector-Routing', 'OSM_Inspector-Tagging', 'EsriWorldImagery'
];

/**
 * Imagery Manager offers a list of available imagery at a certain place for map display.
 * It is based on {@link https://github.com/osmlab/editor-layer-index|Editor Layer Index} library.
 */
class ImageryManager extends HistorizedManager {
	constructor() {
		super();
		this._rawLayers = null;
		this._floorImagery = [];
		this._isLoading = false;
	}

	/**
	 * Get the list of available layers at given coordinates
	 * @param {LatLng} coordinates The coordinates (map center for example)
	 * @return {Promise} A promise resolveing on the list of layers available at this place (sorted by pertinence)
	 */
	getAvailableImagery(coordinates) {
		if(this._isLoading) {
			return new Promise(resolve => {
				setTimeout(() => resolve(this.getAvailableImagery(coordinates)), 200);
			});
		}
		else if(this._rawLayers) {
			const location = coordinates ? { type: "Point", coordinates: [ coordinates.lng, coordinates.lat ] } : null;

			return new Promise(resolve => resolve(
				this._rawLayers
				.filter(layer => location === null || layer.geometry === null || booleanIntersects(layer, location))
				.sort((l1, l2) => {
					const a = l1.properties;
					const b = l2.properties;

					if(a.best && b.best) { return 0; }
					else if(a.best) { return -1; }
					else if(b.best) { return 1; }
					else if(a.default && b.default) { return 0; }
					else if(a.default) { return -1; }
					else if(b.default) { return 1; }
					else { return 0; }
				})
			));
		}
		else {
			// Load the GeoJSON containing layers data
			this._isLoading = true;
			return request(LAYERS_URL)
			.then(result => {
				result = JSON.parse(result);
				this._rawLayers = [];

				// Check every layer
				result.features.forEach(layer => {
					const props = layer.properties;
					let valid = true;

					if(LAYERS_BLACKLIST.includes(props.id)) { valid = false; }
					if(![ "bing", "tms", "wms" ].includes(props.type)) { valid = false; }

					if(props.end_date) {
						const endDate = new Date(props.end_date);

						if(!isNaN(endDate.getTime())) {
							const pastDate = new Date();
							pastDate.setFullYear(pastDate.getFullYear() - 10);
							if(endDate <= pastDate) { valid = false; }
						}
					}

					// Special fix for BdOrtho max zoom
					if(props.id === "fr.ign.bdortho") {
						props.max_zoom = 19;
					}

					if(valid) {
						this._rawLayers.push(layer);
					}
				});

				this._isLoading = false;

				return this.getAvailableImagery(coordinates);
			});
		}
	}

	/**
	 * Get the floor images
	 * @return {Object[]} The floor images collection
	 */
	getFloorImages() {
		return this._floorImagery;
	}

	/**
	 * Add new images in floor imagery collection
	 * @param {Object[]} incomingImages List of images to add to collection
	 * @param {LatLngBounds} bbox Current map bounding box
	 * @param {Object} map The map component
	 * @return {Promise} Promise solving on updated collection
	 */
	addFloorImagery(incomingImages, bbox, map) {
		return this._do(new Action(Action.FLOOR_IMG_ADD, null, arguments));
	}

	/**
	 * Raw floor images insert
	 * @private
	 */
	async _addFloorImagery(incomingImages, bbox, map) {
		this._floorImagery = this._floorImagery.map(img => {
			img.selected = false;
			return img;
		});
		const existingIds = this._floorImagery.map(img => img.id);
		const lastExistingImg = this._floorImagery.length > 0 ? this._floorImagery[this._floorImagery.length-1] : null;
		if(bbox) { bbox = bbox.pad(-0.3); }

		return Promise.all(incomingImages.map(img => (new Promise(resolve => {
			// Set identifier
			if(!img.id) {
				img.id = Hash(img.image);
			}

			if(img.visible === undefined) {
				img.visible = true;
			}

			if(!existingIds.includes(img.id)) {
				const onceDone = (approxMove) => {
					this._floorImagery.push(img);
					existingIds.push(img.id);
					resolve();

					if(approxMove) {
						this.moveFloorImagery(map, lastExistingImg, img);
					}
				};

				// Add default coordinates to imagery if necessary
				if(!img.topleft) {
					// Put at center of map
					if(bbox) {
						let approxMove = false;

						// Compute size of image
						const imgobj = new Image();
						imgobj.src = img.image;
						imgobj.onload = () => {
							// Reuse previous imagery if any
							if(lastExistingImg && lastExistingImg.origWidth === imgobj.width && lastExistingImg.origHeight === imgobj.height) {
								img.topleft = lastExistingImg.topleft;
								img.topright = lastExistingImg.topright;
								img.bottomleft = lastExistingImg.bottomleft;
								img.bottomright = lastExistingImg.bottomright;
								img.origWidth = lastExistingImg.origWidth;
								img.origHeight = lastExistingImg.origHeight;
							}
							// Or put image on center of map if no previous images
							else {
								const centerPoint = map.latLngToContainerPoint(bbox.getCenter());
								const nePoint = map.latLngToContainerPoint(bbox.getNorthEast());
								const swPoint = map.latLngToContainerPoint(bbox.getSouthWest());
								const bboxHeightPx = nePoint.y - swPoint.y;
								const imgWidthPx = imgobj.width * bboxHeightPx / imgobj.height;
								const imgSouthWest = map.containerPointToLatLng([ centerPoint.x + Math.round(imgWidthPx/2), swPoint.y ]);
								const imgNorthEast = map.containerPointToLatLng([ centerPoint.x - Math.round(imgWidthPx/2), nePoint.y ]);

								img.topleft = [ imgNorthEast.lat, imgSouthWest.lng ];
								img.topright = imgNorthEast;
								img.bottomleft = imgSouthWest;
								img.bottomright = [ imgSouthWest.lat, imgNorthEast.lng ];
								img.origWidth = imgobj.width;
								img.origHeight = imgobj.height;

								// Reuse last positioned image coordinates as an approximation
								if(map && lastExistingImg) {
									approxMove = true;
								}
							}

							onceDone(approxMove);
						};
					}
				}
				else {
					onceDone();
				}
			}
			else {
				resolve();
			}
		}))))
		.then(() => {
			this._updateSelectedImage();
			return this._floorImagery;
		});
	}

	/**
	 * Changes existing configuration of floor imagery
	 * @param {Object[]} updatedImages The images to change
	 * @return {Object[]} The whole updated collection
	 */
	updateFloorImagery(updatedImages) {
		return this._do(new Action(Action.FLOOR_IMG_UPDATE, this._floorImagery, arguments));
	}

	/**
	 * Raw floor images update
	 * @private
	 */
	_updateFloorImagery(updatedImages) {
		const imgs = {};
		updatedImages.forEach(d => { imgs[d.id] = d; });

		this._floorImagery = this._floorImagery.map(f => {
			return (imgs[f.id]) ? imgs[f.id] : f;
		});

		// Check if there are several images being edited
		const edits = this._floorImagery.filter(img => img.selected);
		if(edits.length > 1) {
			this._floorImagery = this._floorImagery.map(img => {
				img.selected = false;
				return img;
			});
			this._updateSelectedImage();
		}

		return this._floorImagery;
	}

	/**
	 * Moves currently selected image to a given destination (used for copy/paste)
	 * @param {Object} map The Leaflet map
	 * @param {Object} destination Coordinates of corners that should be used
	 * @param {Object} [image] Imagery to use (by default currently selected one)
	 */
	moveFloorImagery(map, destination, image) {
		const selected = image || this._floorImagery.find(img => img.selected && img.visible);

		if(selected && destination) {
			const updated = Object.assign({}, selected);

			// Same ratio
			if((selected.origWidth / selected.origHeight) === (destination.origWidth / destination.origHeight)) {
				updated.topleft = destination.topleft;
				updated.topright = destination.topright;
				updated.bottomleft = destination.bottomleft;
				updated.bottomright = destination.bottomright;
			}
			// Different ratio
			else if(map) {
				// Move selected image to same center as destination
				const selectedCenter = L.latLngBounds(selected.bottomright, selected.topleft).getCenter();
				const destinationCenter = L.latLngBounds(destination.bottomright, destination.topleft).getCenter();
				const angleCenters = L.GeometryUtil.bearing(selectedCenter, destinationCenter);
				const distanceCenters = selectedCenter.distanceTo(destinationCenter);

				const updtNotRotatedTopleft = L.GeometryUtil.destination(L.latLng(selected.topleft), angleCenters, distanceCenters);
				const updtNotRotatedTopright = L.GeometryUtil.destination(L.latLng(selected.topright), angleCenters, distanceCenters);
				const updtNotRotatedBottomleft = L.GeometryUtil.destination(L.latLng(selected.bottomleft), angleCenters, distanceCenters);
				const updtNotRotatedBottomright = L.GeometryUtil.destination(L.latLng(selected.bottomright), angleCenters, distanceCenters);

				// Rotate selected image
				const destinationTopcenter = L.latLngBounds(destination.topleft, destination.topright).getCenter();
				const updtNotRotatedTopcenter = L.latLngBounds(updtNotRotatedTopleft, updtNotRotatedTopright).getCenter();
				const distanceDestCenterTop = destinationTopcenter.distanceTo(destinationCenter);
				const distanceUpdtCenterTop = updtNotRotatedTopcenter.distanceTo(destinationCenter);
				const angle = L.GeometryUtil.bearing(destinationCenter, destinationTopcenter) - L.GeometryUtil.bearing(destinationCenter, updtNotRotatedTopcenter);

				const updtRotatedTopleft = L.GeometryUtil.rotatePoint(map, updtNotRotatedTopleft, angle, destinationCenter);
				const updtRotatedTopright = L.GeometryUtil.rotatePoint(map, updtNotRotatedTopright, angle, destinationCenter);
				const updtRotatedBottomleft = L.GeometryUtil.rotatePoint(map, updtNotRotatedBottomleft, angle, destinationCenter);
				const updtRotatedBottomright = L.GeometryUtil.rotatePoint(map, updtNotRotatedBottomright, angle, destinationCenter);

				// Scale selected image
				const scale = distanceDestCenterTop / distanceUpdtCenterTop;
				const updtTopleft = L.GeometryUtil.destination(destinationCenter, L.GeometryUtil.bearing(destinationCenter, updtRotatedTopleft), destinationCenter.distanceTo(updtRotatedTopleft) * scale);
				const updtTopright = L.GeometryUtil.destination(destinationCenter, L.GeometryUtil.bearing(destinationCenter, updtRotatedTopright), destinationCenter.distanceTo(updtRotatedTopright) * scale);
				const updtBottomleft = L.GeometryUtil.destination(destinationCenter, L.GeometryUtil.bearing(destinationCenter, updtRotatedBottomleft), destinationCenter.distanceTo(updtRotatedBottomleft) * scale);
				const updtBottomright = L.GeometryUtil.destination(destinationCenter, L.GeometryUtil.bearing(destinationCenter, updtRotatedBottomright), destinationCenter.distanceTo(updtRotatedBottomright) * scale);

				// Save computed coordinates
				updated.topleft = updtTopleft;
				updated.topright = updtTopright;
				updated.bottomleft = updtBottomleft;
				updated.bottomright = updtBottomright;
			}
			else {
				console.error("Can't paste position on this floor plan");
			}

			return this.updateFloorImagery([ updated ]);
		}
	}

	/**
	 * Makes all floor plans not editable
	 * @return {Object[]} The whole updated collection
	 */
	lockFloorImagery() {
		this._floorImagery = this._floorImagery.map(f => {
			f.selected = false;
			return f;
		});
		return this._floorImagery;
	}

	/**
	 * Remove some floor imagery from collection
	 * @param {string} [id] The image ID, if null clears the whole collection
	 * @return {Object[]} The updated collection
	 */
	removeFloorImagery(id){
		return this._do(new Action(Action.FLOOR_IMG_DELETE, this._floorImagery.filter(f => f.id === id), arguments));
	}

	/**
	 * Raw floor images deletion
	 * @private
	 */
	_removeFloorImagery(id) {
		if(id) {
			this._floorImagery = this._floorImagery.filter(f => f.id !== id);
			this._updateSelectedImage();
		}
		else {
			this._floorImagery = [];
		}
		return this._floorImagery;
	}

	_updateSelectedImage() {
		if(this._floorImagery.length > 0 && !this._floorImagery.find(f => f.selected)) {
			this._floorImagery[this._floorImagery.length-1].selected = true;
		}
	}

	/**
	 * Cancel last edit made by user (if any)
	 */
	undo() {
		if(this.canUndo()) {
			const revert = this._actions[this._lastActionId];
			this._lastActionId--;

			switch(revert.type) {
				case Action.FLOOR_IMG_ADD:
					if(revert.next[0]) {
						revert.next[0].forEach(img => {
							const id = img.id || Hash(img.image);
							this._removeFloorImagery(id);
						});
					}
					else {
						this._removeFloorImagery();
					}
					break;

				case Action.FLOOR_IMG_UPDATE:
					this._floorImagery = revert.prev;
					break;

				case Action.FLOOR_IMG_DELETE:
					this._addFloorImagery(revert.prev);
					break;

				default:
			}
		}
	}

	/**
	 * Save an action into stack
	 * @private
	 */
	_do(action, noSave) {
		// Check if not updating only editing state
		if(!noSave && action.type === Action.FLOOR_IMG_UPDATE) {
			const edits = action.next[0].filter(nextImg => {
				const currImg = this._floorImagery.find(img => img.id === nextImg.id);
				return !currImg
					|| currImg.topleft !== nextImg.topleft
					|| currImg.topright !== nextImg.topright
					|| currImg.bottomleft !== nextImg.bottomleft
					|| currImg.bottomright !== nextImg.bottomright
					|| currImg.level !== nextImg.level;
			});
			if(edits.length === 0) {
				noSave = true;
			}
		}

		if(!noSave) {
			// Discard next actions, as they will be overwritten by new one
			if(this._actions.length > this._lastActionId + 1) {
				this._actions = this._actions.slice(0, this._lastActionId+1);
			}

			// Save this action
			this._actions.push(action);
			this._lastActionId++;
		}

		// Perform the actual action
		switch(action.type) {
			case Action.FLOOR_IMG_ADD:
				return this._addFloorImagery(...action.next);

			case Action.FLOOR_IMG_UPDATE:
				return this._updateFloorImagery(...action.next);

			case Action.FLOOR_IMG_DELETE:
				return this._removeFloorImagery(...action.next);

			default:
				return null;
		}
	}
}

export default ImageryManager;
