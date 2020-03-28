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

import VectorDataManager from './VectorDataManager';
import assert from 'assert';
import { LatLng } from 'leaflet';
import deepEqual from 'fast-deep-equal';
import CONFIG from '../../public/config.json';
window.CONFIG = CONFIG;

describe("ctrl > VectorDataManager", () => {
	it("can be created", () => {
		const vdm = new VectorDataManager();
		assert.ok(vdm !== null);
	});

	describe("_listFeatureLevels", () => {
		const vdm = new VectorDataManager();

		it("works with level=* range", () => {
			const feature = { properties: {
				tags: { level: "0-3" },
				own: {}
			} };

			vdm._listFeatureLevels(feature);
			assert.equal(feature.properties.own.levels.toString(), [ 0,1,2,3 ].toString());
			feature.properties.own.levels.forEach(l => assert.equal(typeof l, "number"));
		});

		it("works with level=* + repeat_on=*", () => {
			const feature = { properties: {
				tags: { level: "1", repeat_on: "2-5" },
				own: {}
			} };

			vdm._listFeatureLevels(feature);
			assert.equal(feature.properties.own.levels.toString(), [ 1,2,3,4,5 ].toString());
			feature.properties.own.levels.forEach(l => assert.equal(typeof l, "number"));
		});

		it("works with level=* + repeat_on=*, overlapping, unsorted", () => {
			const feature = { properties: {
				tags: { level: "2;3;4", repeat_on: "4;5;1" },
				own: {}
			} };
			vdm._listFeatureLevels(feature);
			assert.equal(feature.properties.own.levels.toString(), [ 1,2,3,4,5 ].toString());
			feature.properties.own.levels.forEach(l => assert.equal(typeof l, "number"));
		});

		it("works with building:levels=*", () => {
			const feature = { properties: {
				tags: { "building:levels": "5", "building:levels:underground": "3", "roof:levels": "1" }
				,
				own: {}
			} };

			vdm._listFeatureLevels(feature);
			assert.equal(feature.properties.own.levels.toString(), [ -3, -2, -1, 0, 1, 2, 3, 4, 5 ].toString());
			feature.properties.own.levels.forEach(l => assert.equal(typeof l, "number"));
		});
	});

	describe("_cleanLevelTag", () => {
		it("works with single level", () => {
			const vdm = new VectorDataManager();
			const levels = [ -1 ];
			assert.equal(vdm._cleanLevelTag(levels), "-1");
		});

		it("works with several non-following levels", () => {
			const vdm = new VectorDataManager();
			const levels = [ -1, 1, 3, 5 ];
			assert.equal(vdm._cleanLevelTag(levels), "-1;1;3;5");
		});

		it("works with several following levels", () => {
			const vdm = new VectorDataManager();
			const levels = [ -1, 0, 1 ];
			assert.equal(vdm._cleanLevelTag(levels), "-1-1");
		});

		it("works with a mix of following and non following levels", () => {
			const vdm = new VectorDataManager();
			const levels = [ -1, 0, 1, 3, 5, 6, 7, 10 ];
			assert.equal(vdm._cleanLevelTag(levels), "-1-1;3;5-7;10");
		});

		it("works with following levels but doesn't create interval if its length is two", () => {
			const vdm = new VectorDataManager();
			const levels = [ 0,1,3,4,5,10 ];
			assert.equal(vdm._cleanLevelTag(levels), "0;1;3-5;10");
		});
	});

	describe("findNodeFeature", () => {
		it("finds correct node", () => {
			const vdm = new VectorDataManager();
			vdm._cacheOsmGeojson = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", geometry: { type: "Point", coordinates: [ 1.234, -4.5698 ] } },
				{ type: "Feature", id: "way/1", geometry: { type: "LineString" } },
				{ type: "Feature", id: "way/2", geometry: { type: "Point", coordinates: [ 1.2345, -4.56989 ] } }
			] };

			const res = vdm.findNodeFeature(new LatLng(-4.5698, 1.234));
			assert.equal(res.id, "node/1");
		});

		it("returns null if no result found", () => {
			const vdm = new VectorDataManager();
			vdm._cacheOsmGeojson = { type: "FeatureCollection", features: [] };

			const res = vdm.findNodeFeature(new LatLng(-4.5698, 1.234));
			assert.equal(res, null);
		});
	});

	describe("_isOnLine", () => {
		it("works", () => {
			const vdm = new VectorDataManager();

			// Perfectly aligned
			assert.ok(vdm._isOnLine(0,0,1,1,2,2,0.1));
			assert.ok(vdm._isOnLine(0,0,-1,-1,-2,-2,0.1));
			assert.ok(vdm._isOnLine(2,2,1,1,0,0,0.1));
			assert.ok(vdm._isOnLine(-2,-2,-1,-1,0,0,0.1));

			// Not on line
			assert.ok(!vdm._isOnLine(0,0,1.2,1,2,2,0.1));
			assert.ok(!vdm._isOnLine(0,0,-1.2,-1,-2,-2,0.1));
			assert.ok(!vdm._isOnLine(2,2,1.2,1,0,0,0.1));
			assert.ok(!vdm._isOnLine(-2,-2,-1.2,-1,0,0,0.1));

			// Out of the box
			assert.ok(!vdm._isOnLine(0,0,-1,-1,2,2,0.1));
			assert.ok(!vdm._isOnLine(0,0,1,1,-2,-2,0.1));
			assert.ok(!vdm._isOnLine(2,2,-1,-1,0,0,0.1));
			assert.ok(!vdm._isOnLine(-2,-2,1,1,0,0,0.1));

			// Under tolerance
			assert.ok(vdm._isOnLine(0,0,1.05,1,2,2,0.1));
			assert.ok(vdm._isOnLine(0,0,-1,-1.05,-2,-2,0.1));
			assert.ok(vdm._isOnLine(2,2,1.05,1,0,0,0.1));
			assert.ok(vdm._isOnLine(-2,-2,-1,-1.05,0,0,0.1));
		});
	});

	describe("_analyzeDiff", async () => {
		it("has no difference if no changes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1" } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1" } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };

			const res = await vdm._analyzeDiff(prev, next);
			assert.equal(Object.keys(res).length, 0);
		});

		it("lists tags changes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1", brand: "Popo Land" } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1", name: "Toilettes d'en haut" } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.equal(res["node/1"].newTags.amenity, "toilets");
			assert.equal(res["node/1"].newTags.level, "1");
			assert.equal(res["node/1"].newTags.name, "Toilettes d'en haut");
		});

		it("lists tags deletions", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1", name: "Toilettes d'en haut" } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1" } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.equal(Object.keys(res["node/1"].newTags).length, 2);
			assert.equal(res["node/1"].newTags.amenity, "toilets");
			assert.equal(res["node/1"].newTags.level, "1");
		});

		it("lists geom changes for nodes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1" } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1" } }, geometry: { type: "Point", coordinates: [2,5] } }
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.equal(res["node/1"].newCoords.length, 2);
			assert.equal(res["node/1"].newCoords[0], 2);
			assert.equal(res["node/1"].newCoords[1], 5);
		});

		it("lists new nodes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/-1", properties: { tags: { amenity: "toilets", level: "1" } }, geometry: { type: "Point", coordinates: [2,5] } }
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(res["node/-1"].newCoords.length, 2);
			assert.equal(res["node/-1"].newCoords[0], 2);
			assert.equal(res["node/-1"].newCoords[1], 5);
			assert.equal(res["node/-1"].newTags.amenity, "toilets");
			assert.equal(res["node/-1"].newTags.level, "1");
			assert.ok(res["node/-1"].created);
		});

		it("lists deleted nodes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { amenity: "toilets", level: "1" } }, geometry: { type: "Point", coordinates: [2,5] } }
			] };
			const next = { type: "FeatureCollection", features: [] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.ok(res["node/1"].deleted);
		});

		it("handles case of overlapping nodes which could be created", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/-1", properties: { tags: {} }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/-1",
					properties: {
						tags: { highway: "footway", level: "0" }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				},
				{
					type: "Feature", id: "way/-2",
					properties: {
						tags: { highway: "footway", level: "0" }
					},
					geometry: { type: "LineString", coordinates: [[0,1], [1,1]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 5);

			assert.equal(Object.keys(res["way/-1"]).length, 3);
			assert.equal(Object.keys(res["way/-2"]).length, 3);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["node/-2"]).length, 3);
			assert.equal(Object.keys(res["node/-3"]).length, 3);

			assert.equal(res["way/-1"].created, true);
			assert.equal(res["way/-2"].created, true);
			assert.equal(res["node/-1"].created, true);
			assert.equal(res["node/-2"].created, true);
			assert.equal(res["node/-3"].created, true);

			assert.ok(deepEqual(res["way/-1"].newTags, { highway: "footway", level: "0" }));
			assert.ok(deepEqual(res["way/-2"].newTags, { highway: "footway", level: "0" }));
			assert.ok(deepEqual(res["node/-1"].newTags, {}));
			assert.ok(deepEqual(res["node/-2"].newTags, {}));
			assert.ok(deepEqual(res["node/-3"].newTags, {}));

			assert.ok(deepEqual(res["way/-1"].newNodes, [ "node/-2", "node/-1" ]));
			assert.ok(deepEqual(res["way/-2"].newNodes, [ "node/-1", "node/-3" ]));
			assert.ok(deepEqual(res["node/-1"].newCoords, [0,1]));
			assert.ok(deepEqual(res["node/-2"].newCoords, [0,0]));
			assert.ok(deepEqual(res["node/-3"].newCoords, [1,1]));
		});

		it("handles case of overlapping existing nodes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/3", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,1], [1,1]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/-1", properties: { tags: { amenity: "drinking_water", level: "0" } }, geometry: { type: "Point", coordinates: [0.5,0.9] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/3", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,1], [1,1]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);

			assert.equal(Object.keys(res["way/2"]).length, 1);
			assert.equal(Object.keys(res["node/3"]).length, 2);

			assert.ok(deepEqual(res["node/3"].newCoords, [0.5,0.9]));
			assert.ok(deepEqual(res["node/3"].newTags, {amenity: "drinking_water", level: "0"}));

			assert.ok(deepEqual(res["way/2"].newNodes, ["node/2", "node/4"]));
		});

		it("handles case of overlapping existing nodes with new level connection", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/-1", properties: { tags: { "door": "no", "level": "0" }, own: { ways: [] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);

			assert.equal(Object.keys(res["node/2"]).length, 1);

			assert.ok(deepEqual(res["node/2"].newTags, { "door": "no", "level": "0" }));
		});

		it("handles case of overlapping existing nodes with a POI feature", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/-1", properties: { tags: { emergency: "fire_hydrant", level: "0" }, own: { ways: [] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);

			assert.equal(Object.keys(res["node/-1"]).length, 3);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newTags, { emergency: "fire_hydrant", level: "0" }));
			assert.ok(deepEqual(res["node/-1"].newCoords, [0,1]));
		});

		it("handles case of multiple, overlapping, existing nodes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1", "way/3" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: [ "way/3" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/3", "node/5" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,1], [1,1]] }
				},
				{
					type: "Feature", id: "way/3",
					properties: {
						tags: { highway: "footway", level: "1" },
						own: { nodes: [ "node/1", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1", "way/3" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: [ "way/3" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/3", "node/5" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,1], [1,1]] }
				},
				{
					type: "Feature", id: "way/3",
					properties: {
						tags: { highway: "footway", level: "1", name: "South corridor" },
						own: { nodes: [ "node/1", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 4);

			assert.equal(Object.keys(res["way/2"]).length, 1);
			assert.equal(Object.keys(res["way/3"]).length, 2);
			assert.equal(Object.keys(res["node/3"]).length, 1);
			assert.equal(Object.keys(res["node/4"]).length, 1);

			assert.ok(res["node/3"].deleted);
			assert.ok(res["node/4"].deleted);
			assert.ok(deepEqual(res["way/2"].newNodes, ["node/2", "node/5"]));
			assert.ok(deepEqual(res["way/3"].newNodes, ["node/1", "node/2"]));
			assert.ok(deepEqual(res["way/3"].newTags, { highway: "footway", level: "1", name: "South corridor" }));
		});

		it("does not merge overlapping nodes if they are distinct POIs", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1", "way/2" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: { man_made: "survey_point", ele: "15" } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/2", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,1], [1,1]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: [ "way/1" ] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: [ "way/1", "way/2" ] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: { man_made: "survey_point", ele: "15" } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: [ "way/2" ] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/-1", properties: { tags: { amenity: "drinking_water", level: "0" } }, geometry: { type: "Point", coordinates: [0.5,0.9] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,0], [0,1]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/2", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [[0,1], [1,1]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(res["node/-1"].created, true);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0.5,0.9]));
			assert.ok(deepEqual(res["node/-1"].newTags, {amenity: "drinking_water", level: "0"}));
		});

		it("lists geom changes for single way", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0.5], [1,2], [0,0]]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.equal(Object.keys(res["node/3"]).length, 1);

			assert.equal(res["node/2"].newCoords[0], 1);
			assert.equal(res["node/2"].newCoords[1], 0.5);
			assert.equal(res["node/3"].newCoords[0], 1);
			assert.equal(res["node/3"].newCoords[1], 2);
		});

		it("lists tags changes for single way", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0", room: "office" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.ok(deepEqual(res["way/1"].newTags, { indoor: "room", level: "0", room: "office" }));
		});

		it("lists geom changes for single way with new nodes in it", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,1], [0,0]]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.equal(res["way/1"].newNodes.length, 5);
			assert.equal(res["way/1"].newNodes[0], "node/1");
			assert.equal(res["way/1"].newNodes[1], "node/2");
			assert.equal(res["way/1"].newNodes[2], "node/3");
			assert.equal(res["way/1"].newNodes[3], "node/-1");
			assert.equal(res["way/1"].newNodes[4], "node/1");

			assert.ok(res["node/-1"].created);
			assert.equal(res["node/-1"].newCoords[0], 0);
			assert.equal(res["node/-1"].newCoords[1], 1);
			assert.equal(Object.keys(res["node/-1"].newTags), 0);
		});

		it("lists geom changes for single way with new nodes in it and existing nodes moved", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [0.9,0.7], [1,1], [0,1], [0,0]]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 3);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.equal(res["way/1"].newNodes.length, 5);
			assert.equal(res["way/1"].newNodes[0], "node/1");
			assert.equal(res["way/1"].newNodes[1], "node/2");
			assert.equal(res["way/1"].newNodes[2], "node/3");
			assert.equal(res["way/1"].newNodes[3], "node/-1");
			assert.equal(res["way/1"].newNodes[4], "node/1");

			assert.ok(res["node/-1"].created);
			assert.equal(res["node/-1"].newCoords[0], 0);
			assert.equal(res["node/-1"].newCoords[1], 1);
			assert.equal(Object.keys(res["node/-1"].newTags), 0);

			assert.equal(res["node/2"].newCoords[0], 0.9);
			assert.equal(res["node/2"].newCoords[1], 0.7);
		});

		it("lists changes of nodes in a way moved", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [2,2], [0,0]]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/3"]).length, 1);

			assert.equal(res["node/3"].newCoords[0], 2);
			assert.equal(res["node/3"].newCoords[1], 2);
		});

		it("lists new ways and reuse nodes if possible", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {} }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {} }, geometry: { type: "Point", coordinates: [1,0] } },
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {} }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {} }, geometry: { type: "Point", coordinates: [1,0] } },
				{
					type: "Feature", id: "way/-1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: {}
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["way/-1"]).length, 3);

			assert.ok(res["node/-1"].created);
			assert.equal(res["node/-1"].newCoords[0], 1);
			assert.equal(res["node/-1"].newCoords[1], 1);
			assert.equal(Object.keys(res["node/-1"].newTags), 0);

			assert.ok(res["way/-1"].created);
			assert.equal(res["way/-1"].newNodes.length, 4);
			assert.equal(res["way/-1"].newNodes[0], "node/1");
			assert.equal(res["way/-1"].newNodes[1], "node/2");
			assert.equal(res["way/-1"].newNodes[2], "node/-1");
			assert.equal(res["way/-1"].newNodes[3], "node/1");
		});

		it("lists deleted ways", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 4);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.equal(Object.keys(res["node/3"]).length, 1);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.ok(res["node/1"].deleted);
			assert.ok(res["node/2"].deleted);
			assert.ok(res["node/3"].deleted);
			assert.ok(res["way/1"].deleted);
		});

		it("lists deleted ways but keeps POI nodes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: { emergency: "fire_hydrant", level: "0" }, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: { emergency: "fire_hydrant", level: "0" }, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } }
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 3);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.ok(res["node/1"].deleted);
			assert.ok(res["node/2"].deleted);
			assert.ok(res["way/1"].deleted);
		});

		it("lists deleted ways but keeps still used nodes", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1", "way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [1,2] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/3", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [ [1,1], [1,2] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1", "way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [1,2] } },
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/3", "node/4" ] }
					},
					geometry: { type: "LineString", coordinates: [ [1,1], [1,2] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 3);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.ok(res["node/1"].deleted);
			assert.ok(res["node/2"].deleted);
			assert.ok(res["way/1"].deleted);
		});

		it("lists deleted nodes but keeps still used ones", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: { door: "hinged" }, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);
			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.ok(deepEqual(res["node/1"].newTags, {}));
		});

		it("reuses nodes created dynamically by new ways", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [] };

			const next = { type: "FeatureCollection", features: [
				{
					type: "Feature", id: "way/-1",
					properties: {
						tags: { building: "yes" },
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [1,0], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/-2",
					properties: {
						tags: { indoor: "room", level: "0" },
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,0.5], [0.5,0.5], [0.5,0], [0,0] ]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 9);

			Object.entries(res).forEach(e => {
				assert.equal(Object.keys(e[1]).length, 3);
				assert.ok(e[1].created);
				if(e[0].startsWith("node/")) {
					assert.equal(Object.keys(e[1].newTags), 0);
				}
			});

			assert.equal(res["node/-1"].newCoords[0], 0);
			assert.equal(res["node/-1"].newCoords[1], 0);
			assert.equal(res["node/-2"].newCoords[0], 0);
			assert.equal(res["node/-2"].newCoords[1], 1);
			assert.equal(res["node/-3"].newCoords[0], 1);
			assert.equal(res["node/-3"].newCoords[1], 1);
			assert.equal(res["node/-4"].newCoords[0], 1);
			assert.equal(res["node/-4"].newCoords[1], 0);
			assert.equal(res["node/-5"].newCoords[0], 0);
			assert.equal(res["node/-5"].newCoords[1], 0.5);
			assert.equal(res["node/-6"].newCoords[0], 0.5);
			assert.equal(res["node/-6"].newCoords[1], 0.5);
			assert.equal(res["node/-7"].newCoords[0], 0.5);
			assert.equal(res["node/-7"].newCoords[1], 0);

			assert.ok(deepEqual(res["way/-1"].newTags, { building: "yes" }));
			assert.ok(deepEqual(res["way/-2"].newTags, { indoor: "room", level: "0" }));

			assert.ok(deepEqual(res["way/-1"].newNodes, [ "node/-1", "node/-5", "node/-2", "node/-3", "node/-4", "node/-7", "node/-1" ]));
			assert.ok(deepEqual(res["way/-2"].newNodes, [ "node/-1", "node/-5", "node/-6", "node/-7", "node/-1" ]));
		});

		it("lists geom changes for several, connected ways", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/2", "node/3" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,1], [1,1] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0.5,0.5] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/2", "node/3" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0.5,0.5], [1,1] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 1);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.ok(deepEqual(res["node/2"].newCoords, [0.5,0.5]));
		});

		it("deassociate common nodes if not shared", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/2", "node/3" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,1], [1,1] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0.5,0.5] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/2", "node/3" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,1], [1,1] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);

			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["way/1"]).length, 1);
			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0.5,0.5]));
			assert.ok(deepEqual(res["way/1"].newNodes, ["node/1", "node/-1"]));
		});

		it("handles changes on multipolygons", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [2,2] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [2,3] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [3,3] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [2,2], [2,3], [3,3], [2,2] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "outer", feature: "way/2" } ] }
					},
					geometry: { type: "MultiPolygon", coordinates: [ [[ [0,0], [0,1], [1,1], [0,0] ]], [[ [2,2], [2,3], [3,3], [2,2] ]] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [2,2] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [2,3] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [3,3] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [2,2], [2,3], [3,3], [2,2] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon", name: "Level ZERO" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "outer", feature: "way/2" } ] }
					},
					geometry: { type: "MultiPolygon", coordinates: [ [[ [0,0], [0.5,1.3], [1.2,1.1], [0,0] ]], [[ [2,2], [2,3.4], [3,3], [2,2] ]] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 4);

			assert.equal(Object.keys(res["relation/1"]).length, 1);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.equal(Object.keys(res["node/3"]).length, 1);
			assert.equal(Object.keys(res["node/5"]).length, 1);

			assert.ok(deepEqual(res["relation/1"].newTags, { indoor: "level", level: "0", type: "multipolygon", name: "Level ZERO" }));
			assert.ok(deepEqual(res["node/2"].newCoords, [0.5,1.3]));
			assert.ok(deepEqual(res["node/3"].newCoords, [1.2,1.1]));
			assert.ok(deepEqual(res["node/5"].newCoords, [2,3.4]));
		});

		it("handle changes on polygon geoms represented as relations", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.2,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.8,0.9] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [1,1], [0,0] ], [ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.2,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.8,0.9] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [1.1,1.1], [0,0] ], [ [0.2,0.1], [0.1,0.9], [0.95,0.96], [0.2,0.1] ] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);
			assert.equal(Object.keys(res["node/3"]).length, 1);
			assert.equal(Object.keys(res["node/6"]).length, 1);

			assert.ok(deepEqual(res["node/3"].newCoords, [1.1,1.1]));
			assert.ok(deepEqual(res["node/6"].newCoords, [0.95,0.96]));
		});

		it("handle changes on polygon geoms represented as relations, but nodes also used elsewhere", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.2,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.8,0.9] } },
				{ type: "Feature", id: "node/7", properties: { tags: {}, own: { ways: ["way/3"] } }, geometry: { type: "Point", coordinates: [1,2] } },
				{ type: "Feature", id: "node/8", properties: { tags: {}, own: { ways: ["way/3"] } }, geometry: { type: "Point", coordinates: [2,2] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ]] }
				},
				{
					type: "Feature", id: "way/3",
					properties: {
						tags: { highway: "footway" },
						own: { nodes: [ "node/3", "node/7", "node/8", "node/3" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [1,1], [1,2], [2,2], [1,1] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [1,1], [0,0] ], [ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.2,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.8,0.9] } },
				{ type: "Feature", id: "node/7", properties: { tags: {}, own: { ways: ["way/3"] } }, geometry: { type: "Point", coordinates: [1,2] } },
				{ type: "Feature", id: "node/8", properties: { tags: {}, own: { ways: ["way/3"] } }, geometry: { type: "Point", coordinates: [2,2] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ]] }
				},
				{
					type: "Feature", id: "way/3",
					properties: {
						tags: { highway: "footway" },
						own: { nodes: [ "node/3", "node/7", "node/8", "node/3" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [1,1], [1,2], [2,2], [1,1] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [0.95,0.95], [0,0] ], [ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.ok(deepEqual(res["node/-1"].newCoords, [0.95,0.95]));
			assert.ok(deepEqual(res["node/-1"].newTags, {}));
			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["way/1"].newNodes, ["node/1", "node/2", "node/-1", "node/1"]));
		});

		it("handles deletion of elements from relation", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.9,0.9] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [1,1], [0,0] ], [ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.2,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.8,0.9] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [1,1], [0,0] ], [ [0.2,0.1], [0.1,0.9], [0.8,0.9], [0.2,0.1] ] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 5);
			assert.equal(Object.keys(res["node/4"]).length, 1);
			assert.equal(Object.keys(res["node/5"]).length, 1);
			assert.equal(Object.keys(res["node/6"]).length, 1);
			assert.equal(Object.keys(res["way/2"]).length, 1);
			assert.equal(Object.keys(res["relation/1"]).length, 1);

			assert.ok(res["node/4"].deleted);
			assert.ok(res["node/5"].deleted);
			assert.ok(res["node/6"].deleted);
			assert.ok(res["way/2"].deleted);
			assert.ok(deepEqual(res["relation/1"].newMembers, [ { role: "outer", feature: "way/1" } ]));
		});

		it("deletes empty relations", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.9,0.9] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: {},
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: {},
						own: { nodes: [ "node/4", "node/5", "node/6", "node/4" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0.1,0.1], [0.1,0.9], [0.9,0.9], [0.1,0.1] ]] }
				},
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [1,1], [0,0] ], [ [0.1,0.1], [0.1,0.9], [0.9,0.9], [0.1,0.1] ] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.1] } },
				{ type: "Feature", id: "node/5", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.1,0.9] } },
				{ type: "Feature", id: "node/6", properties: { tags: {}, own: { ways: ["way/2"] } }, geometry: { type: "Point", coordinates: [0.9,0.9] } },
				{
					type: "Feature", id: "relation/1",
					properties: {
						tags: { indoor: "level", level: "0", type: "multipolygon" },
						own: { members: [ { role: "outer", feature: "way/1" }, { role: "inner", feature: "way/2" } ] }
					},
					geometry: { type: "Polygon", coordinates: [ [ [0,0], [0,1], [1,1], [0,0] ], [ [0.1,0.1], [0.1,0.9], [0.9,0.9], [0.1,0.1] ] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 9);
			assert.equal(Object.keys(res["node/1"]).length, 1);
			assert.equal(Object.keys(res["node/2"]).length, 1);
			assert.equal(Object.keys(res["node/3"]).length, 1);
			assert.equal(Object.keys(res["node/4"]).length, 1);
			assert.equal(Object.keys(res["node/5"]).length, 1);
			assert.equal(Object.keys(res["node/6"]).length, 1);
			assert.equal(Object.keys(res["way/1"]).length, 1);
			assert.equal(Object.keys(res["way/2"]).length, 1);
			assert.equal(Object.keys(res["relation/1"]).length, 1);

			assert.ok(res["node/1"].deleted);
			assert.ok(res["node/2"].deleted);
			assert.ok(res["node/3"].deleted);
			assert.ok(res["node/4"].deleted);
			assert.ok(res["node/5"].deleted);
			assert.ok(res["node/6"].deleted);
			assert.ok(res["way/1"].deleted);
			assert.ok(res["way/2"].deleted);
			assert.ok(res["relation/1"].deleted);
		});

		it("merge node overlapping way", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/-1", properties: { tags: { door: "yes", level: 0 }, own: {} }, geometry: { type: "Point", coordinates: [0.5,0.5] } },
				{
					type: "Feature", id: "way/-1",
					properties: {
						tags: { highway: "footway", level: 0 },
						own: {}
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [1,1] ] }
				},
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 4);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["node/-2"]).length, 3);
			assert.equal(Object.keys(res["node/-3"]).length, 3);
			assert.equal(Object.keys(res["way/-1"]).length, 3);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0.5,0.5]));
			assert.ok(deepEqual(res["node/-1"].newTags, { door: "yes", level: 0 }));

			assert.ok(res["node/-2"].created);
			assert.ok(deepEqual(res["node/-2"].newCoords, [0,0]));
			assert.ok(deepEqual(res["node/-2"].newTags, {}));

			assert.ok(res["node/-3"].created);
			assert.ok(deepEqual(res["node/-3"].newCoords, [1,1]));
			assert.ok(deepEqual(res["node/-3"].newTags, {}));

			assert.ok(res["way/-1"].created);
			assert.ok(deepEqual(res["way/-1"].newNodes, ["node/-2", "node/-1", "node/-3"]));
		});

		it("merge node overlapping two ways", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/-1", properties: { tags: { door: "yes", level: 0 }, own: {} }, geometry: { type: "Point", coordinates: [0.5,0.5] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[[0,0], [1,0], [1,1], [0,0]]] }
				},
				{
					type: "Feature", id: "way/-1",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: {}
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				},
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 4);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["node/-2"]).length, 3);
			assert.equal(Object.keys(res["way/-1"]).length, 3);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0.5,0.5]));
			assert.ok(deepEqual(res["node/-1"].newTags, { door: "yes", level: 0 }));

			assert.ok(res["node/-2"].created);
			assert.ok(deepEqual(res["node/-2"].newCoords, [0,1]));
			assert.ok(deepEqual(res["node/-2"].newTags, {}));

			assert.ok(res["way/-1"].created);
			assert.ok(deepEqual(res["way/-1"].newNodes, ["node/1", "node/-2", "node/3", "node/-1", "node/1"]));

			assert.ok(deepEqual(res["way/1"].newNodes, ["node/1", "node/2", "node/3", "node/-1", "node/1"]));
		});

		it("merge two nodes overlapping way", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/-1", properties: { tags: { door: "yes", level: 0 }, own: {} }, geometry: { type: "Point", coordinates: [0.5,0.5] } },
				{ type: "Feature", id: "node/-2", properties: { tags: { door: "yes", level: 0 }, own: {} }, geometry: { type: "Point", coordinates: [0.7,0.7] } },
				{
					type: "Feature", id: "way/-1",
					properties: {
						tags: { highway: "footway", level: 0 },
						own: {}
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [1,1] ] }
				},
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 5);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["node/-2"]).length, 3);
			assert.equal(Object.keys(res["node/-3"]).length, 3);
			assert.equal(Object.keys(res["node/-4"]).length, 3);
			assert.equal(Object.keys(res["way/-1"]).length, 3);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0.5,0.5]));
			assert.ok(deepEqual(res["node/-1"].newTags, { door: "yes", level: 0 }));

			assert.ok(res["node/-2"].created);
			assert.ok(deepEqual(res["node/-2"].newCoords, [0.7,0.7]));
			assert.ok(deepEqual(res["node/-2"].newTags, { door: "yes", level: 0 }));

			assert.ok(res["node/-3"].created);
			assert.ok(deepEqual(res["node/-3"].newCoords, [0,0]));
			assert.ok(deepEqual(res["node/-3"].newTags, {}));

			assert.ok(res["node/-4"].created);
			assert.ok(deepEqual(res["node/-4"].newCoords, [1,1]));
			assert.ok(deepEqual(res["node/-4"].newTags, {}));

			assert.ok(res["way/-1"].created);
			assert.ok(deepEqual(res["way/-1"].newNodes, ["node/-3", "node/-1", "node/-2", "node/-4"]));
		});

		it("merge node of a way overlapping another way", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,0.5], [0,1] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 3);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["way/1"]).length, 1);
			assert.equal(Object.keys(res["way/2"]).length, 1);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0,0.5]));
			assert.ok(deepEqual(res["node/-1"].newTags, {}));

			assert.ok(deepEqual(res["way/1"].newNodes, ["node/1", "node/-1", "node/2"]));
			assert.ok(deepEqual(res["way/2"].newNodes, ["node/1", "node/-1", "node/2"]));
		});

		it("doesn't merge node of a way overlapping another way if not on same level", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "1" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { highway: "footway", level: "0" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,1] ] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { highway: "footway", level: "1" },
						own: { nodes: [ "node/1", "node/2" ] }
					},
					geometry: { type: "LineString", coordinates: [ [0,0], [0,0.5], [0,1] ] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["way/2"]).length, 1);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0,0.5]));
			assert.ok(deepEqual(res["node/-1"].newTags, {}));

			assert.ok(deepEqual(res["way/2"].newNodes, ["node/1", "node/-1", "node/2"]));
		});

		it("keeps coherent previous data on update", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { building: "yes" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/-1", properties: { tags: { door: "yes", level: "1" }, own: {} }, geometry: { type: "Point", coordinates: [0,0.5] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { building: "yes" },
						own: { nodes: [ "node/1", "node/2", "node/3", "node/1" ] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0] ]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 2);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["way/1"]).length, 1);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0,0.5]));
			assert.ok(deepEqual(res["node/-1"].newTags, {door: "yes", level: "1"}));

			assert.ok(deepEqual(res["way/1"].newNodes, ["node/1", "node/-1", "node/2", "node/3", "node/1"]));
		});

		it("clean-up duplicated following coordinates in polygon/linestring", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/-1", properties: { tags: {}, own: {} }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/-2", properties: { tags: {}, own: {} }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/-3", properties: { tags: {}, own: {} }, geometry: { type: "Point", coordinates: [1,1] } },
				{
					type: "Feature", id: "way/-1",
					properties: {
						tags: { building: "yes" },
						own: {}
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [0,1], [1,1], [0,0] ]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 4);
			assert.equal(Object.keys(res["node/-1"]).length, 3);
			assert.equal(Object.keys(res["node/-2"]).length, 3);
			assert.equal(Object.keys(res["node/-3"]).length, 3);
			assert.equal(Object.keys(res["way/-1"]).length, 3);

			assert.ok(res["node/-1"].created);
			assert.ok(deepEqual(res["node/-1"].newCoords, [0,0]));
			assert.ok(deepEqual(res["node/-1"].newTags, {}));

			assert.ok(res["node/-2"].created);
			assert.ok(deepEqual(res["node/-2"].newCoords, [0,1]));
			assert.ok(deepEqual(res["node/-2"].newTags, {}));

			assert.ok(res["node/-3"].created);
			assert.ok(deepEqual(res["node/-3"].newCoords, [1,1]));
			assert.ok(deepEqual(res["node/-3"].newTags, {}));

			assert.ok(res["way/-1"].created);
			assert.ok(deepEqual(res["way/-1"].newTags, {building: "yes"}));
			assert.ok(deepEqual(res["way/-1"].newNodes, [ "node/-1", "node/-2", "node/-3", "node/-1" ]));
		});

		it("handles snapping of nodes and delete if necessary", async () => {
			const vdm = new VectorDataManager();
			const prev = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { building: "yes" },
						own: { nodes: ["node/1", "node/2", "node/3", "node/4", "node/1"] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [1,0], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: ["node/1", "node/2", "node/3", "node/4", "node/1"] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [1,0], [0,0] ]] }
				}
			] };
			const next = { type: "FeatureCollection", features: [
				{ type: "Feature", id: "node/1", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,0] } },
				{ type: "Feature", id: "node/2", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [0,1] } },
				{ type: "Feature", id: "node/3", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [1,1] } },
				{ type: "Feature", id: "node/4", properties: { tags: {}, own: { ways: ["way/1","way/2"] } }, geometry: { type: "Point", coordinates: [1,0] } },
				{
					type: "Feature", id: "way/1",
					properties: {
						tags: { building: "yes" },
						own: { nodes: ["node/1", "node/2", "node/3", "node/4", "node/1"] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [0,0], [0,0] ]] }
				},
				{
					type: "Feature", id: "way/2",
					properties: {
						tags: { indoor: "room", level: "0" },
						own: { nodes: ["node/1", "node/2", "node/3", "node/4", "node/1"] }
					},
					geometry: { type: "Polygon", coordinates: [[ [0,0], [0,1], [1,1], [1,1], [0,0] ]] }
				}
			] };

			const res = await vdm._analyzeDiff(prev, next);

			assert.equal(Object.keys(res).length, 3);

			assert.equal(Object.keys(res["node/4"]).length, 1);
			assert.equal(Object.keys(res["way/1"]).length, 1);
			assert.equal(Object.keys(res["way/2"]).length, 1);

			assert.ok(res["node/4"].deleted);
			assert.ok(deepEqual(res["way/1"].newNodes, [ "node/1", "node/2", "node/3", "node/1" ]));
			assert.ok(deepEqual(res["way/2"].newNodes, [ "node/1", "node/2", "node/3", "node/1" ]));
		});
	});
});
