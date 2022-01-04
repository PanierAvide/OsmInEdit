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
import Body from './Body';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ContentSave from 'mdi-react/ContentSaveIcon';
import MapCheck from 'mdi-react/MapCheckIcon';
import FloorImageryButtons from './common/FloorImageryButtons';
import I18n from '../config/locales/ui';
import IndoorEditButtons from './common/IndoorEditButtons';
import PubSub from 'pubsub-js';
import Undo from 'mdi-react/UndoIcon';
import Redo from 'mdi-react/RedoIcon';

/**
 * Toolbar is a panel where user can access tools related to current mode of the editor.
 */
class Toolbar extends Component {
	_onSave() {
		if(this.props.mode === Body.MODE_FLOOR_IMAGERY) {
			PubSub.publish("body.floorimagery.save");
		}
		else {
			PubSub.publish("body.mode.set", { mode: Body.MODE_CHANGESET })
		}
	}

	render() {
		let canUndo, canRedo, canSave, nbEdits;

		if(this.props.mode === Body.MODE_FLOOR_IMAGERY) {
			canUndo = window.imageryManager.canUndo();
			canRedo = window.imageryManager.canRedo();
			canSave = window.imageryManager.getFloorImages().length > 0;
			nbEdits = window.imageryManager.getAmountEdits();
		}
		else {
			canUndo = window.vectorDataManager.canUndo();
			canRedo = window.vectorDataManager.canRedo();
			canSave = canUndo;
			nbEdits = window.vectorDataManager.getAmountEdits();
		}

		return <div className="app-toolbar p-2">
			<div className="d-flex justify-content-between">
				<div>
					{this.props.mode === Body.MODE_FLOOR_IMAGERY ?
						<FloorImageryButtons {...this.props} />
						:
						<IndoorEditButtons {...this.props} />
					}
				</div>

				<div>
					<ButtonGroup className="mr-2" aria-label="Undo and redo">
						<Button
							variant="outline-secondary"
							size="sm"
							disabled={!canUndo}
							title={I18n.t("Cancel last operation")}
							onClick={() => PubSub.publish("body.action.undo")}
						>
							<Undo />
						</Button>

						<Button
							variant="outline-secondary"
							size="sm"
							disabled={!canRedo}
							title={I18n.t("Apply again last cancelled operation")}
							onClick={() => PubSub.publish("body.action.redo")}
						>
							<Redo />
						</Button>
					</ButtonGroup>

					<Button
						variant="primary"
						size="sm"
						className="mr-2"
						active={this.props.mode === Body.MODE_PREVIEW}
						disabled={this.props.mode === Body.MODE_PREVIEW}
						onClick={() => PubSub.publish("body.preview.open")}
						title={I18n.t("Preview your changes on indoor=")}
					>
						<MapCheck />
						<span className="hide-mdDown">{I18n.t("Preview")}</span>
					</Button>

					<Button
						variant={nbEdits < 30 ? "success" : (nbEdits < 100 ? "warning" : "danger")}
						size="sm"
						disabled={!canSave}
						title={this.props.mode === Body.MODE_FLOOR_IMAGERY ? I18n.t("Save positionning of floor plans") : I18n.t("Send your changes to OpenStreetMap")}
						onClick={() => this._onSave()}
					>
						<ContentSave />
						<span className="hide-mdDown">{I18n.t("Save")}</span>
						{nbEdits > 0 && " ("+nbEdits+")"}
					</Button>
				</div>
			</div>
		</div>;
	}
}

export default Toolbar;
