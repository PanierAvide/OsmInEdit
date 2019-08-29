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
import Button from 'react-bootstrap/Button';
import Close from 'mdi-react/CloseIcon';
import Delete from 'mdi-react/DeleteIcon';
import DeleteCircleOutline from 'mdi-react/DeleteCircleOutlineIcon';
import Modal from 'react-bootstrap/Modal';

/**
 * Confirm deletion dialog asks user if he wants to delete everything inside level/building
 */
class ConfirmDeletionDialog extends Component {
	render() {
		return <Modal show={this.props.show} onHide={this.props.onCancel} size="lg">
			<Modal.Header closeButton>
				<Modal.Title>{window.I18n.t("Confirm delete of %{f}", { f: this.props.name })}</Modal.Title>
			</Modal.Header>
			<Modal.Body>{window.I18n.t("Are you sure you want to delete this feature ? You can either cancel this operation, delete only the contour of the feature, or delete the feature and everything inside (quite dangerous).")}</Modal.Body>
			<Modal.Footer>
				<Button variant="secondary" onClick={this.props.onCancel}>
					<Close /> {window.I18n.t("Cancel")}
				</Button>
				<Button variant="warning" onClick={() => this.props.onConfirm(false)}>
					<DeleteCircleOutline /> {window.I18n.t("Delete only contour")}
				</Button>
				<Button variant="danger" onClick={() => this.props.onConfirm(true)}>
					<Delete /> {window.I18n.t("Delete everything")}
				</Button>
			</Modal.Footer>
		</Modal>;
	}
}

export default ConfirmDeletionDialog;
