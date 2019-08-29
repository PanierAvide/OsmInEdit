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
import ChevronLeft from 'mdi-react/ChevronLeftIcon';
import Container from 'react-bootstrap/Container';
import Close from 'mdi-react/CloseIcon';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';
import Magnify from 'mdi-react/MagnifyIcon';
import PresetCard from './PresetCard';
import Row from 'react-bootstrap/Row';

/**
 * Preset select allows user to choose one preset between a structured list of presets.
 */
class PresetSelect extends Component {
	constructor() {
		super();

		this.state = {
			path: "/",
			text: ""
		};
	}

	/**
	 * Event handler for click on one entry
	 * @private
	 */
	_onPresetClicked(preset) {
		if(preset.groups || preset.items) {
			this.setState({ path: this.state.path+preset.name+"/" });
		}
		else if(this.props.onSelect) {
			this.props.onSelect(preset);
		}
	}

	/**
	 * Event handler for click on back button
	 * @private
	 */
	_onBackClicked() {
		const entries = this.state.path.split("/").filter(e => e !== "");
		entries.pop();
		this.setState({ path: entries.length > 0 ? "/"+entries.join("/")+"/" : "/" });
	}

	/**
	 * Generate one entry for preset
	 * @private
	 */
	_createEntry(key, item) {
		return <Row className="m-2" key={key}><PresetCard preset={item} onClick={this._onPresetClicked.bind(this)} /></Row>
	}

	render() {
		let presets;
		const hasSearch = this.state.text.trim().length > 0;

		if(hasSearch) {
			presets = window.presetsManager.findPresetsByName(this.state.text);
		}
		else {
			presets = window.presetsManager.getPresets(this.state.path);
		}

		return <Container className="m-0 p-0">
			<Row className="m-2">
				<InputGroup>
					{!hasSearch &&
						<InputGroup.Prepend>
							<InputGroup.Text>
								<Magnify size={10} />
							</InputGroup.Text>
						</InputGroup.Prepend>
					}

					<FormControl
						placeholder={window.I18n.t("Search a type of feature...")}
						value={this.state.text}
						onChange={e => this.setState({ text: e.target.value })}
					/>

					{hasSearch &&
						<InputGroup.Append>
							<Button
								variant="outline-secondary"
								onClick={() => this.setState({ text: "" })}
							>
								<Close size={16} />
							</Button>
						</InputGroup.Append>
					}
				</InputGroup>
			</Row>

			{this.state.path !== "/" &&
				<Row className="m-2">
					<Button
						variant="outline-secondary"
						block
						onClick={() => this._onBackClicked()}
					>
						<ChevronLeft style={{ float: "left" }} /> {window.I18n.t("Back")}
					</Button>
				</Row>
			}

			{this.state.path === "/" && !hasSearch && this.props.lastUsed && this._createEntry("lu", this.props.lastUsed)}
			{presets && presets.groups && presets.groups.map((g,i) => this._createEntry("g"+i, g))}
			{presets && presets.items && presets.items.map((it,i) => this._createEntry("i"+i, it))}
		</Container>;
	}

	componentDidMount() {
		if(this.props.initialPath) {
			this.setState({ path: this.props.initialPath });
		}
	}
}

export default PresetSelect;
