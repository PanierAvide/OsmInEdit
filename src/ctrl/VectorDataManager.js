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

import 'array-flat-polyfill';
import { GeoJSON } from 'leaflet';
import Action from '../model/Action';
import area from '@turf/area';
import bbox from '@turf/bbox';
import bearing from '@turf/bearing';
import { bearingToAzimuth } from '@turf/helpers';
import booleanContains from '@turf/boolean-contains';
import booleanIntersects from '@turf/boolean-intersects';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import buffer from '@turf/buffer';
import centerOfMass from '@turf/center-of-mass';
import { coordAll } from '@turf/meta';
import deepEqual from 'fast-deep-equal';
import GeoJSONValidation from 'geojson-validation';
import HistorizedManager from './HistorizedManager';
import I18n from '../config/locales/ui';
import intersect from '@turf/intersect';
import osmtogeojson from 'osmtogeojson';
import OsmRequest from 'osm-request';
import PACKAGE from '../../package.json';
import PubSub from 'pubsub-js';
import transformTranslate from '@turf/transform-translate';

const sortNumberArray = (a, b) => a-b;
const IGNORED_TAGS = [ "level", "repeat_on", "created_by", "source" ];

/**
 * Vector data manager allows to retrieve and save vector data from external providers.
 * It mainly saves the data from OpenStreetMap.
 */
class VectorDataManager extends HistorizedManager {
	constructor() {
		super();
		this._cacheOsmXml = null;
		this._cacheOsmGeojson = null;
		this._cacheBbox = null;
		this._nextId = -1;

		// Create OSM Request
		this._osmApi = new OsmRequest({
			endpoint: window.CONFIG.osm_api_url,
			always_authenticated: window.CONFIG.always_authenticated,
			oauthConsumerKey: window.CONFIG.oauth_consumer_key,
			oauthSecret: window.CONFIG.oauth_secret
		});
	}

	/**
	 * Downloads from OSM API data in the given bounding box.
	 * @param {LatLngBounds} bbox The area to download
	 * @return {Promise} Resolves when data is ready, true if everything went well
	 */
	loadOSMData(bbox) {
		return new Promise((resolve, reject) => {
			//If data is cached, no need to download again
			if(this._cacheBbox && this._cacheBbox.filter(b => b.contains(bbox)).length > 0) {
				resolve(true);
			}

			const restoreEdits = this._cacheOsmXml !== null;

			// Accumulate retrieved data
			this._osmApi
			.fetchMapByBbox(bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth(), "both")
			.then(res => {
				const [mapJson, mapXml] = res;
				this._appendOsmXml(mapJson, mapXml, bbox);

				if(
					(this._cacheOsmJson.node && this._cacheOsmJson.node.length > 0)
					|| (this._cacheOsmJson.way && this._cacheOsmJson.way.length > 0)
					|| (this._cacheOsmJson.relation && this._cacheOsmJson.relation.length > 0)
				) {
					this._cacheOsmGeojson = this.getBaseCollection();
				}
				else {
					this._cacheOsmGeojson = { type: "FeatureCollection", features: [] };
				}

				// Restore all edits made by user
				if(restoreEdits) {
					this._nextId = -1;
					for(let i=0; i <= this._lastActionId; i++) {
						this._do(this._actions[i], true);
					}
				}

				resolve(true);
			})
			.catch(e => {
				console.error("Can't load OSM data", e);
				reject(e);
			});
		});
	}

	/**
	 * Adds new data retrieved from OSM into local cache
	 * @private
	 */
	_appendOsmXml(mapjson, mapxml, bbox) {
		const mymapxml = (new window.DOMParser()).parseFromString(mapxml, "text/xml");

		// Append to existing cache
		if(this._cacheOsmXml && this._actions.length > 0) {
			this._cacheBbox.push(bbox);
			const cacheOsmNode = this._cacheOsmXml.children[0];
			const newOsmNode = mymapxml.children[0];
			const toAdd = [];

			// Merge JSON/XML
			["node", "way", "relation"]
			.filter(t => mapjson[t])
			.forEach(t => {
				// Find version for each ID
				const existingVersions = {};
				if(this._cacheOsmJson[t]) {
					this._cacheOsmJson[t].forEach((n,i) => {
						existingVersions[n.$.id] = { v: n.$.version, i: i };
					});
				}

				// Replace or append entries
				mapjson[t].forEach((n,i) => {
					const xmlid = t+"[id='"+n.$.id+"']";
					const oldN = existingVersions[n.$.id];

					if(this._cacheOsmJson[t] && oldN && oldN.v < n.$.version) {
						this._cacheOsmJson[t][n.$.id] = n;

						const xmlnode = cacheOsmNode.querySelector(n.$.id);
						xmlnode.parentNode.replaceChild(newOsmNode.querySelector(xmlid), xmlnode);
					}
					else {
						if(!this._cacheOsmJson[t]) {
							this._cacheOsmJson[t] = [n];
						}
						else {
							this._cacheOsmJson[t].push(n);
						}

						toAdd.push(newOsmNode.querySelector(xmlid));
					}
				});
			});

			cacheOsmNode.append(...toAdd);
		}
		// Create cache from this data
		else {
			this._cacheOsmXml = mymapxml;
			this._cacheOsmJson = mapjson;
			this._cacheBbox = [ bbox ];
		}
	}

	/**
	 * Cleans all data temporarily saved.
	 * This is useful after successful upload.
	 */
	cleanUp() {
		this._cacheOsmXml = null;
		this._cacheOsmGeojson = null;
		this._cacheBbox = null;
		this._nextId = -1;
		this._actions = [];
		this._lastActionId = -1;
	}

	/**
	 * Get buildings from cached OSM data
	 * @return {Object} Buildings features, as GeoJSON feature collection
	 */
	getOSMBuildings() {
		let features = [];

		if(this._cacheOsmGeojson) {
			features = this._cacheOsmGeojson
				.features
				.filter(feature => feature.properties && feature.properties.tags && feature.properties.tags.building);
		}

		return { type: "FeatureCollection", features: features };
	}

	/**
	 * Get available levels inside a building
	 * @param {Object} building The GeoJSON feature of the building
	 * @return {Object} The same feature, with list of levels in feature.properties.own.levels
	 */
	getBuildingLevels(building) {
		if(!building.properties.own.levels || !building.properties.own.levelsComputed) {
			//Levels of building itself
			this._listFeatureLevels(building);

			//Levels of feature it contains
			if(this._cacheOsmGeojson) {
				const levels = new Set(building.properties.own.levels);

				this._cacheOsmGeojson.features.forEach(feature => {
					if(booleanIntersects(building, feature)) {
						this._listFeatureLevels(feature).properties.own.levels.forEach(l => levels.add(l));
					}
				});

				building.properties.own.levels = Array.from(levels);
			}

			building.properties.own.levels.sort(sortNumberArray);
			building.properties.own.levelsComputed = true;
		}

		return building;
	}

	/**
	 * Get the list of rounded levels available in data
	 * @return {int[]} List of rounded levels available
	 */
	getAllLevels() {
		if(this._cacheOsmGeojson) {
			const levels = new Set();
			this._cacheOsmGeojson.features.forEach(feature => {
				this._listFeatureLevels(feature).properties.own.levels.forEach(l => levels.add(Math.round(l)));
			});
			const levelsArray = [...levels];
			levelsArray.sort((a,b) => parseInt(a) - parseInt(b));
			return levelsArray;
		}
		else {
			return [ 0 ];
		}
	}

	/**
	 * Check if a feature is overlapping enough a container feature (eg level inside building)
	 * @param {Object} container The GeoJSON feature which should contain the other one
	 * @param {Object} feature The GeoJSON feature which should be contained
	 * @return {boolean} True if overlapping enough
	 */
	isOverlappingEnough(container, feature) {
		if(!container || !feature) {
			return false;
		}
		else if(booleanIntersects(container, feature)) {
			if(this._containsWithBoundary(container, feature) || this._containsWithBoundary(feature, container)) {
				return true;
			}
			else {
				const common = intersect(container, feature);
				return common !== undefined
					&& common !== null
					&& GeoJSONValidation.valid(common)
					&& area(common) >= area(feature) * 0.8;
			}
		}
		else {
			return false;
		}
	}

	/**
	 * Find the building which contains given feature
	 * @param {Object} feature The feature to look for
	 * @return {Object} The found building, or null if none or several
	 */
	findAssociatedBuilding(feature) {
		const buildings = this.getOSMBuildings().features.filter(b => this._containsWithBoundary(b, feature));
		return buildings.length === 1 ? buildings[0] : null;
	}

	/**
	 * Retrieve the level feature in a specific building, at a given level.
	 * @param {Object} building The GeoJSON feature of the building
	 * @param {float} level The level value
	 * @return {Object[]} The level footprint (possibly several), or null if none found
	 */
	getLevelFootprint(building, level) {
		return (this._cacheOsmGeojson) ?
			this._cacheOsmGeojson.features
			.filter(feature => (
				feature.properties.tags && feature.properties.tags.indoor === "level"
				&& (
					feature.properties.own.utilityNode
					|| this._listFeatureLevels(feature).properties.own.levels.includes(level)
				)
				&& this.isOverlappingEnough(building, feature)
			))
			:
			null;
	}

	/**
	 * Retrieve the list of levels which can be used for copy in this building
	 * @param {Object} building The GeoJSON feature of the building
	 * @return {float[]} List of level values containing data for copy
	 */
	getCopiableLevels(building) {
		if(!this._cacheOsmGeojson) { return null; }
		else {
			const rawLevels = this._cacheOsmGeojson.features
				.filter(feature => (
					feature.properties.tags && feature.properties.tags.indoor === "level"
					&& this.isOverlappingEnough(building, feature)
				))
				.map(feature => this._listFeatureLevels(feature).properties.own.levels)
				.flat();
			const levels = [...new Set(rawLevels)];
			levels.sort((a,b) => parseFloat(a) - parseFloat(b));
			return levels;
		}
	}

	/**
	 * Retrieve the features being contained in a particular floor
	 * @param {Object} floor The GeoJSON feature for the floor
	 * @param {float} level The level being used
	 * @param {Object} [options] Options
	 * @param {Object} [options.building] The building feature (for adding additional info on features)
	 * @param {boolean} [options.includeFloorParts] Also include floor parts
	 * @return {Object} The GeoJSON feature collection of objects on this floor
	 */
	getFeaturesInFloor(floor, level, options) {
		options = options || {};
		let features = [];
		const isNotExcludedFeature = (tags => (options.includeFloorParts || tags.indoor !== "level") && !tags.building && !tags["building:part"]);

		if(this._cacheOsmGeojson) {
			const floorBuff = floor && buffer(floor, 20, { units: "meters" });
			features = this._cacheOsmGeojson
				.features
				.filter(feature =>
					(this._listFeatureLevels(feature).properties.own.levels || []).includes(level)
					&& feature.geometry.type !== "MultiPolygon"
					&& isNotExcludedFeature(feature.properties.tags)
					&& (!floor || booleanIntersects(floorBuff, feature))
				);

			// Add custom rendering for doors on building contour
			if(options.building) {
				features = features.map(f => {
					f.properties.own.onBuildingContour = ["Point", "LineString"].includes(f.geometry.type) && f.properties.tags.door && this.isOnContour(options.building, f);
					return f;
				});
			}
			else {
				const buildings = this._cacheOsmGeojson.features.filter(f => ["Polygon","MultiPolygon"].includes(f.geometry.type) && f.properties.tags.building);

				features = features.map(f => {
					if(f.properties.tags.door && ["Point", "LineString"].includes(f.geometry.type)) {
						let onContour = false;
						for(let b of buildings) {
							if(this.isOnContour(b, f)) {
								onContour = true;
								break;
							}
						}
						f.properties.own.onBuildingContour = onContour;
					}
					return f;
				});
			}

			features.sort((a, b) => parseInt(a.geometry.type === "Point") - parseInt(b.geometry.type === "Point"));
		}

		return { type: "FeatureCollection", features: features };
	}

	/**
	 * Retrieve the features being contained in a particular level of a building
	 * @param {Object} building The GeoJSON feature for the building
	 * @param {float} level The level being used
	 * @return {Object} The GeoJSON feature collection of objects on this floor
	 */
	getFeaturesInLevel(building, level) {
		let features = [];
		const isNotExcludedFeature = (tags => tags.indoor !== "level" && !tags.building && !tags["building:part"]);

		if(this._cacheOsmGeojson) {
			const buildingBuff = building && buffer(building, 20, { units: "meters" });
			features = this._cacheOsmGeojson
				.features
				.filter(feature =>
					(this._listFeatureLevels(feature).properties.own.levels || []).includes(level)
					&& feature.geometry.type !== "MultiPolygon"
					&& isNotExcludedFeature(feature.properties.tags)
					&& (!building || booleanIntersects(buildingBuff, feature))
				);

			// Add custom rendering for doors on building contour
			if(building) {
				features = features.map(f => {
					f.properties.own.onBuildingContour = ["Point", "LineString"].includes(f.geometry.type) && f.properties.tags.door && this.isOnContour(building, f);
					return f;
				});
			}

			features.sort((a, b) => parseInt(a.geometry.type === "Point") - parseInt(b.geometry.type === "Point"));
		}

		return { type: "FeatureCollection", features: features };
	}

	/**
	 * Does this given building contain any indoor-related feature ?
	 * @param {Object} building The building to check
	 * @return {boolean} True if it has indoor features
	 */
	hasIndoorFeatures(building) {
		let result = false;

		if(building && this._cacheOsmGeojson) {
			const isNotExcludedFeature = (tags => tags.indoor !== "level" && !tags.building && !tags["building:part"]);

			for(let i=0; i < this._cacheOsmGeojson.features.length; i++) {
				const feature = this._cacheOsmGeojson.features[i];

				if(
					!feature.id.startsWith("node/")
					&& feature.geometry.type !== "MultiPolygon"
					&& isNotExcludedFeature(feature.properties.tags)
					&& booleanIntersects(building, feature)
				) {
					result = true;
					break;
				}
			}
		}

		return result;
	}

	/**
	 * Search in edited data which buildings lacks an indoor=level outline.
	 * @param {Object} diff The edits done by user (result of computeDiff function)
	 * @return {Object} Missing level outlines in format { buildingId: { name: string, levels: int[] } }
	 */
	findMissingLevelOutlines(diff) {
		const result = {};

		if(!this._cacheOsmGeojson) { return null; }

		this._cacheOsmGeojson.features.forEach(f => {
			if(f.properties.tags && f.properties.tags.building) {
				const name = f.properties.tags.name || f.properties.tags.ref || f.id;
				let levels = this._listFeatureLevels(f, true).properties.own.levels;
				const usedLevels = this.getCopiableLevels(f);
				levels = levels.filter(lvl => !usedLevels.includes(lvl));

				if(levels.length > 0 && this.hasIndoorFeatures(f)) {
					result[f.id] = { name: name, levels: levels };
				}
			}
		});

		return result;
	}

	/**
	 * Check if a small geometry is within the boundary of a large geometry (boundary included)
	 * @private
	 */
	_containsWithBoundary(large, small) {
		if(deepEqual(small.geometry, large.geometry)) { return true; }
		else if(this._booleanContains(large, small)) { return true; }
		else if(booleanIntersects(large, small)) {
			const coords = coordAll(small);
			const wider = buffer(large, 0.01, { units: 'meters' }); // Fix for lack of precision on drawn geometries

			//Check all points lies within or on boundary
			for(let c of coords) {
				if(!booleanPointInPolygon(c, wider)) {
					return false;
				}
			}

			return true;
		}
		else { return false; }
	}

	/**
	 * Create a new building feature in cached data, using given GeoJSON feature.
	 * @param {Object} geojson The GeoJSON feature (should be a Polygon)
	 * @return {Object} The clean building GeoJSON feature which was created
	 */
	createNewBuilding(geojson) {
		return this._do(new Action(Action.BUILDING_NEW, this._nextId, arguments));
	}

	/**
	 * Raw building creation
	 * @private
	 */
	_createNewBuilding(geojson) {
		// Edit properties
		geojson.id = "way/" + this._nextId--;
		geojson.properties.tags = {
			building: "yes"
		};
		geojson.properties.own = {
			new: true
		};

		geojson = this._listFeatureLevels(geojson);

		// Add to cache
		this._cacheOsmGeojson.features.push(geojson);

		return geojson;
	}

	/**
	 * Create a new floor feature in cached data, using given GeoJSON feature.
	 * @param {Object} geojson The GeoJSON feature (should be a Polygon)
	 * @param {float} level The level value for this feature
	 * @return {Object} The clean floor GeoJSON feature which was created
	 */
	createNewFloor(geojson, level) {
		return this._do(new Action(Action.FLOOR_NEW, this._nextId, arguments));
	}

	/**
	 * Raw floor creation
	 * @private
	 */
	_createNewFloor(geojson, level) {
		// Edit properties
		geojson.id = "way/" + this._nextId--;
		geojson.properties.tags = {
			indoor: "level",
			level: level.toString()
		};
		geojson.properties.own = {
			new: true
		};

		geojson = this._listFeatureLevels(geojson);

		// Add to cache
		this._cacheOsmGeojson.features.push(geojson);

		return geojson;
	}

	/**
	 * Create a new feature in cached data, using given GeoJSON feature.
	 * @param {Object} geojson The GeoJSON feature
	 * @param {float} level The level value for this feature
	 * @param {Object} preset The preset to apply
	 * @return {Object} The clean floor GeoJSON feature which was created
	 */
	createNewFeature(geojson, level, preset) {
		return this._do(new Action(Action.FEATURE_NEW, this._nextId, arguments));
	}

	/**
	 * Raw feature creation
	 * @private
	 */
	_createNewFeature(geojson, level, preset) {
		// Edit properties
		let type = "invalid";
		if(geojson.geometry.type === "Point") { type = "node"; }
		else if([ "LineString", "Polygon" ].includes(geojson.geometry.type)) { type = "way"; }

		geojson.id = type + "/" + this._nextId--;
		geojson.properties.tags = Object.assign({ level: level.toString() }, preset.tags);
		geojson.properties.own = {
			new: true
		};

		geojson = this._listFeatureLevels(geojson);

		// Add to cache
		this._cacheOsmGeojson.features.push(geojson);

		return geojson;
	}

	/**
	 * Copy an existing level data to another level.
	 * @param {Object} building The GeoJSON feature of the building
	 * @param {float} fromLevel The base level to copy data from
	 * @param {float} toLevel The destination level
	 */
	copyLevel(building, fromLevel, toLevel) {
		return this._do(new Action(Action.FLOOR_COPY, this._nextId, arguments));
	}

	/**
	 * Raw feature copy
	 * @private
	 */
	_copyLevel(building, fromLevel, toLevel) {
		toLevel = parseFloat(toLevel);
		fromLevel = parseFloat(fromLevel);

		// Find features to copy
		const featuresToCopy = this.getFeaturesInFloor(building, fromLevel, { includeFloorParts: true })
			.features
			.filter(f => !this._listFeatureLevels(f).properties.own.levels.includes(toLevel));

		// Create new features
		const featuresToCreate = featuresToCopy.map(f => (
			this._listFeatureLevels({
				id: f.id.split("/")[0] + "/" + this._nextId--,
				type: "Feature",
				properties: {
					tags: Object.assign({}, f.properties.tags, { level: toLevel.toString() }),
					own: { new: true }
				},
				geometry: Object.assign({}, f.geometry)
			})
		));

		// Add to cache
		featuresToCreate.forEach(f => {
			this._cacheOsmGeojson.features.push(f);
		});

		// Send back list of created features IDs
		return featuresToCreate.map(f => f.id);
	}

	/**
	 * Copy a feature in cached data, using given GeoJSON feature.
	 * @param {Object} geojson The GeoJSON feature to copy
	 * @param {float} level The level value for this feature
	 * @param {LatLng} center The center position where feature should be copied
	 * @return {Object} The clean floor GeoJSON feature which was created
	 */
	copyFeature(geojson, level, center) {
		return this._do(new Action(Action.FEATURE_COPY, this._nextId, arguments));
	}

	/**
	 * Raw feature copy
	 * @private
	 */
	_copyFeature(geojson, level, center) {
		// Shift geometry
		const prevCenter = GeoJSON.coordsToLatLng(centerOfMass(geojson).geometry.coordinates);
		const dist = prevCenter.distanceTo(center);
		const direction = bearingToAzimuth(bearing(GeoJSON.latLngToCoords(prevCenter), GeoJSON.latLngToCoords(center)));
		let newfeature = transformTranslate(geojson, dist, direction, { units: 'meters', mutate: false });

		newfeature.id = geojson.id.split("/")[0] + "/" + this._nextId--;
		newfeature.properties.tags.level = level.toString();
		newfeature.properties.own = {
			new: true
		};

		newfeature = this._listFeatureLevels(newfeature);

		// Add to cache
		this._cacheOsmGeojson.features.push(newfeature);

		return newfeature;
	}

	/**
	 * Edits an existing feature in cache using the one passed in parameter.
	 * This should only be used for internal properties editing. Otherwise, use editFeatureGeometry or setFeatureTags.
	 * @param {Object} feature The edited version of the feature
	 * @param {boolean} [noCheckLevels] Skip checks for levels (default: false)
	 * @return {Object} The clean version of the edited feature (to use in view)
	 */
	editFeature(feature, noCheckLevels) {
		// Find index of this feature in GeoJSON cache
		const featureCacheId = this._findCacheId(feature.id);

		// Save new version in cache
		if(featureCacheId !== -1) {
			if(!noCheckLevels) {
				feature = this._listFeatureLevels(feature, true);
			}

			if(
				this._cacheOsmGeojson.features[featureCacheId] !== feature
				&& !deepEqual(this._cacheOsmGeojson.features[featureCacheId], feature)
			) {
				this._cacheOsmGeojson.features[featureCacheId] = feature;
			}

			return feature;
		}
		else {
			console.error("Can't find feature in cache");
			return null;
		}
	}

	/**
	 * Changes the geometry of a given feature
	 * @param {string} featureId The feature ID
	 * @param {Object} geometry The new GeoJSON geometry
	 * @return {Object} The edited feature
	 */
	editFeatureGeometry(featureId, geometry) {
		const featureCacheId = this._findCacheId(featureId);

		return this._do(new Action(
			Action.FEATURE_GEOM_EDIT,
			[
				featureId,
				featureCacheId !== -1 ? this._cacheOsmGeojson.features[featureCacheId].geometry : null
			],
			arguments
		));
	}

	/**
	 * Raw feature geometry editing
	 * @private
	 */
	_editFeatureGeometry(featureId, geometry) {
		// Find index of this feature in GeoJSON cache
		const featureCacheId = this._findCacheId(featureId);

		// Save new version in cache
		if(featureCacheId !== -1) {
			let feature = Object.assign({}, this._cacheOsmGeojson.features[featureCacheId]);

			if(!deepEqual(feature.geometry, geometry)) {
				// Save geometry
				feature.geometry = geometry;
				this._cacheOsmGeojson.features[featureCacheId] = feature;
			}

			return feature;
		}
		else {
			console.error("Can't find feature in cache");
			return null;
		}
	}

	/**
	 * Changes tags of a given feature.
	 * @param {string} featureId The feature ID
	 * @param {Object} tags The new tags to set on feature
	 * @return {Object} The edited feature
	 */
	setFeatureTags(featureId, tags) {
		const featureCacheId = this._findCacheId(featureId);

		return this._do(new Action(
			Action.FEATURE_TAGS_EDIT,
			[
				featureId,
				featureCacheId !== -1 ? this._cacheOsmGeojson.features[featureCacheId].properties.tags : null
			],
			arguments
		));
	}

	/**
	 * Raw tag editing
	 * @private
	 */
	_setFeatureTags(featureId, tags) {
		const featureCacheId = this._findCacheId(featureId);

		// Save in cache
		if(featureCacheId !== -1) {
			let feature = this._cacheOsmGeojson.features[featureCacheId];

			if(!deepEqual(feature.properties.tags, tags)) {
				feature.properties.tags = tags;
				feature = this._listFeatureLevels(feature, true);

				// Handle utility nodes
				if(feature.id.startsWith("node/")) {
					feature.properties.own.utilityNode = !this.hasMainTags(tags);
				}

				// Clean-up level tag
				if(tags.level) {
					feature.properties.tags.level = this._cleanLevelTag(feature.properties.own.levels);
				}

				this._cacheOsmGeojson.features[featureCacheId] = feature;
			}

			return feature;
		}
		else {
			console.error("Can't find feature in cache");
			return null;
		}
	}

	/**
	 * Is a feature having main tags (important tags)
	 * @param {Object} tags The list of tags
	 * @return {boolean} True if it has important tags
	 */
	hasMainTags(tags) {
		return Object.keys(tags).filter(t => !IGNORED_TAGS.includes(t)).length > 0;
	}

	/**
	 * Makes clean version of level=* tag
	 * @private
	 */
	_cleanLevelTag(levels) {
		// Create clean ranges array
		const ranges = [];

		levels.forEach((l,i) => {
			if(i === 0) {
				ranges.push(l);
			}
			else {
				const prevR = ranges[ranges.length-1];

				if(Array.isArray(prevR)) {
					const prevL = prevR[1];
					if(prevL === l-1) {
						ranges[ranges.length-1][1] = l;
					}
					else {
						ranges.push(l);
					}
				}
				else {
					if(prevR === l-1) {
						ranges.pop();
						ranges.push([prevR, l]);
					}
					else {
						ranges.push(l);
					}
				}
			}
		});

		// Convert into string
		return ranges.map(r => (
			typeof r === "number"
			?
			r.toString()
			:
			(r[0] === r[1]-1 ? r[0].toString()+";"+r[1].toString() : r[0].toString()+"-"+r[1].toString())
		)).join(";");
	}

	/**
	 * Deletes a given feature.
	 * @param {Object} feature The feature
	 * @param {boolean} deleteInside Also delete contained features (only for building/level, defaults to false)
	 */
	deleteFeature(feature, deleteInside) {
		return this._do(new Action(
			Action.FEATURE_DELETE,
			null,
			arguments
		));
	}

	/**
	 * Raw feature deletion
	 * @private
	 */
	_deleteFeature(feature, deleteInside) {
		const featureCacheId = this._findCacheId(feature.id);
		if(featureCacheId !== -1) {
			this._cacheOsmGeojson.features.splice(featureCacheId, 1);

			const isBuilding = feature.properties.tags.building !== undefined;
			const isLevel = feature.properties.tags.indoor === "level";
			const level = isLevel && parseFloat(feature.properties.tags.level);

			if(deleteInside && (isBuilding || (isLevel && !isNaN(level)))) {
				const deleted = [];
				for(let i=0; i < this._cacheOsmGeojson.features.length; i++) {
					const current = this._cacheOsmGeojson.features[i];
					if(
						current.properties.tags.building === undefined
						&& current.properties.tags["building:part"] === undefined
						&& (isBuilding || (isLevel && deepEqual(current.properties.own.levels, [ level ])))
						&& this._containsWithBoundary(feature, current)
					) {
						this._cacheOsmGeojson.features.splice(i, 1);
						deleted.push(current);
						i--;
					}
				}

				// Save deleted feature for undoing
				if(deleted.length > 0) {
					this._actions[this._lastActionId].prev = deleted;
				}
			}
		}
		else {
			console.log("Feature not found in cache");
		}
	}

	/**
	 * Find the feature associated to the OSM node at given coordinates
	 * @param {LatLng} latlng The coordinates of the node
	 * @param {Object} [collection] The GeoJSON FeatureCollection to use (by default currently cached data)
	 * @return {Object} The found node feature (or null if nothing found)
	 */
	findNodeFeature(latlng, collection) {
		collection = collection || this._cacheOsmGeojson;
		let result = null;

		if(collection) {
			const features =
				collection
				.features
				.filter(f => (
					f.geometry.type === "Point"
					&& parseFloat(f.geometry.coordinates[0]) === latlng.lng
					&& parseFloat(f.geometry.coordinates[1]) === latlng.lat
				));

			if(features.length === 1) { result = features[0]; }
		}

		return result;
	}

	/**
	 * Find a particular feature in cache
	 * @param {string} featureId The feature ID
	 * @param {Object} [collection] The GeoJSON FeatureCollection to use (by default currently cached data)
	 * @return {Object} The found feature, or null if not found
	 */
	findFeature(featureId, collection) {
		return (collection || this._cacheOsmGeojson).features.find(f => f.id === featureId);
	}

	/**
	 * Is the small feature on the contour of the wide one ?
	 * @return {boolean} True if on contour
	 */
	isOnContour(wide, small) {
		return !this._booleanContains(wide, small) && this._containsWithBoundary(wide, small);
	}

	/**
	 * @return The original GeoJSON collection (without edits)
	 */
	getBaseCollection() {
		return this._completeGeoJSON(osmtogeojson(this._cacheOsmXml, { flatProperties: false, uninterestingTags: () => false }));
	}

	/**
	 * Creates the diff object for current state of the map
	 * @return {Object} Object with OSM IDs as keys, diff for element as values
	 */
	async computeDiff() {
		return await this._analyzeDiff(
			this.getBaseCollection(),
			this._cacheOsmGeojson
		);
	}

	/**
	 * Creates a new OSM changeset, and uploads to OSM API user edits.
	 * @param {Object} tags Tags to apply on changeset
	 * @return {Promise} Resolves on changeset ID if succeed
	 */
	async sendOSMData(tags) {
		if(window.editor_user && window.editor_user_auth) {
			const diff = await this.computeDiff();

			// Set authentication info
			this._osmApi._auth = window.editor_user_auth;

			// Create changeset
			const mytags = Object.assign({ host: window.EDITOR_URL, locale: I18n.locale }, tags);
			delete mytags.comment;

			let changesetId = null;

			try {
				changesetId = await this._osmApi.createChangeset(
					window.EDITOR_NAME+' '+PACKAGE.version,
					tags.comment || I18n.t("Edited building indoors"),
					mytags
				);
			}
			catch(e) {
				return new Error("Changeset creation failed");
			}

			try {
				if(changesetId) {
					const newElementsIds = {};

					// Sort operations in order to avoid dependency rejections from API
					const order = [
						"node-created", "node-edited",
						"way-created", "way-edited",
						"relation-created", "relation-edited",
						"relation-deleted", "way-deleted", "node-deleted"
					];
					const orderFeat = e => (order.indexOf(e[0].split("/")[0] + "-" + (e[1].deleted ? "deleted" : (e[1].created ? "created" : "edited"))));
					const sort = (a, b) => (orderFeat(a) - orderFeat(b));
					const entries = Object.entries(diff).sort(sort);

					// Apply diff and send nodes to API
					for(const e of entries) {
						const [ elemId, elemDiff ] = e;
						const element = await this._transformDiffIntoElements(elemId, elemDiff, newElementsIds);

						if(element) {
							const res = await this._sendElementToApi(elemId, elemDiff, element, newElementsIds, changesetId);
							if(!res) {
								return new Error("Can't upload element", elemId);
							}
						}
						else {
							console.warn("No element found for", e);
						}
					}

					// Close changeset
					await this._osmApi.closeChangeset(changesetId);
					this._disableBeforeUnload();

					return changesetId;
				}
				else {
					return new Error("Can't create changeset");
				}
			}
			catch(e) {
				return e;
			}
		}
		else {
			console.error("You should be authenticated before sending your changes");
			return new Error("Not authenticated");
		}
	}

	/**
	 * @private
	 */
	async _transformDiffIntoElements(elemId, elemDiff, newElementsIds) {
		let element = null;

		// Replace nodes ID in newNodes
		if(elemDiff.newNodes && elemDiff.newNodes.filter(n => n.startsWith("node/-")).length > 0) {
			elemDiff.newNodes = elemDiff.newNodes
				.map(n => n.startsWith("node/-") ? newElementsIds[n] : n)
				.filter(n => typeof n === "string");
		}

		//TODO Replace members ID in newMembers

		// Create new element
		if(elemDiff.created) {
			if(elemId.startsWith("node/")) {
				element = this._osmApi.createNodeElement(elemDiff.newCoords[1], elemDiff.newCoords[0], elemDiff.newTags, elemId.substring(5));
			}
			else if(elemId.startsWith("way/")) {
				element = this._osmApi.createWayElement(elemDiff.newNodes, elemDiff.newTags, elemId.substring(4));
			}
			else if(elemId.startsWith("relation/")) {
				//TODO No relation created for now
			}
		}
		// Or reuse existing one
		else {
			element = this._osmApi.findElementWithinOSMCollection(this._cacheOsmJson, elemId);

			// Call API if element not available locally
			if(!element) {
				element = await this._osmApi.fetchElement(elemId);
			}
		}

		if(element) {
			// Operations not done in create/delete
			if(!elemDiff.created && !elemDiff.deleted) {
				// Change tags
				if(elemDiff.newTags) {
					element = this._osmApi.replaceTags(element, elemDiff.newTags);
				}

				// Change nodes list
				if(elemDiff.newNodes) {
					element = this._osmApi.setNodeIdsForWay(element, elemDiff.newNodes);
				}

				// Change coordinates
				if(elemDiff.newCoords) {
					element = this._osmApi.setCoordinates(element, elemDiff.newCoords[1], elemDiff.newCoords[0]);
				}

				element = this._osmApi.setTimestampToNow(element);
			}
		}

		return element;
	}

	/**
	 * @private
	 */
	async _sendElementToApi(elemId, elemDiff, element, newElementsIds, changesetId) {
		if(elemDiff.deleted) {
// 			console.log("delete", element, elemDiff);
			return await this._osmApi.deleteElement(element, changesetId);
		}
		else {
// 			console.log("create/update", element, elemDiff);
			const result = await this._osmApi.sendElement(element, changesetId);

			if(result) {
				// Store object ID if created
				if(elemDiff.created) {
					newElementsIds[elemId] = element._type + "/" + result; //TODO To change at osm-request update
				}
				return true;
			}
			else {
				return false;
			}
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
				// Delete feature from cache
				case Action.BUILDING_NEW:
					PubSub.publish("body.select.building", { building: null });
					// eslint-disable-next-line
				case Action.FLOOR_NEW:
					PubSub.publish("body.select.floor", { floor: null });
					// eslint-disable-next-line
				case Action.FEATURE_NEW:
					PubSub.publish("body.select.feature", { feature: null });
					const fid = this._findCacheId(revert.next[0].id);
					if(fid !== -1) {
						this._cacheOsmGeojson.features.splice(fid, 1);
					}
					this._nextId = revert.prev;
					break;

				// Delete copied features
				case Action.FLOOR_COPY:
					PubSub.publish("body.select.feature", { feature: null });
					PubSub.publish("body.select.floor", { floor: null });
					this._cacheOsmGeojson.features = this._cacheOsmGeojson.features.filter(f => parseInt(f.id.split("/")[1]) > revert.prev);
					this._nextId = revert.prev;
					break;

				// Reset previous tags
				case Action.FEATURE_TAGS_EDIT:
					this._setFeatureTags(...revert.prev);
					break;

				// Restore previous geometry
				case Action.FEATURE_GEOM_EDIT:
					this._editFeatureGeometry(...revert.prev);
					break;

				// Restore deleted feature
				case Action.FEATURE_DELETE:
					this._cacheOsmGeojson.features.push(revert.next[0]);
					if(revert.next[1] && revert.prev) {
						this._cacheOsmGeojson.features = this._cacheOsmGeojson.features.concat(revert.prev);
					}
					break;

				// Uncopy feature
				case Action.FEATURE_COPY:
					PubSub.publish("body.select.feature", { feature: null });
					this._cacheOsmGeojson.features.pop();
					this._nextId = revert.prev;
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
		if(!noSave) {
			// Discard next actions, as they will be overwritten by new one
			if(this._actions.length > this._lastActionId + 1) {
				this._actions = this._actions.slice(0, this._lastActionId+1);
			}

			// Save this action
			this._actions.push(action);
			this._lastActionId++;
			this._enableBeforeUnload();
		}

		// Perform the actual action
		switch(action.type) {
			case Action.BUILDING_NEW:
				return this._createNewBuilding(...action.next);

			case Action.FLOOR_NEW:
				return this._createNewFloor(...action.next);

			case Action.FLOOR_COPY:
				return this._copyLevel(...action.next);

			case Action.FEATURE_NEW:
				return this._createNewFeature(...action.next);

			case Action.FEATURE_TAGS_EDIT:
				// Merge current and last action if same tag edited
				if(
					!noSave && this._actions.length >= 2
					&& this._actions[this._actions.length-2].type === Action.FEATURE_TAGS_EDIT
				) {
					const prevAction = this._actions[this._actions.length-2];
					const currAction = this._actions[this._actions.length-1];

					// Same feature
					if(currAction.next[0] === prevAction.next[0]) {
						const tagdiff = [];
						const prevTags = prevAction.next[1];
						const currTags = currAction.next[1];

						Object.entries(currTags).forEach(ct => {
							if(ct[1] !== prevTags[ct[0]]) {
								tagdiff.push(ct[0]);
							}
						});

						// Only one edited tag
						if(tagdiff.length === 1 && (!prevAction.lastMerge || prevAction.lastMerge === tagdiff[0])) {
							if(this._lastActionId === this._actions.length-1) {
								this._lastActionId--;
							}
							this._actions.splice(this._actions.length-2, 1);
							currAction.prev = prevAction.prev;
							currAction.lastMerge = tagdiff[0];
						}
					}
				}
				return this._setFeatureTags(...action.next);

			case Action.FEATURE_GEOM_EDIT:
				return this._editFeatureGeometry(...action.next);

			case Action.FEATURE_DELETE:
				return this._deleteFeature(...action.next);

			case Action.FEATURE_COPY:
				return this._copyFeature(...action.next);

			default:
				return null;
		}
	}

	/**
	 * Computes differences between original data and currently cached data.
	 * @private
	 */
	async _analyzeDiff(prev, next) {
		return new Promise(resolve => { setTimeout(() => {
			const startTs = Date.now();

			let diff = {};
			const nodeNegativeIds = next.features.filter(f => f.id.startsWith("node/-")).map(f => parseInt(f.id.substring(5)));
			nodeNegativeIds.sort((a,b) => a-b);
			let nextNodeId = { val: nodeNegativeIds.length > 0 ? nodeNegativeIds[0] - 1 : -1 };
			next.features = next.features.map(f => this._listFeatureLevels(f));


			// Updates on existing features
			prev.features.forEach(fPrev => {
				let fNext = this.findFeature(fPrev.id, next);
				let featDeleted = !fNext;

				// Check that we're not deleting an used node
				if(featDeleted && fPrev.id.startsWith("node/")) {
					for(let nextF of next.features) {
						if(
							nextF && nextF.properties.own
							&& (
								(nextF.id.startsWith("way/") && nextF.properties.own.nodes && nextF.properties.own.nodes.find(e => e === fPrev.id))
								|| (nextF.id.startsWith("relation/") && nextF.properties.own.members && nextF.properties.own.members.find(e => e.feature === fPrev.id))
							)
						) {
							featDeleted = false;
							fNext = Object.assign({}, fPrev, { properties: { tags: {} } });
							break;
						}
					}
				}

				let tagsChanged = !featDeleted && !deepEqual(fPrev.properties.tags, fNext.properties.tags);
				let geomChanged = !featDeleted && !deepEqual(fPrev.geometry, fNext.geometry);
				let mbrsChanged = !featDeleted && fPrev.id.startsWith("relation/") && fPrev.properties.own.members.filter(m => diff[m.feature] && diff[m.feature].deleted).length > 0;

				if(featDeleted || tagsChanged || geomChanged || mbrsChanged) {
					diff[fPrev.id] = {};
					if(featDeleted) { diff[fPrev.id].deleted = true; }
					if(tagsChanged) { diff[fPrev.id].newTags = fNext.properties.tags; }

					// Geometry changes
					if(geomChanged) {
						// Node
						if(fPrev.id.startsWith("node/")) {
							diff[fPrev.id].newCoords = fNext.geometry.coordinates;
							if(!fNext.properties.own) { fNext.properties.own = {}; }
							fNext.properties.own.fixed = true;
						}
						// Way
						else if(fPrev.id.startsWith("way/")) {
							diff = this._assignNodesToWay(diff, prev, next, fPrev, fNext, nextNodeId);
						}
						// Relation
						else if(fPrev.id.startsWith("relation/")) {
							// Several outer closed ways
							if(
								fNext.geometry.type === "MultiPolygon"
								&& fPrev.properties.own.members.filter(m => m.role === "inner").length === 0
								&& fPrev.properties.own.members.length === fNext.geometry.coordinates.length
							) {
								// Update each contained way
								fNext.geometry.coordinates.forEach((polygon, pid) => {
									const fNextWayId = fPrev.properties.own.members[pid].feature;
									const fNextWay = this.findFeature(fNextWayId, next);

									if(!deepEqual(fNextWay.geometry.coordinates, polygon)) {
										const fNextWayAlt = Object.assign({}, fNextWay);
										fNextWayAlt.geometry.coordinates = polygon;
										diff = this._assignNodesToWay(diff, prev, next, this.findFeature(fNextWayId, prev), fNextWayAlt, nextNodeId);
									}
								});
							}
							// One outer closed way and several inner closed ways
							else if(
								fNext.geometry.type === "Polygon"
								&& fPrev.properties.own.members.filter(m => m.role === "outer").length === 1
							) {
								// Update each contained way
								fNext.geometry.coordinates.forEach((ring, rid) => {
									const fNextWayId = fPrev.properties.own.members[rid].feature;
									const fNextWay = this.findFeature(fNextWayId, next);

									if(!deepEqual(
										fNextWay.geometry.type === "LineString" ?
											fNextWay.geometry.coordinates
											: fNextWay.geometry.coordinates[0],
										ring
									)) {
										const fNextWayAlt = Object.assign({}, fNextWay);
										fNextWayAlt.geometry.coordinates = fNextWay.geometry.type === "LineString" ? ring : [ ring ];
										diff = this._assignNodesToWay(diff, prev, next, this.findFeature(fNextWayId, prev), fNextWayAlt, nextNodeId);
									}
								});
							}
							else {
								console.log("Ignored complex multipolygon", fPrev.id);
							}
						}
					}

					// Relation members changes
					if(mbrsChanged) {
						diff[fPrev.id].newMembers = fPrev.properties.own.members.filter(m => !diff[m.feature] || !diff[m.feature].deleted);
						if(diff[fPrev.id].newMembers.length === 0) {
							diff[fPrev.id] = { deleted: true };
						}
					}
				}
			});


			// New features
			next.features
			.filter(f => this._findCacheId(f.id, prev) === -1)
			.forEach(fNext => {
				diff[fNext.id] = {
					created: true,
					newTags: fNext.properties.tags
				};

				// Geometry
				if(fNext.id.startsWith("node/")) {
					diff[fNext.id].newCoords = fNext.geometry.coordinates;
					if(!fNext.properties.own) { fNext.properties.own = {}; }
					fNext.properties.own.fixed = true;
				}
				else if(fNext.id.startsWith("way/")) {
					diff = this._assignNodesToWay(diff, prev, next, null, fNext, nextNodeId);
				}
				else {
					// We don't allow creating new relations for now
				}
			});


			const nodesAvailable = {};
			next.features
			.forEach(f => {
				if(f.id.startsWith("node/")) {
					nodesAvailable[f.id] = f.geometry.coordinates;
				}
				else if(f.id.startsWith("way/")) {
					const nodesIds = (diff[f.id] && diff[f.id].newNodes ? diff[f.id].newNodes : f.properties.own.nodes);
					nodesIds.forEach(n => {
						const f = this.findFeature(n, next) || this.findFeature(n, prev);
						if(f) {
							nodesAvailable[n] = f.geometry.coordinates;
						}
					});
				}
			});

			Object.entries(diff)
			.filter(e => e[0].startsWith("node/") && e[1].newCoords)
			.forEach(e => nodesAvailable[e[0]] = e[1].newCoords);

			// Add nodes overlapping ways, but not part of them
			// It only merges in specific cases, to keep things connected
			const roomIndoorTagValues = ["room", "area", "corridor", "wall", "level"];
			const dedupeLevels = features => [...new Set(features.map(f => f.properties.own.levels).flat().filter(l => !isNaN(l)))];
			const nodesFromWays = ways => (
				[...new Set(
					ways.map(f => diff[f.id] && diff[f.id].newNodes ? diff[f.id].newNodes : f.properties.own.nodes).flat()
				)]
				.map(n => [ n, nodesAvailable[n] ])
				.filter(n => n[1] !== null)
			);

			const waysInNext = next.features.filter(f => f.id.startsWith("way/"));
			const waysRoads = waysInNext.filter(f => f.properties.tags.highway);
			const waysRooms = waysInNext.filter(f => f.properties.tags.indoor && roomIndoorTagValues.includes(f.properties.tags.indoor));
			const waysBuilding = waysInNext.filter(f => f.properties.tags.building || f.properties.tags["building:part"]);
			const nodesDoors = next.features.filter(f => f.id.startsWith("node") && (f.properties.tags.door || f.properties.tags.entrance));

			// Doors + buildings
			if(nodesDoors.length > 0 && waysBuilding.length > 0) {
				diff = this._connectNodesToWays(
					diff, prev, next,
					nodesDoors.map(f => [ f.id, nodesAvailable[f.id] ]),
					waysBuilding,
					nodesAvailable
				);
			}

			// Doors + roads/rooms
			dedupeLevels(nodesDoors)
			.forEach(lvl => {
				diff = this._connectNodesToWays(
					diff, prev, next,
					nodesDoors.filter(f => f.properties.own.levels.includes(lvl)).map(f => [ f.id, nodesAvailable[f.id] ]),
					waysInNext.filter(f => (
						f.properties.own.levels.includes(lvl)
						&& (
							f.properties.tags.highway
							|| (f.properties.tags.indoor && roomIndoorTagValues.includes(f.properties.tags.indoor))
						)
					)),
					nodesAvailable
				);
			});

			// Roads vertices + roads
			dedupeLevels(waysRoads)
			.forEach(lvl => {
				const waysRoadsLvl = waysRoads.filter(f => f.properties.own.levels.includes(lvl));

				diff = this._connectNodesToWays(
					diff, prev, next,
					nodesFromWays(waysRoadsLvl),
					waysRoadsLvl,
					nodesAvailable
				);
			});

			// Room vertices + rooms
			dedupeLevels(waysRooms)
			.forEach(lvl => {
				const waysRoomsLvl = waysRooms.filter(f => f.properties.own.levels.includes(lvl));

				diff = this._connectNodesToWays(
					diff, prev, next,
					nodesFromWays(waysRoomsLvl),
					waysRoomsLvl,
					nodesAvailable
				);
			});

			// Room vertices + buildings
			const nodesFromRooms = nodesFromWays(waysRooms);
			if(nodesFromRooms.length > 0 && waysBuilding.length > 0) {
				diff = this._connectNodesToWays(
					diff, prev, next,
					nodesFromRooms,
					waysBuilding,
					nodesAvailable
				);
			}


			// Check for duplicated nodes
			const nodeByCoords = {};
			Object.entries(nodesAvailable).forEach(e => {
				const [ nid, coords ] = e;
				const coordsStr = JSON.stringify(coords);
				if(nodeByCoords[coordsStr]) {
					nodeByCoords[coordsStr].push(nid);
				}
				else {
					nodeByCoords[coordsStr] = [ nid ];
				}
			});

			Object.entries(nodeByCoords)
			.map(e => {
				if(e[1].length <= 1) { return null; }
				else {
					// Several nodes at same coordinates
					// Are they different POIs or utility nodes to merge ?
					const nodesToMerge = e[1].map(nid => {
						// Check in diff
						if(diff[nid] && diff[nid].newTags) {
							return this.hasMainTags(diff[nid].newTags) ? null : nid;
						}
						// Check in next collection
						else {
							const f = this.findFeature(nid, next);

							if(f) {
								return this.hasMainTags(f.properties.tags) ? null : nid;
							}
							else {
								return null;
							}
						}
					})
					.filter(nid => nid !== null);

					if(nodesToMerge.length > 1) {
						return [ e[0], nodesToMerge ];
					}
					else {
						return null;
					}
				}
			})
			.filter(e => e !== null)
			.forEach(e => {
				const nodes = e[1];
				const toKeep = nodes.shift();

				// Delete duplicated nodes
				nodes.forEach(n => {
					if(n.startsWith("node/-")) {
						delete diff[n];
					}
					else {
						diff[n] = { deleted: true };
					}

					diff = this._replaceNodeInDiff(diff, next, n, toKeep);
				});
			});


			// Unused nodes
			const newUsedNodes = new Set();
			Object.entries(diff).forEach(e => {
				if(e[0].startsWith("way/") && e[1].newNodes) {
					e[1].newNodes.forEach(n => newUsedNodes.add(n));
				}
			});

			const newNodes = Object.entries(diff).filter(e => e[0].startsWith("node/-"));

			// Look for existing, now useless, nodes
			next.features
			.filter(f => (
				f.id.startsWith("node/")
				&& !f.id.startsWith("node/-")
				&& (
					(diff[f.id] && diff[f.id].deleted)
					||
					(
						!this.hasMainTags(f.properties.tags) // It's not a POI
						&& !newUsedNodes.has(f.id) // It's not used by a new way
						&& (
							!f.properties.own
							|| !f.properties.own.ways
							|| f.properties.own.ways.filter(w => (diff[w] === undefined || (!diff[w].newNodes && !diff[w].deleted))).length === 0
						)
					)
				)
			))
			.forEach(fNext => {
				// Try to reuse instead of deleting
				if(newNodes.length > 0) {
					const [ toReplaceId, toReplaceData ] = newNodes.pop();

					// Replace node
					delete diff[toReplaceId];
					if(!fNext.id.startsWith("node/-")) {
						delete toReplaceData.created;
					}
					if(deepEqual(toReplaceData.newTags, fNext.properties.tags)) {
						delete toReplaceData.newTags;
					}
					diff[fNext.id] = toReplaceData;

					// Replace node references
					diff = this._replaceNodeInDiff(diff, next, toReplaceId, fNext.id);
				}
				else {
					if(fNext.id.startsWith("node/-")) {
						delete diff[fNext.id];
					}
					else {
						diff[fNext.id] = { deleted: true };
					}
				}
			});

			// Double check if list of nodes really changed for way
			Object.entries(diff)
			.filter(e => e[0].startsWith("way/") && e[1].newNodes)
			.forEach(e => {
				const fPrev = this.findFeature(e[0], prev);

				if(fPrev && deepEqual(fPrev.properties.own.nodes, e[1].newNodes)) {
					delete e[1].newNodes;
					if(Object.keys(e[1]).length === 0) {
						delete diff[e[0]];
					}
				}
			});


			// Remove eventual features having no changes after all
			Object.entries(diff)
			.filter(e => Object.keys(e[1]).length === 0)
			.forEach(e => {
				delete diff[e[0]];
			});

// 			console.log("Processed in", Date.now() - startTs, "ms");
// 			console.log("prev", prev);
// 			console.log("next", next);
// 			console.log("diff", diff);

			resolve(diff);
		}, 0); });
	}

	/**
	 * Replaces a node ID in all objects using it
	 * @private
	 */
	_replaceNodeInDiff(diff, next, oldId, newId) {
		next.features
		.filter(f => f.id.startsWith("way/"))
		.forEach(f => {
			// Change in diff
			if(diff[f.id] && diff[f.id].newNodes && diff[f.id].newNodes.includes(oldId)) {
				while(diff[f.id].newNodes.includes(oldId)) {
					diff[f.id].newNodes[diff[f.id].newNodes.indexOf(oldId)] = newId;
				}
			}

			// Change in feature properties and insert in diff
			if((!diff[f.id] || !diff[f.id].newNodes) && f.properties.own && f.properties.own.nodes && f.properties.own.nodes.includes(oldId)) {
				if(!diff[f.id]) { diff[f.id] = {}; }
				diff[f.id].newNodes = f.properties.own.nodes.map(n => n === oldId ? newId : n);
			}
		});

		return diff;
	}

	/**
	 * Add information of which node is used by way
	 * @private
	 */
	_assignNodesToWay(diff, prev, next, fPrev, fNext, nextNodeId) {
		// Empty node list
		const fid = fNext.id;
		let geom = fNext.geometry.type === "LineString" ? fNext.geometry.coordinates : fNext.geometry.coordinates[0];
		geom = geom.filter((c, i) => i === 0 || !deepEqual(geom[i-1], c)); // Avoid following coordinates duplicates

		if(!diff[fid]) { diff[fid] = {}; }
		diff[fid].newNodes = Array.from({
			length: geom.length
		});

		// Try to find nodes at correct position
		geom.forEach((coords, i) => {
			const node = this.findNodeFeature({ lat: coords[1], lng: coords[0] }, next);

			if(node) {
				diff[fid].newNodes[i] = node.id;
			}
		});

		// Associate nodes to the way
		for(let i=0; i < diff[fid].newNodes.length; i++) {
			let nodeId = diff[fid].newNodes[i];
			let coords = geom[i];

			// If this node still not defined
			if(!nodeId) {
				// Check again if not newly created node is available
				const newNode = coords && this.findNodeFeature({ lat: coords[1], lng: coords[0] }, next);

				// Look for nodes exclusively used by this way (for reuse)
				const availableNodes = !newNode && fPrev ? fPrev.properties.own.nodes.filter(nodeId => {
					if(diff[fid].newNodes.includes(nodeId)) {
						return false;
					}
					else {
						const nodeNext = this.findFeature(nodeId, next);
						if(!nodeNext) { return false; }
						else if(!nodeNext.properties || !nodeNext.properties.own) { return true; }
						else if(nodeNext.properties.own.fixed) { return false; }
						else if(!nodeNext.properties.own.ways) { return true; }
						else if(nodeNext.properties.own.ways.length > 1) { return false; }
						else if(nodeNext.properties.own.ways.length === 1 && nodeNext.properties.own.ways[0] === fid) { return true; }
						else { return true; }
					}
				}) : null;

				if(newNode) {
					diff[fid].newNodes[i] = newNode.id;
					newNode.properties.own.fixed = true;
				}
				// Reuse available one
				else if(availableNodes && availableNodes.length > 0) {
					const nodeId = availableNodes.shift();
					diff[nodeId] = { newCoords: coords };
					diff[fid].newNodes[i] = nodeId;
				}
				// Or create new node
				else {
					nodeId = "node/" + nextNodeId.val--;
					diff[nodeId] = { created: true, newCoords: coords, newTags: {} };
					diff[fid].newNodes[i] = nodeId;

					// Push in current data, to make these new nodes reusable
					next.features.push({
						type: "Feature",
						geometry: { type: "Point", coordinates: diff[nodeId].newCoords },
						id: nodeId,
						properties: { tags: {}, own: { fixed: true, ways: [ fid ] } }
					});
				}
			}
		}

		return diff;
	}

	/**
	 * Find coordinates of a node against all data available
	 * @private
	 */
	_findCoords(id, diff, prev, next) {
		if(diff[id] && diff[id].newCoords) { return diff[id].newCoords; }
		else {
			let f = this.findFeature(id, next) || this.findFeature(id, prev);
			if(f) { return f.geometry.coordinates; }
			else { return null; }
		}
	}

	/**
	 * Makes nodes connected to ways if they overlap them.
	 * @private
	 */
	_connectNodesToWays(diff, prev, next, concernedNodes, concernedWays, nodesCoords) {
		if(concernedNodes.length > 0) {
			concernedWays.forEach(way => {
				// Find potential nodes
				const [ minX, minY, maxX, maxY ] = bbox(way);
				const nearNodes = concernedNodes.filter(n => n[1][0] >= minX && n[1][0] <= maxX && n[1][1] >= minY && n[1][1] <= maxY);

				if(nearNodes.length > 0) {
					let wayNodesIds = (diff[way.id] && diff[way.id].newNodes ? diff[way.id].newNodes : way.properties.own.nodes).slice(0);
					let hasChanged = false;

					// Check every segment
					for(let i=0; i < wayNodesIds.length - 1; i++) {
						const nodeStartCoords = nodesCoords[wayNodesIds[i]] || this._findCoords(wayNodesIds[i], diff, prev, next);
						const nodeEndCoords = nodesCoords[wayNodesIds[i+1]] || this._findCoords(wayNodesIds[i+1], diff, prev, next);

						// Check every available node
						if(nodeStartCoords && nodeEndCoords) {
							for(let j=0; j < nearNodes.length; j++) {
								// If aligned with segment, merge
								const [ nodeMidId, nodeMidCoords ] = nearNodes[j];
								if(
									this._isOnLine(
										Number(nodeStartCoords[0]),
										Number(nodeStartCoords[1]),
										Number(nodeMidCoords[0]),
										Number(nodeMidCoords[1]),
										Number(nodeEndCoords[0]),
										Number(nodeEndCoords[1]),
										2e-7
									)
								) {
									wayNodesIds.splice(i+1, 0, nodeMidId);
									hasChanged = true;
									i--;
									break;
								}
							}
						}

						if(hasChanged) {
							if(!diff[way.id]) { diff[way.id] = {}; }
							diff[way.id].newNodes = wayNodesIds;
						}
					}
				}
			});
		}

		return diff;
	}

	/**
	 * Is the point B near to line AC ?
	 * @private
	 */
	_isOnLine(xa, ya, xb, yb, xc, yc, tolerance) {
		if((xa === xb && ya === yb) || (xb === xc && yb === yc)) {
			return false;
		}
		else if(((xa <= xb && xb <= xc) || (xa >= xb && xb >= xc)) && ((ya <= yb && yb <= yc) || (ya >= yb && yb >= yc))) {
			const Dx = xc - xa;
			const Dy = yc - ya;
			const d = Math.abs(Dy*xb - Dx*yb - xa*yc+xc*ya)/Math.sqrt(Math.pow(Dx, 2) + Math.pow(Dy, 2));
			return d <= tolerance;
		}
		else {
			return false;
		}
	}

	/**
	 * Add other info to GeoJSON cache, in order to keep track of relations between objects
	 * @private
	 */
	_completeGeoJSON(collection) {
		//Add namespace for the editor
		const featureById = {};
		collection.features.forEach(f => {
			f.properties.own = {};
			featureById[f.id] = f;
		});

		//Check every feature
		const list = this._cacheOsmXml.children[0];
		for(let entry of list.children) {
			// Nodes
			if(entry.nodeName === "node") {
				const id = "node/"+entry.getAttribute("id");

				//Add utility nodes (not having "useful" tags)
				if(!featureById[id]) {
					const feature = {
						id: id,
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [ entry.getAttribute("lon"), entry.getAttribute("lat") ]
						},
						properties: {
							own: { levels: [], utilityNode: true },
							tags: {}
						}
					};
					featureById[id] = feature;
					collection.features.push(feature);
				}
			}
			// Ways
			else if(entry.nodeName === "way") {
				const wayId = "way/"+entry.getAttribute("id");
				const way = featureById[wayId];

				// List nodes being a part of this way
				if(way) {
					way.properties.own.nodes = [];

					for(let subentry of entry.children) {
						if(subentry.nodeName === "nd") {
							const nodeId = "node/"+subentry.getAttribute("ref");
							const node = featureById[nodeId];
							way.properties.own.nodes.push(nodeId);

							if(node) {
								if(!node.properties.own.ways) { node.properties.own.ways = []; }
								node.properties.own.ways.push(wayId);
							}
						}
					}
				}
			}
			// Relations
			else if(entry.nodeName === "relation") {
				const id = "relation/"+entry.getAttribute("id");
				const relation = featureById[id];

				if(relation) {
					relation.properties.own.members = [];

					for(let subentry of entry.children) {
						if(subentry.nodeName === "member") {
							relation.properties.own.members.push({
								role: subentry.getAttribute("role"),
								feature: subentry.getAttribute("type")+"/"+subentry.getAttribute("ref")
							});
						}
					}
				}
			}
		}

		return collection;
	}

	/**
	 * Find index of this feature in GeoJSON cache
	 * @private
	 */
	_findCacheId(featureId, collection) {
		return (collection || this._cacheOsmGeojson).features.findIndex(f => f.id === featureId);
	}

	/**
	 * Compute proper list of levels for a given feature
	 * @param {Object} feature The feature to compute
	 * @return {Object} The same feature, with list of levels in feature.properties.own.levels
	 * @private
	 */
	_listFeatureLevels(feature, force) {
		if(!force && feature.properties.own && (feature.properties.own.levels || feature.properties.own.utilityNode)) {
			return feature;
		}
		else {
			if(!feature.properties.own) {
				feature.properties.own = {};
			}

			feature.properties.own.levels = [];

			const tags = feature.properties.tags;

			//No tags
			if(tags === null || Object.keys(tags).length === 0) {
				feature.properties.own.levels = [ 0 ];
			}
			//Tag level + repeat_on
			else if(tags.level !== undefined && tags.repeat_on !== undefined) {
				const lvl1 = this._parseLevelsFloat(tags.level);
				const lvl2 = this._parseLevelsFloat(tags.repeat_on);

				if(lvl1 !== null && lvl2 !== null) {
					feature.properties.own.levels = lvl1.concat(lvl2);
				}
				else if(lvl1 !== null) {
					feature.properties.own.levels = lvl1;
				}
				else if(lvl2 !== null) {
					feature.properties.own.levels = lvl2;
				}
				else {
					feature.properties.own.levels = [ 0 ];
				}
			}
			//Tag level
			else if(tags.level !== undefined) {
				feature.properties.own.levels = this._parseLevelsFloat(tags.level);
			}
			//Tag repeat_on
			else if(tags.repeat_on !== undefined) {
				feature.properties.own.levels = this._parseLevelsFloat(tags.repeat_on);
			}
			//Tag min_level and max_level
			else if(tags.min_level !== undefined && tags.max_level !== undefined) {
				feature.properties.own.levels = this._parseLevelsFloat(tags.min_level+"-"+tags.max_level);
			}
			//Tag buildingpart:verticalpassage:floorrange
			else if(tags["buildingpart:verticalpassage:floorrange"] !== undefined) {
				feature.properties.own.levels = this._parseLevelsFloat(tags["buildingpart:verticalpassage:floorrange"]);
			}
			//Tag building:levels (and optionally building:min_level)
			else if(tags["building:levels"] !== undefined) {
				const upperLevel = Math.ceil(parseFloat(tags["building:levels"])) - 1;
				feature.properties.own.levels = this._parseLevelsFloat(((tags["building:min_level"] !== undefined) ? tags["building:min_level"] : "0")+"-"+upperLevel);
			}
			//Relations type=level
			else if(feature.properties.relations !== undefined && feature.properties.relations.length > 0) {
				feature.properties.own.levels = [];

				//Try to find type=level relations, and add level value in level array
				for(const rel of feature.properties.relations) {
					if(rel.reltags.type === "level" && rel.reltags.level !== undefined) {
						const relLevel = this._parseLevelsFloat(rel.reltags.level);

						//Test if level value in relation is unique
						if(relLevel.length === 1) {
							feature.properties.own.levels.push(relLevel[0]);
						}
						else {
							console.error("Invalid level value for relation "+rel.rel);
						}
					}
				}
			}

			//Reset list if no level found
			if(!feature.properties.own.levels) {
				feature.properties.own.levels = [];
			}

			// Set default level to 0 if none found and not a landuse like feature
			if(feature.properties.own.levels.length === 0 && !this._isLanduse(feature)) {
				feature.properties.own.levels = [ 0 ];
			}

			feature.properties.own.levels.sort(sortNumberArray);
			return feature;
		}
	}

	_isLanduse(feature) {
		const t = feature.properties.tags;
		return t.landuse || ["school","university","college","hospital"].includes(t.amenity) || t.boundary || t["disused:boundary"];
	}

	/**
	 * Failsafe wrapper around booleanContains
	 * @private
	 */
	_booleanContains(wide, small) {
		try {
			return booleanContains(wide, small);
		}
		catch(e) {
			console.error("Unsupported operation for multipolygon", wide.id, small.id);
			return false;
		}
	}

	/**
	* Parses levels list.
	* @param str The levels as a string (for example "1;5", "1,3", "1-3", "-1--6", "from 1 to 42" or "-2 to 6")
	* @return The parsed levels as a float array, or null if invalid
	* @private
	*/
	_parseLevelsFloat(str) {
		if(!str || typeof str !== "string" || str.trim().length === 0) {
			return null;
		}

		let result = null;

		//Level values separated by ';'
		const regex1 = /^-?\d+(?:\.\d+)?(?:;-?\d+(?:\.\d+)?)*$/;

		//Level values separated by ','
		const regex2 = /^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*$/;

		if(regex1.test(str)) {
			result = str.split(';').map(parseFloat);
			result.sort(sortNumberArray);
		}
		else if(regex2.test(str)) {
			result = str.split(',').map(parseFloat);
			result.sort(sortNumberArray);
		}
		//Level intervals
		else {
			let regexResult = null;
			let min = null;
			let max = null;

			//Level values (only integers) in an interval, bounded with '-'
			const regex3 = /^(-?\d+)-(-?\d+)$/;

			//Level values from start to end (example: "-3 to 2")
			const regex4 = /^(?:\w+ )?(-?\d+) to (-?\d+)$/;

			if(regex3.test(str)) {
				regexResult = regex3.exec(str);
				min = parseInt(regexResult[1]);
				max = parseInt(regexResult[2]);
			}
			else if(regex4.test(str)) {
				regexResult = regex4.exec(str);
				min = parseInt(regexResult[1]);
				max = parseInt(regexResult[2]);
			}

			//Add values between min and max
			if(regexResult !== null && min !== null && max !== null) {
				result = [];
				if(min > max) {
					const tmp = min;
					min = max;
					max = tmp;
				}

				//Add intermediate values
				for(let i = min; i !== max; i = i + ((max-min) / Math.abs(max-min))) {
					result.push(i);
				}

				result.push(max);
			}
		}

		return result;
	}

	/**
	 * Enable message before quitting page
	 * @private
	 */
	_enableBeforeUnload() {
		window.onbeforeunload = () => {
			return I18n.t("Did you save all your changes ? If not, your changes will be lost.")
		};
	}

	/**
	 * Disable message before quitting page
	 * @private
	 */
	_disableBeforeUnload() {
		window.onbeforeunload = null;
	}
}

export default VectorDataManager;
