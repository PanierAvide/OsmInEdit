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
import ContentDuplicate from 'mdi-react/ContentDuplicateIcon';
import I18n from '../../../config/locales/ui';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import PubSub from 'pubsub-js';
import ShapePolygonPlus from 'mdi-react/ShapePolygonPlusIcon';
import SquareEditOutline from 'mdi-react/SquareEditOutlineIcon';

/**
 * EditAllLevels pane allows to select and create levels in a given building.
 */
class EditAllLevelsPane extends Component {
	/**
	 * Event handler for click on "Create using floor outline" button
	 * @private
	 */
	_editWithoutFloorContour() {
		PubSub.publish("body.select.floor", { floor: this.props.building });
		PubSub.publish("body.mode.set", { mode: Body.MODE_FEATURES });
	}

	render() {
		if(!this.props.building) { return <div></div>; }

		const floorParts = window.vectorDataManager.getLevelFootprint(this.props.building, this.props.level || 0);
		const levelsForCopy = window.vectorDataManager.getCopiableLevels(this.props.building).filter(lvl => lvl !== this.props.level);
		levelsForCopy.reverse();

		return <div className="m-0 pl-2 pr-2 mt-2">
			<h3 className="m-0 mb-2 p-0">{I18n.t("Level %{lvl}", { lvl: this.props.level })}</h3>

			{this.props.draw &&
				<p>{I18n.t("You can draw your feature on the map. Click on done button or click again on last node you created to finish.")}</p>
			}

			{!this.props.draw && !this.props.floor && floorParts.length > 0 &&
				<p>{I18n.t("Please select the floor part to edit using the map.")}</p>
			}

			{!this.props.draw && !this.props.floor && floorParts.length === 0 && [
				<p className="m-0" key={0}>{I18n.t("This level doesn't have a precise floor outline defined yet.")}</p>
				,
				<Button
					variant="outline-primary"
					className="mt-2 w-100"
					key={1}
					onClick={() => PubSub.publish("body.create.floor", { feature: this.props.building })}
				>
					<ShapePolygonPlus /> {I18n.t("Use the whole building footprint")}
				</Button>
				,
				<Button
					variant="outline-secondary"
					className="mt-2 w-100"
					key={2}
					onClick={() => PubSub.publish("body.draw.floor")}
				>
					<SquareEditOutline /> {I18n.t("Draw this floor outline")}
				</Button>
			]}

			{!this.props.draw && !this.props.floor && floorParts.length === 0 && levelsForCopy.length > 0 &&
				<InputGroup
					className="mt-2 w-100"
				>
					<InputGroup.Prepend>

						<InputGroup.Text><ContentDuplicate size={18} /> {I18n.t("Copy level")}</InputGroup.Text>

					</InputGroup.Prepend>

					<Form.Control as="select" ref="levelSelect">

						{levelsForCopy.map((lvl,i) => (
							<option key={i}>{lvl}</option>
						))}
					</Form.Control>

					<InputGroup.Append>

						<Button
							variant="outline-secondary"
							title={I18n.t("Copy selected level data in the current level")}
							onClick={() => PubSub.publish("body.level.copy", { use: this.refs.levelSelect.value })}
						>
							<Check size={18} />
						</Button>
					</InputGroup.Append>
				</InputGroup>
			}
		</div>;
	}
}

export default EditAllLevelsPane;
