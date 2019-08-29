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
 * Historized manager allows to track actions and undo/redo them.
 * It contains common methods for history management in controllers.
 */
class HistorizedManager {
	constructor() {
		this._actions = [];
		this._lastActionId = -1;
	}

	/**
	 * Cancel last edit made by user (if any)
	 */
	undo() {
		throw new Error("Should be overridden by subclass");
	}

	/**
	 * Restore last edit made by user (if any)
	 */
	redo() {
		if(this.canRedo()) {
			const restore = this._actions[this._lastActionId+1];
			this._lastActionId++;
			this._do(restore, true);
		}
	}

	/**
	 * Is there any action to undo ?
	 * @return {boolean} True if some actions can be canceled
	 */
	canUndo() {
		return this._lastActionId > -1;
	}

	/**
	 * Is there any action to redo ?
	 * @return {boolean} True if some actions can be restored
	 */
	canRedo() {
		return this._lastActionId < this._actions.length - 1;
	}

	/**
	 * Save an action into stack
	 */
	_do(action, noSave) {
		throw new Error("Should be overridden by subclass");
	}
}

export default HistorizedManager;
