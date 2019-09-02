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

import request from 'request-promise-native';
import { parseString } from 'xml2js';
import { mergeDeep } from '../utils';
import Fuse from 'fuse.js';

/**
 * Presets manager handles loading, listing and filtering of presets for OSM features.
 */
class PresetsManager {
	constructor() {
		this._presetsURL = [ './presets/indoor.xml', './presets/routing.xml', './presets/default.xml' ];
		this._presets = null;
		this._loading = false;
	}

	/**
	 * Make preset data available in memory.
	 */
	loadPresets() {
		this._loading = true;

		// Download presets XML files using promises
		const loaders = Promise.all(
			this._presetsURL.map(filepath => {
				return request(window.EDITOR_URL + filepath)                     // Download
				.then(this._xmlToJson)                                           // Convert XML into raw JSON
				.then(xml => this._simplifyJSONPreset(xml.presets, "presets"))   // Clean JSON
				.catch(() => null);
			})
		);

		// Once everything is downloaded
		loaders.then(presets => {
			// Merge all presets into a single one
			this._presets = mergeDeep({}, ...presets.filter(p => p !== null));

			/*
			 * Generate search index
			 */

			// Generate flat list of items
			const getItems = item => {
				let matches = [];

				if(item.items) {
					matches = matches.concat(item.items.map(it => {
						if(it.tags) {
							it.kv = Object.entries(it.tags).flat().map(v => v.replace(/_/g, " "));
						}
						return it;
					}));
				}

				if(item.groups) {
					matches = matches.concat(item.groups.map(it => getItems(it)).flat());
				}

				return matches;
			};

			// Set options for search
			this._searcher = new Fuse(
				getItems(this._presets),
				{
					shouldSort: true,
					threshold: 0.4,
					maxPatternLength: 32,
					minMatchCharLength: 3,
					keys: [
						{ name: "name", weight: 0.7 },
						{ name: "kv", weight: 0.3 }
					]
				}
			);

			// Set loading done
			this._loading = false;
		});
	}

	/**
	 * Get the list of available presets
	 * @param {string} path The access path (list of groups separated by /, example "/root/highways/unpaved")
	 * @return {Object[]} The presets, possibly organised by groups
	 */
	getPresets(path) {
		if(this._presets) {
			if(path === "/") {
				return this._presets;
			}
			else {
				const entries = path.split("/").filter(p => p !== "");
				let last = this._presets;

				// Look up each entry in path
				for(let e of entries) {
					let sub = (last.groups && last.items) ? last.groups.concat(last.items) : (last.items ? last.items : last.groups);
					sub = sub.filter(g => g.name === e);

					if(sub.length === 1) {
						last = sub[0];
					}
					else {
						last = null;
						break;
					}
				}

				return last;
			}
		}
		else {
			return null;
		}
	}

	/**
	 * Search for presets by text.
	 * @param {string} text The search text
	 * @return {Object[]} List of matching presets
	 */
	findPresetsByName(text) {
		if(!text || text.trim().length === 0) {
			return null;
		}
		else if(this._presets) {
			const res = this._searcher.search(text);
			return { items: res };
		}
		else {
			return null;
		}
	}

	/**
	 * Search presets available for given feature
	 * @param {Object} feature The feature to use
	 * @return {Object[]} List of matching presets
	 */
	findPresetsForFeature(feature) {
		if(this._presets) {
			const matches = [];
			const fTags = feature.properties.tags;

			// Recursive function for checking one preset at a time
			const check = preset => {
				if(preset.groups) {
					preset.groups.forEach(check);
				}
				if(preset.items) {
					preset.items
					.filter(item => item.tags)
					.forEach(item => {
						let valid = true;

						for(const k in item.tags) {
							if(item.tagMatch[k] !== "none" && fTags[k] !== item.tags[k]) {
								if(fTags[k] === undefined || item.tagMatch[k] !== "key") {
									valid = false;
									break;
								}
							}
						}

						if(valid) {
							matches.push(item);
						}
					});
				}
			};

			check(this._presets);
			return matches;
		}
		else {
			return null;
		}
	}

	/**
	 * Make JSON preset more easily readable
	 * @private
	 */
	_simplifyJSONPreset(p, type) {
		let res = {};

		// Convert various fields as simpler arrays
		const transformArray = (variable, types) => {
			if(types.includes(type) && p[variable]) {
				res[variable+"s"] = p[variable].map(obj => this._simplifyJSONPreset(obj, variable));
			}
		};

		// Optionals
		if([ "item", "chunk" ].includes(type) && p.optional) {
			res.optionals = mergeDeep({}, ...p.optional.map(obj => this._simplifyJSONPreset(obj, "optional")));
		}

		// Checkgroups
		if(p.checkgroup) {
			p.check = (p.check || []);
			p.checkgroup.forEach(cg => {
				p.check = p.check.concat(cg.check);
			});
		}

		transformArray("group",       [ "presets", "group" ]);
		transformArray("item",        [ "group" ]);
		transformArray("link",        [ "item", "chunk", "optional" ]);
		transformArray("text",        [ "item", "chunk", "optional" ]);
		transformArray("combo",       [ "item", "chunk", "optional" ]);
		transformArray("reference",   [ "item", "chunk", "optional" ]);
		transformArray("multiselect", [ "item", "chunk", "optional" ]);
		transformArray("list_entry",  [ "combo", "multiselect" ]);
		transformArray("check", [ "item", "chunk", "optional" ]);

		// Chunks
		if(type === "presets" && p.chunk) {
			const chunks = {};
			p.chunk.map(c => this._simplifyJSONPreset(c, "chunk")).forEach(c => { chunks[c.id] = c; });
			res.chunks = chunks;
		}

		// Keys
		if([ "item", "chunk", "optional" ].includes(type) && p.key) {
			const tags = {};
			const tagMatch = {};
			p.key.map(k => this._simplifyJSONPreset(k, "key")).forEach(t => {
				tags[t.key] = t.value;
				if(t.match && t.match !== "keyvalue") {
					tagMatch[t.key] = t.match;
				}
			});
			res.tags = tags;
			res.tagMatch = tagMatch;
		}

		// Copy properties
		[
			"icon", "name", "key", "value", "type", "wiki", "id", "ref", "href",
			"text", "default", "use_last_as_default", "auto_increment", "length",
			"alternative_autocomplete_keys", "match", "values", "editable", "delimiter",
			"values_from", "display_values", "short_descriptions", "values_searchable", "use_last_as_default",
			"values_no_i18n", "values_sort", "rows", "short_description", "icon_size", "display_value"
		].forEach(prop => {
			if(p.$ && p.$[prop]) { res[prop] = p.$[prop]; }
		});

		// Object types
		if(res.type) {
			res.type = res.type.split(",");
		}

		// Replace references by actual style
		if(type === "presets" && res.chunks) {
			const replaceByChunk = (entry) => {
				[ "groups", "items" ].forEach(v => {
					if(entry[v]) {
						entry[v] = entry[v].map(replaceByChunk);
					}
				});

				if(entry.optionals) {
					entry.optionals = replaceByChunk(entry.optionals);
				}

				if(entry.references) {
					entry = mergeDeep({}, entry, ...entry.references.map(r => res.chunks[r.ref]));
					delete entry.references;
				}
				return entry;
			};

			res = replaceByChunk(res);
		}

		return res;
	}

	/**
	 * Convert XML into JSON
	 * @private
	 */
	_xmlToJson(xml) {
		return new Promise((resolve, reject) => {
			parseString(xml, (err, result) => {
				if (err) { reject(err); }
				else { resolve(result); }
			});
		});
	}
}

export default PresetsManager;
