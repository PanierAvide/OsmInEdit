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

import ImageryManager from './ImageryManager';
import { LatLng, GeoJSON } from 'leaflet';
import assert from 'assert';
import booleanIntersects from '@turf/boolean-intersects';

describe("ctrl > ImageryManager", () => {
	let im;
	it("can be created", () => {
		im = new ImageryManager();
		assert.ok(im);
	});

	describe("getAvailableImagery", () => {
		it("gives results", () => {
			return im.getAvailableImagery(new LatLng(48.1121, -1.7101))
			.then(result => {
				assert.ok(result.length > 0);
				assert.ok(result[0].properties.best);
				result.forEach(layer => {
					assert.ok(layer.geometry === null || booleanIntersects(layer, { type: "Point", coordinates: [ -1.7101, 48.1121 ] }));
				});
			});
		}, 30000);

		it("returns all layers if no coordinates given", () => {
			return im.getAvailableImagery()
			.then(result => {
				assert.ok(result.length > 0);
				assert.equal(im._rawLayers.length, result.length);
			});
		}, 30000);
	});
});
