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

/**
 * An action is what user performs on user interface.
 * It allows to track every single edit done by user.
 * This is useful for undoing/redoing some actions.
 *
 * @property {int} type The kind of action
 * @property {Object} prev The previous data (or null)
 * @property {Object} next The next data (or null)
 */
class Action {
	/** Type for editing feature tags **/
	static FEATURE_TAGS_EDIT = 0;
	/** Type for editing feature geometry **/
	static FEATURE_GEOM_EDIT = 1;
	/** Type for creating new feature **/
	static FEATURE_NEW = 2;
	/** Type for making feature square **/
	static FEATURE_GEOM_SQUARE = 11;
	/** Type for creating new floor **/
	static FLOOR_NEW = 3;
	/** Type for copying floor **/
	static FLOOR_COPY = 10;
	/** Type for creating new building **/
	static BUILDING_NEW = 4;
	/** Type for deleting feature **/
	static FEATURE_DELETE = 5;
	/** Type for copy feature **/
	static FEATURE_COPY = 6;
	/** Type for adding floor images **/
	static FLOOR_IMG_ADD = 7;
	/** Type for updating floor images **/
	static FLOOR_IMG_UPDATE = 8;
	/** Type for deleting floor images **/
	static FLOOR_IMG_DELETE = 9;

	/**
	 * Class constructor
	 * @param {int} type The kind of action (use class constants)
	 * @param {Object} [prev] The previous data, which is edited or replaced by this action
	 * @param {Object} [next] The new data, replacing the previous one
	 */
	constructor(type, prev, next) {
		this.type = type;
		this.prev = prev;
		this.next = next;
	}
}

export default Action;
