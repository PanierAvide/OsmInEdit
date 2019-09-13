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
import History from 'mdi-react/HistoryIcon';
import I18n from '../../../config/locales/ui';
import PresetCard from '../../common/PresetCard';
import PresetInputField from '../../common/PresetInputField';
import PresetSelect from '../../common/PresetSelect';
import PubSub from 'pubsub-js';
import Row from 'react-bootstrap/Row';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import TagsTable from '../../common/TagsTable';

const GEOM_TO_OSM = { "Point": "node", "LineString": "way", "Polygon": "closedway", "MultiPolygon": "closedway" };

/**
 * Edit feature pane allows user to change one feature description
 */
class EditFeaturePane extends Component {
	constructor() {
		super();

		this.state = {
			tab: "functional",
			showPresetSelect: false
		};
	}

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

		if(!p) { return res; }

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

	/**
	 * @private
	 */
	_lookForPreset() {
		this.setState({ showPresetSelect: true });
	}

	/**
	 * @private
	 */
	_onChangePreset(prev, next) {
		if(next && this.props.feature) {
			let newTags = Object.assign({}, this.props.feature.properties.tags);

			// Remove hard tags from previous preset
			if(prev && prev.tags) {
				Object.keys(prev.tags).forEach(k => delete newTags[k]);
			}

			// Add hard tags from new preset
			if(next.tags) {
				newTags = Object.assign(newTags, next.tags);
			}

			PubSub.publish("body.tags.set", { tags: newTags });
		}

		this.setState({ showPresetSelect: false });
	}

	render() {
		if(!this.props.feature) { return <div></div>; }

		const feature = this.props.feature;
		const tags = feature.properties.tags;
		let mightBeStructure = ["Polygon","MultiPolygon"].includes(feature.geometry.type);
		const presets = window.presetsManager.findPresetsForFeature(feature);
		const globalPreset = this._combinePresets(presets);

		// Find functional presets (not structural ones)
		let functionalPreset = presets.filter(p => !p.indoor_structure || p.indoor_structure === "no");
		if(functionalPreset.length > 0) { functionalPreset = functionalPreset[functionalPreset.length-1]; }
		else { functionalPreset = null; }

		// Find structural presets (room, area, corridor...)
		let structurePreset = presets.filter(p => ["only", "yes"].includes(p.indoor_structure));
		if(structurePreset.length > 0) { structurePreset = structurePreset[structurePreset.length-1]; }
		else { structurePreset = null; }

		// Tabs management
		this._tabFunDisabled = structurePreset && structurePreset.indoor_structure === "only";
		this._tabStrDisabled = !mightBeStructure || (functionalPreset && functionalPreset.indoor_structure === "no");
		this._hasFunPreset = functionalPreset !== null && functionalPreset !== undefined;
		this._hasStrPreset = structurePreset !== null && structurePreset !== undefined;

		const tabShown = this.state.tab === "functional" && !this._tabFunDisabled ? "functional" : "structural";

		return <div>
			<Container className="m-0 pl-2 pr-2 mt-2">
				<Row className="d-flex align-items-top justify-content-between">
					<Col>
						<h3 className="m-0 p-0">{Body.GetFeatureName(feature)}</h3>
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

			<div className="m-2">
				<Tabs
					activeKey={tabShown}
					id="preset-tabs"
					className="mb-2"
					onSelect={k => this.setState({ showPresetSelect: false, tab: k })}
				>
					<Tab
						eventKey="functional"
						title={I18n.t("Usage")}
						disabled={this._tabFunDisabled}
					>
						{!this.state.showPresetSelect &&
							<PresetCard
								preset={mightBeStructure ? functionalPreset : globalPreset}
								onClick={this._lookForPreset.bind(this)}
								className="mb-2"
							/>
						}

						{!this.state.showPresetSelect && this._presetToComponent(mightBeStructure ? functionalPreset : globalPreset)}
					</Tab>

					<Tab
						eventKey="structural"
						title={I18n.t("Structure")}
						disabled={this._tabStrDisabled}
					>
						{!this.state.showPresetSelect &&
							<PresetCard
								preset={structurePreset}
								onClick={this._lookForPreset.bind(this)}
								className="mb-2"
							/>
						}

						{!this.state.showPresetSelect && this._presetToComponent(structurePreset)}
					</Tab>
				</Tabs>

				{this.state.showPresetSelect &&
					<PresetSelect
						onSelect={preset => this._onChangePreset(tabShown === "functional" ? functionalPreset : structurePreset, preset)}
						onBack={() => this.setState({ showPresetSelect: false })}
						filter={p => (
							(
								!p.type
								|| p.type.includes(GEOM_TO_OSM[feature.geometry.type])
							) && (
								tabShown === "functional"
								|| ["yes","only"].includes(p.indoor_structure)
							)
						)}
					/>
				}

				{!this.state.showPresetSelect &&
					<TagsTable
						className="mt-3"
						tags={tags}
					/>
				}

				{!this.state.showPresetSelect && (!feature.properties.own || !feature.properties.own.new) &&
					<Button
						className="mb-3 mt-3"
						variant="outline-secondary"
						block
						size="sm"
						href={window.CONFIG.osm_api_url+"/"+feature.id+"/history"}
						target="_blank"
					>
						<History size={20} /> {I18n.t("See feature history on OpenStreetMap")}
					</Button>
				}
			</div>
		</div>;
	}

	componentDidMount() {
		if(this.props.feature) {
			const newTabVal =
				(this._tabFunDisabled && !this._tabStrDisabled)
				|| (!this._tabFunDisabled && !this._tabStrDisabled && !this._hasFunPreset && this._hasStrPreset) ?
					"structural"
					: "functional";

			if(newTabVal !== this.state.tab) {
				this.setState({ tab: newTabVal });
			}
		}
	}

	componentDidUpdate(prevProps) {
		if(prevProps.feature && this.props.feature && prevProps.feature.id !== this.props.feature.id) {
			const newState = { showPresetSelect: false };
			const newTabVal =
				(this._tabFunDisabled && !this._tabStrDisabled)
				|| (!this._tabFunDisabled && !this._tabStrDisabled && !this._hasFunPreset && this._hasStrPreset) ?
					"structural"
					: "functional";

			if(newTabVal !== this.state.tab) {
				newState.tab = newTabVal;
			}

			this.setState(newState);
		}
	}
}

export default EditFeaturePane;
