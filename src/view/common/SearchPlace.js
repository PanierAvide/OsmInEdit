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
import FormControl from 'react-bootstrap/FormControl';
import I18n from '../../config/locales';
import InputGroup from 'react-bootstrap/InputGroup';
import Nominatim from 'nominatim-browser';
import Magnify from 'mdi-react/MagnifyIcon';
import Overlay from 'react-bootstrap/Overlay';
import PubSub from 'pubsub-js';
import SelectList from '../common/SelectList';
import Spinner from 'react-bootstrap/Spinner';

/**
 * SearchPlace is a search bar for searching cities or streets.
 */
class SearchPlace extends Component {
	constructor() {
		super();

		this.state = {
			text: "",
			loading: false,
			searchResults: [],
			showList: false
		};
	}

	/**
	 * @private
	 */
	_search(text, now) {
		now = now || false;
		this.setState({ text: text });

		if(now || (text !== this.state.text && text.length >= 3)) {
			this.setState({ loading: true, showList: true });

			if(this._searchTimer) {
				clearTimeout(this._searchTimer);
			}

			this._searchTimer = setTimeout(() => {
				Nominatim.geocode({
					q: text,
					"accept-language": I18n.locale
				})
				.then(results => {
					results = results.map(r => ({ label: r.display_name, coordinates: [ r.lat, r.lon ], bbox: r.boundingbox }));
					this.setState({
						loading: false,
						showList: true,
						searchResults: results
					}, () => {
						if(this._update) {
							this._update();
						}
					});
				})
				.catch(error => {
					console.error(error);
					this.setState({ loading: false, searchResults: null, showList: false });
				});
			}, now ? 0 : 2000);
		}
	}

	/**
	 * @private
	 */
	_onSelect(addr) {
		this.setState({ searchResults: [], text: "", showList: false });
		PubSub.publish("map.position.set", addr);
	}

	render() {
		return <div>
			<Overlay
				placement="bottom-end"
				show={this.state.showList}
				target={this.refs.input}
				onHide={() => this.setState({ showList: false, searchResults: [] })}
				rootClose={true}
			>
				{({
					placement,
					scheduleUpdate,
					arrowProps,
					outOfBoundaries,
					show: _show,
					...props
				}) => {
					this._update = scheduleUpdate;
					return <div
						{...props}
						style={{...props.style, zIndex: 10000}}
					>
						{this.state.searchResults ?
							<SelectList
								data={this.state.searchResults}
								type="oneshot"
								onChange={selection => this._onSelect(selection[0])}
								style={{fontSize: "0.8em"}}
							/>
							:
							<p>{I18n.t("An error happened when searching address. Please retry.")}</p>
						}

						{this.state.loading &&
							<div
								className="text-center"
								style={{
									backgroundColor: "#f8f9fa",
									borderRadius: "0.25rem",
									border: "1px solid rgba(0, 0, 0, 0.125)",
									padding: "0.5rem"
								}}
							>
								<Spinner animation="grow" className="align-middle" /> {I18n.t("Searching address...")}
							</div>
						}
					</div>;
				}}
			</Overlay>

			<InputGroup className="mw-25" style={{width: 300}} ref="input">
				<FormControl
					placeholder={I18n.t("Search a city, street...")}
					value={this.state.text}
					onChange={e => this._search(e.target.value, false)}
				/>
				<InputGroup.Append>
					<Button
						variant="outline-secondary"
						onClick={() => this._search(this.state.text, true)}
					>
						<Magnify size={16} />
					</Button>
				</InputGroup.Append>
			</InputGroup>
		</div>;
	}
}

export default SearchPlace;
