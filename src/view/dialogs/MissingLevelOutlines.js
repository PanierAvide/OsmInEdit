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
import Alert from 'mdi-react/AlertIcon';
import Button from 'react-bootstrap/Button';
import I18n from '../../config/locales/ui';
import Modal from 'react-bootstrap/Modal';
import OfficeBuilding from 'mdi-react/OfficeBuildingIcon';
import Pencil from 'mdi-react/PencilIcon';

/**
 * Missing level outlines dialog asks user which action to perform if any level outline is missing.
 */
class MissingLevelOutlinesDialog extends Component {
	render() {
		return <Modal
			show={this.props.missingOutlines !== null && this.props.missingOutlines !== undefined && Object.keys(this.props.missingOutlines).length > 0}
			size="lg"
			style={{zIndex: 20050}}
			onHide={this.props.onIgnore}
		>
			<Modal.Header closeButton>
				<Modal.Title>{I18n.t("Floor outlines are missing")}</Modal.Title>
			</Modal.Header>

			<Modal.Body>
				<p>{I18n.t("These buildings lack some floor outlines :")}</p>

				<ul>
					{this.props.missingOutlines && Object.values(this.props.missingOutlines).map((d,i) => (
						<li key={i}>{I18n.t("Building %{b} (levels : %{lvl})", { b: d.name, lvl: d.levels.join(", ") })}</li>
					))}
				</ul>

				<p>{I18n.t("These floor outlines are optional in OSM, but are useful for various tools people use.")}<br />{I18n.t("You have the choice between following options :")}</p>

				<ul className="pl-3 pb-0 mb-0" style={{listStyle: "none"}}>
					<li><Pencil /> {I18n.t("Go back to editing and create levels outline by yourself (recommended for complex buildings)")}</li>
					<li><OfficeBuilding /> {I18n.t("Use building outline as default level outline (recommended for simple buildings)")}</li>
					<li><Alert /> {I18n.t("Ignore this warning and do not create missing level outlines (not recommended)")}</li>
				</ul>
			</Modal.Body>

			<Modal.Footer>
				<Button variant="primary" onClick={this.props.onEdit}>
					<Pencil /> {I18n.t("Edit outlines")}
				</Button>
				<Button variant="secondary" onClick={this.props.onUseDefault}>
					<OfficeBuilding /> {I18n.t("Use building ones")}
				</Button>
				<Button variant="danger" onClick={this.props.onIgnore}>
					<Alert /> {I18n.t("Ignore this")}
				</Button>
			</Modal.Footer>
		</Modal>;
	}
}

export default MissingLevelOutlinesDialog;
