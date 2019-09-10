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
import Button from 'react-bootstrap/Button';
import Close from 'mdi-react/CloseIcon';
import deepEqual from 'fast-deep-equal';
import FormControl from 'react-bootstrap/FormControl';
import InformationVariant from 'mdi-react/InformationVariantIcon';
import InputGroup from 'react-bootstrap/InputGroup';
import Plus from 'mdi-react/PlusIcon';
import PubSub from 'pubsub-js';

const WIKI_USE_TAG = [ "building", "highway", "natural", "surface", "landuse", "power", "waterway", "amenity", "barrier", "place", "leisure", "railway", "shop", "man_made", "public_transport", "tourism", "emergency", "historic", "indoor" ];

/**
 * Tags table component allows display of raw OSM tags.
 * It also editing these tags, directly by user.
 *
 * @property {Object} tags Initial tag list
 */
class TagsTable extends Component {
	constructor() {
		super();

		this.state = {
			tags: null,
			newline: false,
			focusKey: null,
			focusVal: null
		};
	}

	_tagsObjToArray(obj) {
		return obj ? Object.entries(obj) : null;
	}

	_tagsArrayToObj(arr) {
		if(!arr) { return null; }
		else {
			const obj = {};
			arr.forEach(e => { obj[e[0]] = e[1]; });
			return obj;
		}
	}

	/**
	 * Event handler for tag changes
	 * @private
	 */
	_onTagsChanged() {
		const tags = [];
		const tagsDom = document.getElementsByClassName("app-tags-row");

		// Read all tags from table
		for(const d of tagsDom) {
			const key = d.getElementsByClassName("app-tags-row-key")[0].value;
			const val = d.getElementsByClassName("app-tags-row-val")[0].value;
			tags.push([ key, val ]);
		}

		if(this._timer) {
			clearTimeout(this._timer);
			this._timer = null;
		}

		this._timer = setTimeout(() => {
			PubSub.publish("body.tags.set", { tags: this._tagsArrayToObj(tags) });
			this._timer = null;
		}, 500);

		const newState = { newline: false, tags: tags, focusKey: null, focusVal: null };

		if(this.state.newline && document.activeElement) {
			if(document.activeElement.classList.contains("app-tags-row-key")) {
				newState.focusKey = document.activeElement.value;
			}
			else if(document.activeElement.classList.contains("app-tags-row-val")) {
				newState.focusVal = document.activeElement.value;
			}
		}

		this.setState(newState);
	}

	/**
	 * Event handler for tag deletion
	 * @private
	 */
	_onTagDeleted(k) {
		const tagsObj = this._tagsArrayToObj(this.state.tags);
		delete tagsObj[k];
		PubSub.publish("body.tags.set", { tags: tagsObj });

		if(this.state.newline) {
			this.setState({ newline: false, focusKey: null, focusVal: null });
		}
	}

	/**
	 * Get the correct wiki URL for getting details about a tag
	 * @private
	 */
	_getWikiURL(key, value) {
		let url = "https://wiki.openstreetmap.org/wiki/";

		if(WIKI_USE_TAG.includes(key)) {
			url += "Tag:"+key+"="+value;
		}
		else {
			url += "Key:"+key;
		}

		return url;
	}

	render() {
		const entries = (this.state.tags || []).slice(0);

		if(this.state.newline) {
			entries.push([ "", "" ]);
		}

		return <div className={this.props.className}>
			<div className="app-tags">
				{entries.map((e,i) => (
					<InputGroup size="sm" className="m-0 app-tags-row" key={i}>
						<FormControl
							className="app-tags-row-key"
							type="text"
							size="sm"
							value={e[0]}
							disabled={this.props.locked}
							onChange={e => this._onTagsChanged()}
							autoFocus={(this.state.newline && i === entries.length-1) || this.state.focusKey === e[0]}
						/>

						<FormControl
							className="app-tags-row-val"
							type="text"
							size="sm"
							value={e[1]}
							disabled={this.props.locked}
							onChange={e => this._onTagsChanged()}
							autoFocus={!this.state.newline && this.state.focusVal === e[1]}
						/>

						<InputGroup.Append>
							{!this.props.locked &&
								<Button
									variant="outline-danger"
									tabIndex="-1"
									disabled={this.props.noDelete && this.props.noDelete.includes(e[0])}
									onClick={() => this._onTagDeleted(e[0])}
								>
									<Close size={16} />
								</Button>
							}
							<Button
								variant="outline-info"
								href={this._getWikiURL(e[0], e[1])}
								target="_blank"
								tabIndex="-1"
							>
								<InformationVariant size={16} />
							</Button>
						</InputGroup.Append>
					</InputGroup>
				))}
			</div>
			{!this.props.locked &&
				<Button
					variant="secondary"
					className="app-tags-add"
					size="sm"
					block
					onClick={() => this.setState({ newline: true })}
					tabIndex="-1"
				>
					<Plus size={16} />
				</Button>
			}
		</div>;
	}

	componentDidMount() {
		this.setState({ tags: this._tagsObjToArray(this.props.tags) });
	}

	componentDidUpdate(prevProps) {
		if(!deepEqual(prevProps.tags, this.props.tags)) {
			this.setState({ tags: this._tagsObjToArray(this.props.tags) });
		}
	}
}

export default TagsTable;
