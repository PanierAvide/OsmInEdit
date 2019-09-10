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
import Close from 'mdi-react/CloseIcon';
import FormControl from 'react-bootstrap/FormControl';
import I18n from '../../config/locales/ui';
import InputGroup from 'react-bootstrap/InputGroup';
import Magnify from 'mdi-react/MagnifyIcon';
import PresetCard from './PresetCard';

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
		if(this.state.path === "/" && this.props.onBack) {
			this.props.onBack();
		}
		else {
			const entries = this.state.path.split("/").filter(e => e !== "");
			entries.pop();
			this.setState({ path: entries.length > 0 ? "/"+entries.join("/")+"/" : "/" });
		}
	}

	/**
	 * Generate one entry for preset
	 * @private
	 */
	_createEntry(key, item) {
		return <PresetCard
			key={key}
			className="mb-2"
			preset={item}
			onClick={this._onPresetClicked.bind(this)}
		/>;
	}

	render() {
		let presets;
		const hasSearch = this.state.text.trim().length > 0;

		if(hasSearch) {
			presets = window.presetsManager.findPresetsByName(this.state.text, this.props.filter);
		}
		else {
			presets = window.presetsManager.getPresets(this.state.path, this.props.filter);
		}

		return <div className={this.props.className}>
			<InputGroup className="mb-2">
				{!hasSearch &&
					<InputGroup.Prepend>
						<InputGroup.Text>
							<Magnify size={18} />
						</InputGroup.Text>
					</InputGroup.Prepend>
				}

				<FormControl
					placeholder={I18n.t("Search a type of feature...")}
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

			{(this.state.path !== "/" || this.props.onBack) &&
				<Button
					variant="outline-secondary"
					block
					className="mb-2"
					onClick={() => this._onBackClicked()}
				>
					<ChevronLeft style={{ float: "left" }} /> {I18n.t("Back")}
				</Button>
			}

			{this.state.path === "/" && !hasSearch && this.props.lastUsedPresets && this.props.lastUsedPresets.length > 0 &&
				this.props.lastUsedPresets.map((p,i) => this._createEntry("lu"+i, p))
			}
			{presets && presets.groups && presets.groups.map((g,i) => this._createEntry("g"+i, g))}
			{presets && presets.items && presets.items.map((it,i) => this._createEntry("i"+i, it))}
		</div>;
	}

	componentDidMount() {
		if(this.props.initialPath) {
			this.setState({ path: this.props.initialPath });
		}
	}
}

export default PresetSelect;
