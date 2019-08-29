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
import Body from '../Body';
import Button from 'react-bootstrap/Button';
import Check from 'mdi-react/CheckIcon';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import PresetInputField from '../common/PresetInputField';
import PubSub from 'pubsub-js';
import Row from 'react-bootstrap/Row';
import TagsTable from '../common/TagsTable';

/**
 * BuildingEdit pane allows to change a building description for user.
 *
 * @property {Object} feature The building feature to edit
 */
class BuildingEditPane extends Component {
	/**
	 * Event handler when "Done" button is clicked
	 * @private
	 */
	_onDone() {
		PubSub.publish("body.unselect.feature");
	}

	render() {
		if(!this.props.building) { return <div></div>; }

		const feature = this.props.building;
		const tags = feature.properties.tags;
		const infoLevels = <span>{window.I18n.t("Number of levels above ground (roof excluded), here B + C + D = 3 levels")}<img src='img/building_levels.png' style={{height: 200}} alt={window.I18n.t("Schema explaining how should be set amount of levels")} /></span>

		return <div>
			<Container className="m-0 pl-2 pr-2 mt-2">
				<Row className="d-flex align-items-center justify-content-between">
					<Col>
						<h3 className="m-0 p-0">{Body.GetFeatureName(feature)}</h3>
					</Col>

					<Col className="text-right">
						<Button
							variant="outline-secondary"
							size="sm"
							title={window.I18n.t("Done")}
							onClick={() => this._onDone()}
						>
							<Check />
						</Button>
					</Col>
				</Row>
			</Container>

			<div className="m-2 mb-4">
				<PresetInputField
					type="text"
					data={{ text: window.I18n.t("Name"), key: "name" }}
					tags={tags}
				/>

				<PresetInputField
					type="combo"
					data={{ text: window.I18n.t("Type of building"), key: "building", values: "retail,commercial,parking,industrial,apartments,garage,school,church,warehouse,university,office,hospital,hotel,train_station,college,civic,public,yes" , use_last_as_default: "force" }}
					tags={tags}
				/>

				<PresetInputField
					type="text"
					data={{ text: window.I18n.t("Total height (in meters)"), key: "building:height" }}
					tags={tags}
				/>

				<PresetInputField
					type="number"
					data={{ text: window.I18n.t("Number of overground levels (roof excluded)"), info: infoLevels, key: "building:levels" }}
					tags={tags}
				/>
			</div>

			<div className="m-2">
				<TagsTable
					tags={tags}
					noDelete={["building", "building:part"]}
				/>
			</div>
		</div>;
	}
}

export default BuildingEditPane;
