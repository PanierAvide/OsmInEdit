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

import React, { Component } from 'react';
import deepEqual from 'fast-deep-equal';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';

/**
 * A select list takes a list of entries, and shows a list of selectable entries.
 * @property {Object[]} data The list of entries (each entry must have at least a "label" property). Entries could have a boolean "selected" property for setting their initial state.
 * @property {string} type Type of list (single, multi, oneshot)
 * @property {function} onChange Function called when one entry is clicked. First parameter is an array of currently selected items
 */
class SelectList extends Component {
	constructor() {
		super();

		this.state = {
			selectedEntries: new Set()
		};
	}

	/**
	 * Event handler when one entry is selected
	 * @private
	 */
	_onEntrySelected(id) {
		//If single mode, replace selected entry
		if(this.props.type === "single" || this.props.type === "oneshot") {
			this.setState({ selectedEntries: new Set([ id ]) });
			this.props.onChange([ this.props.data[id] ]);
		}
		//If multi mode, toggle value in selection set
		else {
			const newSelection = new Set(this.state.selectedEntries);

			if(newSelection.has(id)) {
				newSelection.delete(id);
			}
			else {
				newSelection.add(id);
			}

			this.setState({ selectedEntries: newSelection });

			//Convert set into selected data array
			const result = [];
			for(const v of newSelection.values()) {
				result.push(this.props.data[v]);
			}
			this.props.onChange(result);
		}
	}

	/**
	 * Change selection if necessary
	 * @private
	 */
	_reloadSelection(fromProps) {
		if(!fromProps || !deepEqual(fromProps.data, this.props.data)) {
			//Set default selection at first load
			const selectionIds = [];
			this.props.data.forEach((e, i) => {
				if(e.selected) {
					selectionIds.push(i);
				}
			});

			if(selectionIds.length > 0) {
				this.setState({ selectedEntries: new Set(selectionIds) });
			}
		}
	}

	render() {
		return <ListGroup style={this.props.style}>
			{this.props.data.map((entry, id) => {
				const checked = this.state.selectedEntries.has(id);
				const changeHandler = () => this._onEntrySelected(id);

				return <ListGroup.Item
					action
					className="p-2"
					key={id}
					onClick={changeHandler}
					active={checked}
				>
					{this.props.type === "single" &&
						<Form.Check type="radio" checked={checked} onChange={changeHandler} label={entry.label} />
					}
					{this.props.type === "multi" &&
						<Form.Check type="checkbox" checked={checked} onChange={changeHandler} label={entry.label} />
					}
					{this.props.type === "oneshot" &&
						entry.label
					}
				</ListGroup.Item>
			})}
		</ListGroup>;
	}

	componentDidMount() {
		this._reloadSelection();
	}

	componentDidUpdate(fromProps) {
		this._reloadSelection(fromProps);
	}
}

export default SelectList;
