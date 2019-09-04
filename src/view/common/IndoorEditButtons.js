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
import ArrowExpandDown from 'mdi-react/ArrowExpandDownIcon';
import ArrowExpandUp from 'mdi-react/ArrowExpandUpIcon';
import Body from '../Body';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import CONFIG from '../../config/config.json';
import Delete from 'mdi-react/DeleteIcon';
import GeometryButtons from './GeometryButtons';
import I18n from '../../config/locales';
import Layers from 'mdi-react/LayersIcon';
import OfficeBuilding from 'mdi-react/OfficeBuildingIcon';
import Pencil from 'mdi-react/PencilIcon';
import PubSub from 'pubsub-js';
import SquareEditOutline from 'mdi-react/SquareEditOutlineIcon';
import VectorSquare from 'mdi-react/VectorSquareIcon';

/**
 * Indoor edit buttons are buttons shown in the toolbar when editing indoor data.
 */
class IndoorEditButtons extends Component {
	render() {
		// Drawing geometry
		if(this.props.draw) {
			return <GeometryButtons />;
		}
		else {
			// Not zoomed enough
			if(this.props.zoom && this.props.zoom < CONFIG.data_min_zoom) {
				return <p>{I18n.t("Please zoom-in to edit data")}</p>;
			}
			// Zoomed enough
			else {
				if(this.props.mode === Body.MODE_BUILDING) {
					return <div>
						{this.props.building && [
							<Button
								variant="primary"
								title={I18n.t("Edit inside this building")}
								onClick={() => PubSub.publish("body.mode.set", { mode: Body.MODE_LEVELS })}
								size="sm"
								className="mr-1"
								key={0}
							>
								<Layers /> {I18n.t("Edit levels")}
							</Button>
							,
							<Button
								variant="outline-danger"
								onClick={() => PubSub.publish("body.delete.feature")}
								size="sm"
								className="mr-1"
								key={1}
								title={I18n.t("Delete this building")}
							>
								<Delete />
							</Button>
						]}

						{this.props.building &&
							<Button
								variant="outline-secondary"
								onClick={() => PubSub.publish("body.square.feature")}
								size="sm"
								className="mr-1"
								title={I18n.t("Square this building")}
							>
								<VectorSquare />
							</Button>
						}

						<Button
							variant={this.props.building ? "outline-secondary" : "primary"}
							size="sm"
							title={I18n.t("Click to start creating a new building from scratch")}
							onClick={() => PubSub.publish("body.draw.building")}
						>
							<OfficeBuilding /> <span className={this.props.building ? "hide-mdDown" : ""}>{I18n.t("New building")}</span>
						</Button>
					</div>;
				}
				else if(this.props.mode === Body.MODE_LEVELS) {
					const floorParts = window.vectorDataManager.getLevelFootprint(this.props.building, this.props.level || 0);

					return <div>
						{this.props.floor && [
							<Button
								variant="primary"
								title={I18n.t("Edit objects contained in this floor")}
								onClick={() => PubSub.publish("body.mode.set", { mode: Body.MODE_FEATURES })}
								className="mr-1"
								size="sm"
								key={0}
							>
								<Pencil /> {I18n.t("Edit features")}
							</Button>
							,
							<Button
								variant="outline-secondary"
								onClick={() => PubSub.publish("body.square.feature")}
								size="sm"
								className="mr-1"
								key={1}
								title={I18n.t("Square this floor part")}
							>
								<VectorSquare />
							</Button>
							,
							<Button
								variant="outline-danger"
								onClick={() => PubSub.publish("body.delete.feature")}
								size="sm"
								className="mr-1"
								key={2}
								title={I18n.t("Delete this floor part")}
							>
								<Delete />
							</Button>
						]}

						{floorParts.length > 0 &&
							<Button
								variant="outline-secondary"
								onClick={() => PubSub.publish("body.draw.floor")}
								size="sm"
								className="mr-1"
								title={I18n.t("Create a new floor part in this level. Useful for giving different names to parts of a single level.")}
							>
								<SquareEditOutline /> <span className="hide-mdDown">{I18n.t("Add another floor part")}</span>
							</Button>
						}

						<ButtonGroup>
							<Button
								variant="outline-primary"
								title={I18n.t("Create a new level on top of existing ones")}
								onClick={() => PubSub.publish("body.level.add", { where: "upper" })}
								size="sm"
							>
								<ArrowExpandUp /> <span className="hide-mdDown">{I18n.t("New upper level")}</span>
							</Button>
							<Button
								variant="outline-primary"
								title={I18n.t("Create a new level under existing ones")}
								onClick={() => PubSub.publish("body.level.add", { where: "below" })}
								size="sm"
							>
								<ArrowExpandDown /> <span className="hide-mdDown">{I18n.t("New below level")}</span>
							</Button>
						</ButtonGroup>
					</div>;
				}
				else if(this.props.mode === Body.MODE_FEATURES) {
					return <div>
						{this.props.feature && this.props.feature.id.startsWith("way/") &&
							<Button
								variant="outline-secondary"
								onClick={() => PubSub.publish("body.square.feature")}
								size="sm"
								className="mr-1"
								title={I18n.t("Square this feature")}
							>
								<VectorSquare />
							</Button>
						}

						{this.props.feature &&
							<Button
								variant="outline-danger"
								onClick={() => PubSub.publish("body.delete.feature")}
								size="sm"
								title={I18n.t("Delete this feature")}
							>
								<Delete />
							</Button>
						}
					</div>;
				}
				else {
					return <span></span>;
				}
			}
		}
	}
}

export default IndoorEditButtons;
