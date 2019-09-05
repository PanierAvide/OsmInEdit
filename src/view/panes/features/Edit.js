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
import Body from '../../Body';
import Button from 'react-bootstrap/Button';
import Check from 'mdi-react/CheckIcon';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import I18n from '../../../config/locales';
import PresetInputField from '../../common/PresetInputField';
import PubSub from 'pubsub-js';
import Row from 'react-bootstrap/Row';
import TagsTable from '../../common/TagsTable';

/**
 * Edit feature pane allows user to change one feature description
 */
class EditFeaturePane extends Component {
	/**
	 * Event handler when "Done" button is clicked
	 * @private
	 */
	_onDone() {
		PubSub.publish("body.mode.set", { mode: this.props.mode });
	}

	/**
	 * Transform a preset definition into components
	 * @private
	 */
	_presetToComponent(p) {
		let res = [];

		if(p.combos) {
			res = res.concat(p.combos.map((c,i) => <PresetInputField type="combo" data={c} tags={this.props.feature.properties.tags} key={"c"+i} />));
		}
		if(p.texts) {
			res = res.concat(p.texts.map((t,i) => <PresetInputField type="text" data={t} tags={this.props.feature.properties.tags} key={"t"+i} />));
		}
		if(p.multiselects) {
			res = res.concat(p.multiselects.map((m,i) => <PresetInputField type="multiselect" data={m} tags={this.props.feature.properties.tags} key={"m"+i} />));
		}
		if(p.checks) {
			res = res.concat(p.checks.map((ch,i) => <PresetInputField type="check" data={ch} tags={this.props.feature.properties.tags} key={"ch"+i} />));
		}
		if(p.optionals) {
			res = res.concat(this._presetToComponent(p.optionals));
		}

		// Add level field
		if(p.showLevel) {
			// List available levels
			let levels = (this.props.feature.properties.own && this.props.feature.properties.own.levels) || [-5,-4,-3,-2,-1,0,1,2,3,4,5];
			if(this.props.building && this.props.building.properties.own && this.props.building.properties.own.levels) {
				levels = levels.concat(this.props.building.properties.own.levels);
			}

			// Create input
			res.push(<PresetInputField
				type="multiselect"
				data={{
					key: "level",
					text: I18n.t("Floors served"),
					values: [...new Set(levels)].map(a => parseFloat(a)).sort((a,b) => a-b).join(";")
				}}
				tags={Object.assign({}, this.props.feature.properties.tags, { level: this.props.feature.properties.own.levels.join(";") })}
				key={"lvl"}
			/>);
		}

		return res;
	}

	/**
	 * Merge and deduplicate presets fields
	 * @private
	 */
	_combinePresets(presets) {
		const result = {
			name: Body.GetFeatureName(this.props.feature, [...new Set(presets.map(p => p.name))].join(", "))
		};

		const usedKeys = [];

		presets.forEach(p => {
			Object.entries(p).forEach(e => {
				const [pk,pv] = e;

				if(pk === "type") {
					if(!result.type) { result.type = []; }

					result.type = [...new Set(result.type.concat(pv))];
				}
				else if(Array.isArray(pv)) {
					if(!result[pk]) { result[pk] = []; }

					pv.forEach(v => {
						if(!usedKeys.includes(v.key) && v.key !== "level") {
							result[pk].push(v);
							usedKeys.push(v.key);
						}
						else if(v.key === "level") {
							result.showLevel = true;
						}
					});
				}
				else if(pk === "tags") {
					if(!result.tags) { result.tags = {}; }

					result.tags = Object.assign({}, result.tags, pv);
				}
			});
		});

		return result;
	}

	render() {
		if(!this.props.feature) { return <div></div>; }

		const feature = this.props.feature;
		const tags = feature.properties.tags;
		const preset = this._combinePresets(window.presetsManager.findPresetsForFeature(feature));

		return <div>
			<Container className="m-0 pl-2 pr-2 mt-2">
				<Row className="d-flex align-items-top justify-content-between">
					<Col>
						<h3 className="m-0 p-0">{preset.name}</h3>
					</Col>

					<Col className="text-right">
						<Button
							variant="outline-secondary"
							size="sm"
							title={I18n.t("Done")}
							onClick={() => this._onDone()}
						>
							<Check />
						</Button>
					</Col>
				</Row>
			</Container>

			<div className="m-2 mb-4">
				{this._presetToComponent(preset)}
			</div>

			<div className="m-2">
				<TagsTable
					tags={tags}
				/>
			</div>
		</div>;
	}
}

export default EditFeaturePane;
