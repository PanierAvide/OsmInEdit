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
import I18n from '../../../config/locales/ui';
import PresetInputField from '../../common/PresetInputField';
import PubSub from 'pubsub-js';
import Row from 'react-bootstrap/Row';
import TagsTable from '../../common/TagsTable';

/**
 * EditOneLevel pane allows to change a level description.
 */
class EditOneLevelPane extends Component {
	render() {
		if(!this.props.floor) { return <div></div>; }

		const imgHeight = <span>{I18n.t("Relative floor level height in meters")}<img src='img/floor_height.jpg' style={{height: 200}} alt={I18n.t("Schema explaining how should be set level height")} /></span>;

		return <Container className="m-0 pl-2 pr-2 mt-2">
			<Row className="d-flex align-items-top justify-content-between">
				<Col>
					<h3 className="m-0 p-0">{Body.GetFeatureName(this.props.floor)}</h3>
				</Col>

				<Col className="text-right">
					<Button
						variant="outline-secondary"
						size="sm"
						title={I18n.t("Done")}
						onClick={() => PubSub.publish("body.unselect.feature")}
					>
						<Check />
					</Button>
				</Col>
			</Row>
			<Row className="mt-2">
				<Col className="m-0 p-2">
					<div className="m-2 mb-4">
						<PresetInputField
							type="text"
							data={{ text: I18n.t("Name"), key: "name" }}
							tags={this.props.floor.properties.tags}
						/>

						<PresetInputField
							type="text"
							data={{ text: I18n.t("Height (in meters)"), key: "height", info: imgHeight }}
							tags={this.props.floor.properties.tags}
						/>

						<PresetInputField
							type="check"
							data={{ text: I18n.t("Surrounded by walls"), key: "wall" }}
							tags={this.props.floor.properties.tags}
						/>
					</div>

					<div className="m-2">
						<TagsTable
							tags={this.props.floor.properties.tags}
						/>
					</div>
				</Col>
			</Row>
		</Container>;
	}
}

export default EditOneLevelPane;
