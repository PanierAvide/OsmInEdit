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
import { saveAs } from 'file-saver';
import 'bootstrap/dist/css/bootstrap.css';
import bbox from '@turf/bbox';
import Col from 'react-bootstrap/Col';
import CompleteFloorImagery from './dialogs/CompleteFloorImagery';
import CONFIG from '../config/config.json';
import ConfirmDeletion from './dialogs/ConfirmDeletion';
import Container from 'react-bootstrap/Container';
import deepEqual from 'fast-deep-equal';
import Editable from './layers/Editable';
import Header from './Header';
import I18n from '../config/locales';
import LeftPanel from './LeftPanel';
import Map from './Map';
import Mousetrap from 'mousetrap';
import { makeSquare } from '../model/orthogonalize/orthogonalize';
import OutOfBoundsGeometry from './dialogs/OutOfBoundsGeometry';
import MissingLevelOutlines from './dialogs/MissingLevelOutlines';
import PubSub from 'pubsub-js';
import RightPanel from './RightPanel';
import Row from 'react-bootstrap/Row';
import Toolbar from './Toolbar';

const LOCATOR_OVERLAY_ID = "mapbox_locator_overlay";

/**
 * Body is the view main class.
 * It creates all other component in cascade.
 */
class Body extends Component {
	/** Mode for showing only building footprint **/
	static MODE_BUILDING = 0;

	/** Mode for showing only levels footprint **/
	static MODE_LEVELS = 1;

	/** Mode for showing one precise level (its features) **/
	static MODE_FEATURES = 2;

	/** Mode for saving changes **/
	static MODE_CHANGESET = 4;

	/** Mode for editing floor imagery **/
	static MODE_FLOOR_IMAGERY = 5;

	/** Mode for exploring indoor data **/
	static MODE_EXPLORE = 6;

	constructor() {
		super();

		this.state = {
			leftPanelOpen: false,
			rightPanelOpen: false,
			mode: Body.MODE_EXPLORE,
			level: 0,
			building: null,
			floor: null,
			feature: null,
			copyingFeature: null,
			preset: null,
			draw: null,
			pane: null,
			imagery: null,
			selectedOverlaysImagery: null,
			selectedBaseImagery: null,
			overlaysImageryOpacity: 1,
			baseImageryOpacity: 1,
			floorImageryMode: null,
			floorImageryCopyPaste: null,
			changeset: { tags: {} },
			datalocked: false,
			lastUsedPreset: null,
			zoom: CONFIG.map_initial_zoom
		};
	}

	/**
	 * Returns a proper name for showing this feature
	 * @param {Object} feature The feature
	 * @param {string} [fallback] Some predefined fallback for features (for example a preset name)
	 * @return {string} The feature name, category or ID depending what information is available
	 */
	static GetFeatureName(feature, fallback) {
		const t = feature.properties.tags;

		if(t.name || t.ref) {
			return t.name || t.ref;
		}
		else if(t.building) {
			return feature.properties.own.new ? I18n.t("New building") : I18n.t("Building");
		}
		else if(t.indoor === "level" && feature.properties.own && feature.properties.own.levels) {
			return I18n.t("New floor part (level %{lvl})", { lvl: feature.properties.own.levels.join(", ") });
		}
		else if(fallback) {
			return fallback;
		}
		else {
			 return feature.properties.own.new ? I18n.t("New feature") : feature.id;
		}
	}

	render() {
		const modeName = this.state.mode === Body.MODE_EXPLORE ? "mode-explore" : (this.state.mode === Body.MODE_FLOOR_IMAGERY ? "mode-floorplan" : "mode-editindoor");

		return <Container fluid={true} className={"h-100 m-0 p-0 "+modeName}>
			<Header
				className="app-header"
				{...this.state}
			/>

			<Row className="m-0 p-0 app-body">
				{this.state.leftPanelOpen &&
					<Col
						className="m-0 p-0 h-100"
						style={{overflowX: "hidden", overflowY: "auto", borderRight: "3px solid #d0d0d0"}}
						xs="6" sm="5" md="4" lg="4" xl="3"
					>
						<LeftPanel {...this.state} />
					</Col>
				}

				<Col className="m-0 p-0">
					{this.state.mode !== Body.MODE_EXPLORE &&
						<Toolbar {...this.state} />
					}

					<Map
						ref={elem => this.map = elem}
						{...this.state}
					/>
				</Col>

				{this.state.rightPanelOpen &&
					<Col className="m-0 p-0 h-100 overflow-auto" style={{borderLeft: "3px solid #d0d0d0"}} xs="6" sm="5" md="4" lg="4" xl="3">
						<RightPanel {...this.state} />
					</Col>
				}
			</Row>

			<ConfirmDeletion
				show={this.state.showDialogConfirmDeletion}
				name={this.state.mode === Body.MODE_BUILDING && this.state.building ?
					Body.GetFeatureName(this.state.building, I18n.t("Selected building"))
					:
					(this.state.mode === Body.MODE_LEVELS && this.state.floor ?
						Body.GetFeatureName(this.state.floor, I18n.t("Selected floor"))
						: ""
					)
				}
				onCancel={() => this.setState({ showDialogConfirmDeletion: false })}
				onConfirm={deleteAll => {
					this.setState({ showDialogConfirmDeletion: false });
					PubSub.publish("body.delete.feature", { confirmed: true, deleteAll: deleteAll });
				}}
			/>

			<CompleteFloorImagery
				show={this.state.showDialogCompleteFloorImagery}
				onClose={() => this.setState({ showDialogCompleteFloorImagery: false })}
			/>

			<OutOfBoundsGeometry
				show={this.state.showDialogOutOfBoundsGeometry}
				onClose={() => this.setState({ showDialogOutOfBoundsGeometry: false })}
				mode={this.state.mode}
			/>

			<MissingLevelOutlines
				missingOutlines={this.state.showDialogMissingLevelOutlines}
				onIgnore={() => this.setState({ showDialogMissingLevelOutlines: null })}
				onUseDefault={() => this._onMissingOutlineUseDefault()}
				onEdit={() => this._onMissingOutlineGoEdit()}
			/>
		</Container>;
	}

	/**
	 * Event handler for click on "use building outline" button in missing level outline dialog
	 * @private
	 */
	_onMissingOutlineUseDefault() {
		// Create outlines
		if(Object.keys(this.state.showDialogMissingLevelOutlines).length > 0) {
			Object.entries(this.state.showDialogMissingLevelOutlines).forEach(e => {
				const [ buildingId, buildingData ] = e;
				const building = window.vectorDataManager.findFeature(buildingId);

				if(building && buildingData.levels.length > 0) {
					buildingData.levels.forEach(lvl => {
						PubSub.publish("body.create.floor", { feature: building, level: lvl });
					});
				}
			});
		}

		// Hide dialog
		this.setState({ showDialogMissingLevelOutlines: null });
		PubSub.publish("body.mode.set", { mode: Body.MODE_CHANGESET });
	}

	/**
	 * Event handler for click on "go back edit" in missing level outline dialog
	 * @private
	 */
	_onMissingOutlineGoEdit() {
		try {
			// No buildings info
			if(Object.keys(this.state.showDialogMissingLevelOutlines).length === 0) { throw new Error(); }

			const [ buildingId, buildingData ] = Object.entries(this.state.showDialogMissingLevelOutlines)[0];
			const building = window.vectorDataManager.findFeature(buildingId);

			// Building not found
			if(!building || buildingData.levels.length === 0) { throw new Error(); }

			this.setState({
				building: building,
				level: buildingData.levels[0],
				showDialogMissingLevelOutlines: null
			}, () => {
				PubSub.publish("body.mode.set", { mode: Body.MODE_LEVELS });
				const [minX, minY, maxX, maxY] = bbox(building);
				PubSub.publish("map.position.set", { bbox: [minY, maxY, minX, maxX] });
			});
		}
		catch(e) {
			this.setState({ showDialogMissingLevelOutlines: null });
			PubSub.publish("body.mode.set", { mode: Body.MODE_BUILDING });
		}
	}

	_updateImagery() {
		// Load imagery
		window.imageryManager.getAvailableImagery(this.map.getCenter())
		.then(layers => {
			// Adding "custom" entry for allowing user-defined background imagery
			layers.push({ properties: {
				id: "custom", type: "tms", url: null, name: I18n.t("Custom imagery")
			}, geometry: null });

			const newState = {};

			// Update layers list
			if(!deepEqual(layers, this.state.imagery)) {
				newState.imagery = layers;
			}

			// Set default background imagery using the best available around
			const baseImgs = layers.filter(l => !l.properties.overlay);
			if(
				(!this.state.selectedBaseImagery && baseImgs.length > 0)
				|| (this.state.selectedBaseImagery && !baseImgs.find(b => this.state.selectedBaseImagery.properties.id === b.properties.id))
			) {
				newState.selectedBaseImagery = baseImgs[0];
			}

			// Use locator overlay if available
			const locator = layers.find(l => l.properties.id === LOCATOR_OVERLAY_ID);
			if(
				!this.state.selectedOverlaysImagery && locator
				&& (!this.state.zoom || !locator.properties.max_zoom || this.state.zoom <= locator.properties.max_zoom)
			) {
				newState.selectedOverlaysImagery = [ layers.find(l => l.properties.id === LOCATOR_OVERLAY_ID) ];
			}

			if(Object.keys(newState).length > 0) {
				this.setState(newState);
			}
		});
	}

	componentDidMount() {
		this._timerImagery = setInterval(() => this._updateImagery(), 1000);

		/**
		 * Event for changing view mode (what kind of features is shown)
		 * @event body.mode.set
		 * @memberof Body
		 * @property {int} mode The map mode (use Body.MODE_* constants)
		 * @property {Object} [options] The options for current mode
		 */
		PubSub.subscribe("body.mode.set", (msg, data) => {
			// Checks when leaving floor imagery editing
			if(this.state.mode === Body.MODE_FLOOR_IMAGERY && data.mode !== Body.MODE_FLOOR_IMAGERY) {
				// Lock floor imagery
				window.imageryManager.lockFloorImagery();

				// Show complete levels dialog if necessary
				const imagesNoLevel = window.imageryManager.getFloorImages().filter(img => img.level === undefined || img.level === null || isNaN(img.level));
				if(imagesNoLevel.length > 0) {
					this.setState({ showDialogCompleteFloorImagery: true });
					return;
				}
			}

			if(data.mode === Body.MODE_EXPLORE) {
				this.setState({
					mode: data.mode,
					building: null,
					floor: null,
					level: 0,
					feature: null,
					copyingFeature: null,
					draw: null,
					preset: null,
					leftPanelOpen: false,
					pane: null
				});
			}
			else if(data.mode === Body.MODE_BUILDING) {
				this.setState({
					mode: data.mode,
					floor: null,
					level: 0,
					feature: null,
					copyingFeature: null,
					draw: null,
					preset: null,
					leftPanelOpen: this.state.building !== null,
					pane: this.state.building !== null ? LeftPanel.PANE_BUILDING_EDIT : null
				}, () => {
					if(this.state.building) {
						PubSub.publish("body.select.building", { building: this.state.building });
					}
				});
			}
			else if(data.mode === Body.MODE_LEVELS) {
				let theFloor = this.state.floor !== this.state.building ? this.state.floor : null;

				if(!theFloor) {
					const floorParts = window.vectorDataManager.getLevelFootprint(this.state.building, this.state.level);
					theFloor = floorParts.length === 1 ? floorParts[0] : null;
				}

				this.setState({
					mode: data.mode,
					floor: theFloor,
					feature: null,
					copyingFeature: null,
					draw: null,
					preset: null,
					leftPanelOpen: true,
					pane: theFloor ? LeftPanel.PANE_LEVELS_EDIT : LeftPanel.PANE_LEVELS_ADD
				});
			}
			else if(data.mode === Body.MODE_FEATURES) {
				this.setState({
					mode: data.mode,
					feature: null,
					copyingFeature: null,
					draw: null,
					preset: null,
					leftPanelOpen: true,
					pane: LeftPanel.PANE_FEATURE_ADD
				});
			}
			else if(data.mode === Body.MODE_CHANGESET) {
				this.setState({
					mode: data.mode,
					building: null,
					floor: null,
					level: 0,
					feature: null,
					copyingFeature: null,
					draw: null,
					preset: null,
					leftPanelOpen: true,
					pane: LeftPanel.PANE_CHANGESET,
					changeset: {
						status: "preparing"
					},
					rightPanelOpen: false
				}, async () => {
					const diff = await window.vectorDataManager.computeDiff();
					const missingOutlines = window.vectorDataManager.findMissingLevelOutlines(diff);

					this.setState({
						showDialogMissingLevelOutlines: missingOutlines,
						changeset: {
							tags: { comment: "" },
							diff: diff,
							status: "check"
						}
					});
				});
			}
			else if(data.mode === Body.MODE_FLOOR_IMAGERY) {
				this.setState({
					mode: data.mode,
					draw: null,
					level: 0,
					leftPanelOpen: true,
					pane: LeftPanel.PANE_FLOOR_IMAGERY
				});
			}
			else {
				this.setState({
					mode: data.mode,
					pane: null,
					leftPanelOpen: false
				});
			}
		});

		/**
		 * Event for changing current shown level
		 * @event body.level.set
		 * @memberof Body
		 * @property {float} level The level to use
		 */
		PubSub.subscribe("body.level.set", (msg, data) => {
			const newState = { level: data.level };

			if(this.state.mode === Body.MODE_LEVELS) {
				const floorParts = window.vectorDataManager.getLevelFootprint(this.state.building, data.level);

				newState.floor = floorParts.length === 1 ? floorParts[0] : null;
				newState.pane = floorParts.length === 1 ? LeftPanel.PANE_LEVELS_EDIT : LeftPanel.PANE_LEVELS_ADD;
				newState.draw = null;
			}
			else if(this.state.mode === Body.MODE_FEATURES) {
				// Do not keep selection if feature not present on next level
				if(
					!this.state.feature || !this.state.feature.properties.own
					|| !this.state.feature.properties.own.levels
					|| !this.state.feature.properties.own.levels.includes(data.level)
				) {
					newState.feature = null;
					newState.pane = LeftPanel.PANE_FEATURE_ADD;
				}

				newState.floor = null;
				newState.draw = null;
				newState.preset = null;
				newState.lastUsedPreset = this.state.preset
			}

			this.setState(newState);
		});

		/**
		 * Event for adding a new level to a building
		 * @event body.level.add
		 * @memberof Body
		 * @property {string} where Should we add level on top (upper) or underground (below) ?
		 */
		PubSub.subscribe("body.level.add", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.level.add", data), 100);
				return null;
			}

			const levels = this.state.building.properties.own.levels;

			if(data.where === "upper") {
				let max = Math.floor(levels[levels.length-1]);
				const newBuilding = Object.assign({}, this.state.building);
				newBuilding.properties.own.levels.push(max + 1);
				this.setState(
					{ datalocked: true },
					() => this.setState({
						datalocked: false,
						building: window.vectorDataManager.editFeature(newBuilding, true),
						level: max+1,
						floor: null,
						pane: LeftPanel.PANE_LEVELS_ADD,
						leftPanelOpen: true
					})
				);
			}
			else if(data.where === "below") {
				let min = Math.ceil(levels[0]);
				const newBuilding = Object.assign({}, this.state.building);
				newBuilding.properties.own.levels.unshift(min - 1);
				this.setState(
					{ datalocked: true },
					() => this.setState({
						datalocked: false,
						building: window.vectorDataManager.editFeature(newBuilding, true),
						level: min-1,
						floor: null,
						pane: LeftPanel.PANE_LEVELS_ADD,
						leftPanelOpen: true
					})
				);
			}
		});

		/**
		 * Event for copying data from another level into the current one.
		 * @event body.level.copy
		 * @memberof Body
		 * @property {float} use The level to copy data from
		 */
		PubSub.subscribe("body.level.copy", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.level.copy", data), 100);
				return null;
			}

			if(this.state.mode === Body.MODE_LEVELS && this.state.building && this.state.level && data.use) {
				this.setState(
					{ datalocked: true },
					() => {
						window.vectorDataManager.copyLevel(this.state.building, data.use, this.state.level);
						this.setState({ datalocked: false });
					}
				);
			}
		});

		/**
		 * Event for toggling one of the side panels
		 * @event body.panel.toggle
		 * @memberof Body
		 * @property {string} panel The panel to toggle (either right or left)
		 */
		PubSub.subscribe("body.panel.toggle", (msg, data) => {
			if(data.panel === "right") {
				this.setState({ rightPanelOpen: !this.state.rightPanelOpen });
			}
			else if(data.panel === "left") {
				this.setState({ leftPanelOpen: !this.state.leftPanelOpen });
			}
		});

		/**
		 * Event when a particular building has been selected
		 * @event body.select.building
		 * @memberof Body
		 * @property {Object} building The selected building GeoJSON feature
		 */
		PubSub.subscribe("body.select.building", (msg, data) => {
			this.setState({
				building: data.building ? window.vectorDataManager.getBuildingLevels(data.building) : null,
				leftPanelOpen: data.building !== null,
				pane: data.building ? LeftPanel.PANE_BUILDING_EDIT : null
			});
		});

		/**
		 * Event when a particular floor has been selected
		 * @event body.select.floor
		 * @memberof Body
		 * @property {Object} floor The selected floor GeoJSON feature (or eventually building if no floor was found)
		 */
		PubSub.subscribe("body.select.floor", (msg, data) => {
			this.setState({
				floor: data.floor,
				pane: data.floor ? LeftPanel.PANE_LEVELS_EDIT : LeftPanel.PANE_LEVELS_ADD
			});
		});

		/**
		 * Event when a particular feature has been selected
		 * @event body.select.feature
		 * @memberof Body
		 * @property {Object} feature The selected feature as GeoJSON
		 */
		PubSub.subscribe("body.select.feature", (msg, data) => {
			this.setState({
				feature: data.feature,
				leftPanelOpen: true,
				pane: data.feature ? LeftPanel.PANE_FEATURE_EDIT : LeftPanel.PANE_FEATURE_ADD,
				preset: data.feature ? this.state.preset : null
			});
		});

		/**
		 * Event when a particular preset has been selected
		 * @event body.select.preset
		 * @memberof Body
		 * @property {Object} preset The selected preset (or null to unselect)
		 * @property {string} [type] The geometry type to use for drawing
		 */
		PubSub.subscribe("body.select.preset", (msg, data) => {
			if(this.state.mode === Body.MODE_FEATURES) {
				this.setState({ preset: data.preset ? Object.assign({ type: [] }, data.preset) : null });

				// Start editing directly if only one geometry type allowed, or explictly defined in event data
				if(data.preset) {
					const types = data.preset.type ? data.preset.type.map(p => Editable.PRESET_TO_DRAW[p]).filter(p => p !== undefined) : [];
					if(Editable.PRESET_TO_DRAW[data.type] || types.length === 1) {
						PubSub.publish("body.draw.feature", { type: Editable.PRESET_TO_DRAW[data.type] || types[0] });
					}
				}
			}
		});

		/**
		 * Event for unselecting currently selected feature
		 * @event body.unselect.feature
		 * @memberof Body
		 */
		PubSub.subscribe("body.unselect.feature", (msg, data) => {
			if(this.state.mode === Body.MODE_BUILDING) {
				PubSub.publish("body.select.building", { building: null });
			}
			else if(this.state.mode === Body.MODE_LEVELS) {
				PubSub.publish("body.select.floor", { floor: null });
			}
			else if(this.state.mode === Body.MODE_FEATURES) {
				PubSub.publish("body.select.feature", { feature: null });
			}
		});

		/**
		 * Event when user should start drawing a new building
		 * @event body.draw.building
		 * @memberof Body
		 */
		PubSub.subscribe("body.draw.building", (msg, data) => {
			if(this.state.building) {
				PubSub.publishSync("body.unselect.feature");
			}
			this.setState({ draw: Editable.DRAW_POLYGON });
		});

		/**
		 * Event when user should start drawing a new floor
		 * @event body.draw.floor
		 * @memberof Body
		 */
		PubSub.subscribe("body.draw.floor", (msg, data) => {
			this.setState({ floor: null, draw: Editable.DRAW_POLYGON, pane: null, leftPanelOpen: false });
		});

		/**
		 * Event when user should start drawing a new feature
		 * @event body.draw.feature
		 * @memberof Body
		 * @property {int} type The type of geometry (use EditableLayer.DRAW_* constants)
		 */
		PubSub.subscribe("body.draw.feature", (msg, data) => {
			this.setState({ feature: null, draw: data.type, pane: null, leftPanelOpen: false });
		});

		/**
		 * Event for stopping current drawing.
		 * If geometry is valid, it will be kept. If not, it is removed from map.
		 * @event body.draw.stop
		 * @memberof Body
		 */
		PubSub.subscribe("body.draw.stop", (msg, data) => {
			if(
				this.state.draw && this.map && this.map.elem
				&& this.map.elem.leafletElement && this.map.elem.leafletElement.editTools
			) {
				this.map.elem.leafletElement.editTools.stopDrawing();
			}
		});

		/**
		 * Event when user has done drawing the requested feature
		 * @event body.draw.done
		 * @memberof Body
		 * @property {Object} feature The GeoJSON feature that was created
		 */
		PubSub.subscribe("body.draw.done", (msg, data) => {
			// If data is currently loading, wait before creating new geometry
			if(this.map && !this.map.isLoading() && !this.state.datalocked) {
				this.setState(
					{ datalocked: true },
					() => {
						const newState = { draw: null, datalocked: false, leftPanelOpen: true };

						if(this.state.mode === Body.MODE_BUILDING) {
							newState.building = window.vectorDataManager.createNewBuilding(data.feature);
							newState.pane = LeftPanel.PANE_BUILDING_EDIT;
						}
						else if(this.state.mode === Body.MODE_LEVELS) {
							if(window.vectorDataManager.isOverlappingEnough(this.state.building, data.feature)) {
								newState.floor = window.vectorDataManager.createNewFloor(data.feature, this.state.level);
								newState.pane = LeftPanel.PANE_LEVELS_EDIT;
							}
							else {
								newState.showDialogOutOfBoundsGeometry = true;
								delete newState.leftPanelOpen;
							}
						}
						else if(this.state.mode === Body.MODE_FEATURES && this.state.preset) {
							if(window.vectorDataManager.isOverlappingEnough(this.state.building, data.feature)) {
								newState.feature = window.vectorDataManager.createNewFeature(data.feature, this.state.level, this.state.preset);
								newState.lastUsedPreset = this.state.preset;
								newState.pane = LeftPanel.PANE_FEATURE_EDIT;
							}
							else {
								newState.showDialogOutOfBoundsGeometry = true;
								newState.feature = null;
								newState.pane = LeftPanel.PANE_FEATURE_ADD;
								newState.preset = null;
								newState.lastUsedPreset = this.state.preset;
								PubSub.publish("map.editablelayer.redraw");
							}

						}

						this.setState(newState);
					}
				);
			}
			else {
				setTimeout(() => PubSub.publish("body.draw.done", data), 100);
			}
		});

		/**
		 * Event when user wants to abort drawing
		 * @event body.draw.cancel
		 * @memberof Body
		 */
		PubSub.subscribe("body.draw.cancel", (msg, data) => {
			const newState = { draw: null };

			if(this.state.mode === Body.MODE_FEATURES) {
				newState.preset = null;
				newState.pane = LeftPanel.PANE_FEATURE_ADD;
				newState.leftPanelOpen = true;
			}
			else if(this.state.mode === Body.MODE_LEVELS) {
				newState.pane = LeftPanel.PANE_LEVELS_ADD;
				newState.leftPanelOpen = true;
			}

			this.setState(newState);
		});

		/**
		 * Event when new floor should be created directly (not using draw on map).
		 * This is mainly used when user creates a new floor using building footprint.
		 * @event body.create.floor
		 * @memberof Body
		 * @property {Object} feature The GeoJSON feature to use
		 * @property {int} [level] Which level floor should be created on (by default selected level)
		 */
		PubSub.subscribe("body.create.floor", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.create.floor", data), 100);
				return null;
			}

			const newFeature = {
				type: "Feature",
				geometry: Object.assign({}, data.feature.geometry),
				properties: {}
			};

			if(this.state.mode === Body.MODE_LEVELS) {
				if(window.vectorDataManager.isOverlappingEnough(this.state.building, newFeature)) {
					this.setState(
						{ datalocked: true },
						() => this.setState({
							datalocked: false,
							floor: window.vectorDataManager.createNewFloor(newFeature, this.state.level),
							pane: LeftPanel.PANE_LEVELS_EDIT
						})
					);
				}
				else {
					this.setState({ showDialogOutOfBoundsGeometry: true });
				}
			}
			else if(this.state.mode === Body.MODE_CHANGESET && !isNaN(data.level)) {
				window.vectorDataManager.createNewFloor(newFeature, data.level);
			}
		});

		/**
		 * Event when geometry of an existing feature has been edited
		 * @event body.edit.feature
		 * @memberof Body
		 * @property {Object} feature The edited version of the GeoJSON feature
		 * @property {boolean} select Should feature be selected after update (defaults to yes)
		 */
		PubSub.subscribe("body.edit.feature", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.edit.feature", data), 100);
				return null;
			}

			if(data.feature && data.feature.id) {
				if(window.vectorDataManager.isOverlappingEnough(this.state.building, data.feature)) {
					this.setState(
						{ datalocked: true },
						async () => {
							const feature = await window.vectorDataManager.editFeatureGeometry(data.feature.id, data.feature.geometry);
							this.setState({ datalocked: false }, () => {
								if(feature && (data.select === undefined || data.select === true)) {
									if(this.state.mode === Body.MODE_BUILDING) {
										PubSub.publish("body.select.building", { building: feature });
									}
									else if(this.state.mode === Body.MODE_LEVELS) {
										PubSub.publish("body.select.floor", { floor: feature });
									}
									else if(this.state.mode === Body.MODE_FEATURES) {
										PubSub.publish("body.select.feature", { feature: feature });
									}
								}
							});
						}
					);
				}
				else {
					this.setState({ showDialogOutOfBoundsGeometry: true, floor: null, pane: LeftPanel.PANE_LEVELS_ADD }, () => {
						PubSub.publish("map.editablelayer.redraw");
					});
				}
			}
			else {
				console.log("Missing information for editing this feature", data.feature);
			}
		});

		/**
		 * Event for deleting currently selected feature
		 * @event body.delete.feature
		 * @memberof Body
		 * @property {boolean} [confirmed] Is the action confirmed by user (for building/level only)
		 * @property {boolean} [deleteAll] Delete also features contained in building/level
		 */
		PubSub.subscribe("body.delete.feature", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.delete.feature", data), 100);
				return null;
			}

			data = data || {};

			// Erase data
			if(this.state.mode === Body.MODE_FEATURES && this.state.feature) {
				this.setState(
					{ datalocked: true },
					() => {
						window.vectorDataManager.deleteFeature(this.state.feature);
						PubSub.publish("body.unselect.feature");
						this.setState({ datalocked: false });
					}
				);
			}
			else if(data.confirmed) {
				this.setState(
					{ datalocked: true },
					() => {
						if(this.state.mode === Body.MODE_BUILDING && this.state.building) {
							window.vectorDataManager.deleteFeature(this.state.building, data.deleteAll);
							PubSub.publish("body.unselect.feature");
						}
						else if(this.state.mode === Body.MODE_LEVELS && this.state.floor) {
							window.vectorDataManager.deleteFeature(this.state.floor, data.deleteAll);
							PubSub.publish("body.unselect.feature");
						}
						this.setState({ datalocked: false });
					}
				);
			}
			// Ask for confirmation first
			else if((this.state.mode === Body.MODE_BUILDING && this.state.building) || (this.state.mode === Body.MODE_LEVELS && this.state.floor)) {
				this.setState({ showDialogConfirmDeletion: true });
			}
		});

		/**
		 * Event for orthogonalize (make square) currently selected feature
		 * @event body.square.feature
		 * @memberof Body
		 */
		PubSub.subscribe("body.square.feature", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.square.feature", data), 100);
				return null;
			}

			this.setState(
				{ datalocked: true },
				async () => {
					const squarify = async (feature) => {
						return await window.vectorDataManager.editFeatureGeometry(feature.id, makeSquare(feature, this.map.elem.leafletElement).geometry);
					};

					if(this.state.mode === Body.MODE_BUILDING && this.state.building) {
						PubSub.publish("body.select.building", { building: await squarify(this.state.building) });
					}
					else if(this.state.mode === Body.MODE_LEVELS && this.state.floor) {
						PubSub.publish("body.select.floor", { floor: await squarify(this.state.floor) });
					}
					else if(this.state.mode === Body.MODE_FEATURES && this.state.feature) {
						PubSub.publish("body.select.feature", { feature: await squarify(this.state.feature) });
					}

					this.setState({ datalocked: false });
				}
			);
		});

		/**
		 * Event for copying selected feature (and paste it later)
		 * @event body.copy.feature
		 * @memberof Body
		 */
		PubSub.subscribe("body.copy.feature", (msg, data) => {
			if(this.state.mode === Body.MODE_FEATURES && this.state.feature) {
				this.setState({ copyingFeature: this.state.feature });
			}
		});

		/**
		 * Event for pasting previously copied feature
		 * @event body.paste.feature
		 * @memberof Body
		 */
		PubSub.subscribe("body.paste.feature", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.paste.feature", data), 100);
				return null;
			}

			if(this.state.mode === Body.MODE_FEATURES && this.state.copyingFeature) {
				const mouseCoords = this.map && this.map._mouseCoords;

				if(mouseCoords) {
					this.setState(
						{ datalocked: true },
						() => {
							this.setState({
								feature: window.vectorDataManager.copyFeature(this.state.copyingFeature, this.state.level, mouseCoords),
								leftPanelOpen: true,
								pane: LeftPanel.PANE_FEATURE_EDIT,
								datalocked: false
							});
						}
					);
				}
			}
		});

		/**
		 * Event for changing imagery to display on map
		 * @event body.imagery.set
		 * @memberof Body
		 * @property {Object[]} imagery The imagery to use
		 * @property {string} type The kind of layer concerned (background, overlay)
		 */
		PubSub.subscribe("body.imagery.set", (msg, data) => {
			if(data.type === "overlay") {
				this.setState({ selectedOverlaysImagery: data.imagery });
			}
			else if(data.type === "background") {
				this.setState({ selectedBaseImagery: data.imagery[0] });
			}
		});

		/**
		 * Event for changing imagery opacity on map
		 * @event body.imagery.opacity
		 * @memberof Body
		 * @property {float} opacity The new opacity value
		 * @property {string} type The kind of layer concerned (background, overlay or floor)
		 */
		PubSub.subscribe("body.imagery.opacity", (msg, data) => {
			if(data.type !== "floor") {
				const typeToVar = { "background": "baseImageryOpacity", "overlay": "overlaysImageryOpacity" };
				this.setState({ [typeToVar[data.type]]: data.opacity });
			}
			else {
				// Find selected layer
				const selected = window.imageryManager.getFloorImages().find(img => img.selected && img.visible);
				if(selected) {
					PubSub.publish("body.floorimagery.update", { imagery: [ Object.assign({}, selected, { opacity: data.opacity }) ] });
				}
			}
		});

		/**
		 * Event for adding new floor imagery on map
		 * @event body.floorimagery.add
		 * @memberof Body
		 * @property {Object[]} imagery The imagery to add
		 */
		PubSub.subscribe("body.floorimagery.add", async (msg, data) => {
			await window.imageryManager.addFloorImagery(data.imagery, this.map.getBounds(), this.map.elem.leafletElement);
			if(this.state.floorImageryMode === null) {
				this.setState({ floorImageryMode: "scale" });
			}
			else {
				this.forceUpdate();
			}
		});

		/**
		 * Event for updating some floor imagery
		 * @event body.floorimagery.update
		 * @memberof Body
		 * @property {Object[]} imagery The imagery to update (should have their ID defined)
		 */
		PubSub.subscribe("body.floorimagery.update", async (msg, data) => {
			await window.imageryManager.updateFloorImagery(data.imagery);
			this.forceUpdate();
		});

		/**
		 * Event for changing editing tool
		 * @event body.floorimagery.mode
		 * @memberof Body
		 * @property {string} [mode] The tool to use (distort, scale, rotate)
		 */
		PubSub.subscribe("body.floorimagery.mode", async (msg, data) => {
			this.setState({ floorImageryMode: data.mode });
		});

		/**
		 * Event for removing some floor imagery
		 * @event body.floorimagery.remove
		 * @memberof Body
		 * @property {string} [id] The imagery ID, or all imagery if null
		 */
		PubSub.subscribe("body.floorimagery.remove", async (msg, data) => {
			await window.imageryManager.removeFloorImagery(data && data.id);
			this.forceUpdate();
		});

		/**
		 * Event for offering user to save its floor imagery configuration
		 * @event body.floorimagery.save
		 * @memberof Body
		 */
		PubSub.subscribe("body.floorimagery.save", (msg, data) => {
			saveAs(
				new Blob(
					[JSON.stringify(window.imageryManager.getFloorImages(), null, 2)],
					{ type: "text/plain;charset=utf-8" }
				),
				"osminedit_floor_imagery.json"
			);
		});

		/**
		 * Event for copying current floor plan position into memory
		 * @event body.floorimagery.copyposition
		 * @memberof Body
		 */
		PubSub.subscribe("body.floorimagery.copyposition", async (msg, data) => {
			// Find selected floor imagery
			const selected = window.imageryManager.getFloorImages().find(img => img.selected && img.visible);
			if(selected) {
				this.setState({ floorImageryCopyPaste: {
					topleft: selected.topleft,
					topright: selected.topright,
					bottomleft: selected.bottomleft,
					bottomright: selected.bottomright,
					origWidth: selected.origWidth,
					origHeight: selected.origHeight
				} });
			}
		});

		/**
		 * Event for pasting previously copied position on selected floor plan
		 * @event body.floorimagery.pasteposition
		 * @memberof Body
		 */
		PubSub.subscribe("body.floorimagery.pasteposition", async (msg, data) => {
			await window.imageryManager.moveFloorImagery(this.map && this.map.elem && this.map.elem.leafletElement, this.state.floorImageryCopyPaste);
			this.forceUpdate();
		});

		/**
		 * Event for changing tags of currently selected feature
		 * @event body.tags.set
		 * @memberof Body
		 * @property {Object} tags The new set of tags for current feature
		 */
		PubSub.subscribe("body.tags.set", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.tags.set", data), 100);
				return null;
			}

			if(this.state.mode === Body.MODE_CHANGESET) {
				const c = Object.assign({}, this.state.changeset, { tags: data.tags });
				this.setState({ changeset: c });
			}
			else {
				this.setState(
					{ datalocked: true },
					() => {
						if(this.state.mode === Body.MODE_BUILDING) {
							const f = Object.assign({}, this.state.building);
							if(!data.tags.building || data.tags.building.trim() === "") { data.tags.building = "yes"; }
							this.setState({ building: window.vectorDataManager.setFeatureTags(f.id, data.tags), datalocked: false });
						}
						else if(this.state.mode === Body.MODE_LEVELS) {
							const f = Object.assign({}, this.state.floor);
							this.setState({ floor: window.vectorDataManager.setFeatureTags(f.id, data.tags), datalocked: false });
						}
						else if(this.state.mode === Body.MODE_FEATURES) {
							const f = Object.assign({}, this.state.feature);
							this.setState({ feature: window.vectorDataManager.setFeatureTags(f.id, data.tags), datalocked: false });
						}
						else {
							this.setState({ datalocked: false });
						}
					}
				);
			}
		});

		/**
		 * Event for cancelling last action
		 * @event body.action.undo
		 * @memberof Body
		 */
		PubSub.subscribe("body.action.undo", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.action.undo", data), 100);
				return null;
			}

			this.setState(
				{ datalocked: true },
				() => {
					if(this.state.mode === Body.MODE_FLOOR_IMAGERY) {
						window.imageryManager.undo();
					}
					else if([Body.MODE_BUILDING, Body.MODE_LEVELS, Body.MODE_FEATURES].includes(this.state.mode)) {
						if(this.state.draw) {
							PubSub.publish("body.draw.cancel");
						}
						else {
							window.vectorDataManager.undo();
						}
					}
					this.setState({ datalocked: false });
					this.forceUpdate();
				}
			);
		});

		/**
		 * Event for restoring last action
		 * @event body.action.redo
		 * @memberof Body
		 */
		PubSub.subscribe("body.action.redo", (msg, data) => {
			if(this.state.datalocked) {
				setTimeout(() => PubSub.publish("body.action.redo", data), 100);
				return null;
			}

			this.setState(
				{ datalocked: true },
				() => {
					if(this.state.mode === Body.MODE_FLOOR_IMAGERY) {
						window.imageryManager.redo();
					}
					else if([Body.MODE_BUILDING, Body.MODE_LEVELS, Body.MODE_FEATURES].includes(this.state.mode) && !this.state.draw) {
						window.vectorDataManager.redo();
					}
					this.setState({ datalocked: false });
					this.forceUpdate();
				}
			);
		});

		/**
		 * Event for saving all edits
		 * @event body.action.save
		 * @memberof Body
		 */
		PubSub.subscribe("body.action.save", async (msg, data) => {
			this.setState({ changeset: Object.assign({}, this.state.changeset, { status: "upload" }) });
			const res = await window.vectorDataManager.sendOSMData(this.state.changeset.tags);
			if(typeof res === "number") {
				this.setState({ changeset: { status: "sent", id: res } });
			}
			else {
				console.error(res);
				const newState = { changeset: { status: "error" } };

				if(res.message === "Changeset creation failed") {
					newState.changeset.reason = "changeset_failed";
				}

				this.setState(newState);
			}
		});

		/**
		 * Event for cleaning up all data after changeset upload
		 * @event body.action.cleanup
		 * @memberof Body
		 */
		PubSub.subscribe("body.action.cleanup", (msg, data) => {
			window.vectorDataManager.cleanUp();
			if(this.map) {
				this.map.cleanUp();
			}
			PubSub.publish("body.mode.set", { mode: Body.MODE_BUILDING });
		});

		// Map zoom changes
		PubSub.subscribe("map.zoom.changed", (msg, data) => {
			this.setState({ zoom: data.zoom });

			// Disable locator overlay if zooming
			const locator = this.state.selectedOverlaysImagery && this.state.selectedOverlaysImagery.find(l => l.properties.id === LOCATOR_OVERLAY_ID);
			if(locator && data.zoom && locator.properties.max_zoom && data.zoom > locator.properties.max_zoom) {
				const newlist = this.state.selectedOverlaysImagery.filter(l => l.properties.id !== LOCATOR_OVERLAY_ID);
				this.setState({ selectedOverlaysImagery: newlist.length === 0 ? null : newlist });
			}
		});


		/*
		 * Keyboard events
		 */

		Mousetrap.bind("esc", () => {
			// Drawing mode
			if(this.state.draw) {
				PubSub.publish("body.draw.stop");
			}
			// Unselect feature
			else if(
				(this.state.mode === Body.MODE_BUILDING && this.state.building)
				|| (this.state.mode === Body.MODE_LEVELS && this.state.floor)
				|| (this.state.mode === Body.MODE_FEATURES && this.state.feature)
			) {
				PubSub.publish("body.unselect.feature");
			}
			// Change mode
			else {
				if(this.state.mode === Body.MODE_FEATURES) {
					PubSub.publish("body.mode.set", { mode: Body.MODE_LEVELS });
				}
				else if(this.state.mode === Body.MODE_LEVELS) {
					PubSub.publish("body.mode.set", { mode: Body.MODE_BUILDING });
				}
			}
		});

		Mousetrap.bind("enter", () => {
			// Drawing mode
			if(this.state.draw) {
				PubSub.publish("body.draw.stop");
			}
		});

		// Undo edits
		Mousetrap.bind("ctrl+z", () => {
			PubSub.publish("body.action.undo");
		});

		// Redo edits
		Mousetrap.bind("ctrl+shift+z", () => {
			PubSub.publish("body.action.redo");
		});

		// Delete feature
		Mousetrap.bind("del", () => {
			PubSub.publish("body.delete.feature");
		});

		// Copy/paste feature
		Mousetrap.bind("ctrl+c", () => {
			PubSub.publish("body.copy.feature");
		});
		Mousetrap.bind("ctrl+v", () => {
			PubSub.publish("body.paste.feature");
		});

		// Update after locale changes
		I18n.on("change", locale => {
			this.forceUpdate();
			console.log("Loaded locale", locale);
		});
	}

	componentDidUpdate(prevProps, prevState) {
		const newState = {};

		if(this.map) {
			// Alert map that its size have potentially changed
			this.map.invalidateSize();
		}

		// Open/close left panel if it changes
		if(this.state.pane && prevState.pane !== this.state.pane && !this.state.leftPanelOpen) {
			newState.leftPanelOpen = true;
		}
		if(!this.state.pane && prevState.pane !== this.state.pane && this.state.leftPanelOpen) {
			newState.leftPanelOpen = false;
		}

		// Fallback modes if info is missing (undo/redo)
		if([ Body.MODE_FEATURES, Body.MODE_LEVELS ].includes(this.state.mode) && !this.state.building) {
			newState.mode = Body.MODE_BUILDING;
			newState.pane = null;
			newState.leftPanelOpen = false;
		}

		// Check pane coherence
		if(this.state.mode === Body.MODE_BUILDING && this.state.pane && this.state.pane !== LeftPanel.PANE_BUILDING_EDIT) {
			newState.pane = this.state.building ? LeftPanel.PANE_BUILDING_EDIT : null;
			newState.leftPanelOpen = this.state.building ? true : false;
		}
		if(this.state.mode === Body.MODE_LEVELS && this.state.pane && ![LeftPanel.PANE_LEVELS_ADD, LeftPanel.PANE_LEVELS_EDIT].includes(this.state.pane)) {
			newState.pane = this.state.floor ? LeftPanel.PANE_LEVELS_EDIT : LeftPanel.PANE_LEVELS_ADD;
			newState.leftPanelOpen = true;
		}
		if(this.state.mode === Body.MODE_FEATURES && this.state.pane && ![LeftPanel.PANE_FEATURE_ADD, LeftPanel.PANE_FEATURE_EDIT].includes(this.state.pane)) {
			newState.pane = this.state.feature ? LeftPanel.PANE_FEATURE_EDIT : LeftPanel.PANE_FEATURE_ADD;
			newState.leftPanelOpen = true;
		}

		if(Object.keys(newState).length > 0) {
			this.setState(newState);
		}
	}

	componentWillUnmount() {
		PubSub.unsubscribe("body.*");
		PubSub.unsubscribe("map.zoom.changed");
		Mousetrap.unbind("esc");
		Mousetrap.unbind("ctrl+z");
		Mousetrap.unbind("ctrl+shift+z");
		clearInterval(this._timerImagery);
	}
}

export default Body;
