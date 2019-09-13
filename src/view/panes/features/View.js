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
import Pencil from 'mdi-react/PencilIcon';
import PubSub from 'pubsub-js';
import Row from 'react-bootstrap/Row';
import TagsTable from '../../common/TagsTable';

/**
 * Edit feature pane allows user to change one feature description
 */
class ViewFeaturePane extends Component {
	_onEdit() {
		if(this.props.feature && this.props.feature.properties.tags) {
			const t = this.props.feature.properties.tags;

			if(t.building) {
				PubSub.publishSync("body.mode.set", { mode: Body.MODE_BUILDING });
				PubSub.publishSync("body.select.building", { building: this.props.feature });
			}
			else if(t.indoor === "level" && this.props.building) {
				PubSub.publishSync("body.mode.set", { mode: Body.MODE_LEVELS });
				PubSub.publishSync("body.select.floor", { floor: this.props.feature });
			}
			else if(this.props.building) {
				PubSub.publishSync("body.mode.set", { mode: Body.MODE_FEATURES });
				PubSub.publishSync("body.select.feature", { feature: this.props.feature });
			}
		}
	}

	render() {
		if(!this.props.feature) { return <div></div>; }

		const feature = this.props.feature;
		const tags = feature.properties.tags;
		const presets = window.presetsManager.findPresetsForFeature(feature);
		const name = Body.GetFeatureName(feature, [...new Set(presets.map(p => p.name))].join(", "))

		return <div>
			<Container className="m-0 pl-2 pr-2 mt-2">
				<Row className="d-flex align-items-top justify-content-between">
					<Col>
						<h3 className="m-0 p-0">{name}</h3>
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
			</Container>

			<div className="m-2 mb-3">
				{this.props.building &&
					<Button
						variant="outline-secondary"
						block
						size="sm"
						onClick={() => this._onEdit()}
					>
						<Pencil /> {I18n.t("Edit this feature")}
					</Button>
				}
			</div>

			<div className="m-2">
				<TagsTable
					tags={tags}
					locked={true}
				/>

				{(!feature.properties.own || !feature.properties.own.new) &&
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
}

export default ViewFeaturePane;
