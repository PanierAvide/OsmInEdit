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
import I18n from '../../config/locales/ui';
import Modal from 'react-bootstrap/Modal';

/**
 * Login dialog asks user to login or create account on OSM.org before editing.
 */
class LoginDialog extends Component {
	render() {
		const canClose = !window.CONFIG.always_authenticated;

		return <Modal show={this.props.show} onHide={this.props.onClose} style={{zIndex: 20010}}>
			<Modal.Header closeButton={canClose}>
				<Modal.Title>{I18n.t("Login or create account")}</Modal.Title>
			</Modal.Header>

			<Modal.Body>
				{window.CONFIG.always_authenticated ?
					I18n.t("To view and edit map data, you need to connect first using an OpenStreetMap account.")
					: I18n.t("To edit map data, you need to connect first using an OpenStreetMap account.")
				}
			</Modal.Body>

			<Modal.Footer>
				{canClose &&
					<Button variant="secondary" onClick={this.props.onClose}>
						{I18n.t("Cancel")}
					</Button>
				}

				<Button variant="primary" onClick={this.props.onLogin}>
					{I18n.t("Login or create account")}
				</Button>
			</Modal.Footer>
		</Modal>;
	}
}

export default LoginDialog;
