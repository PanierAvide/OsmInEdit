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
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Check from 'mdi-react/CheckIcon';
import Close from 'mdi-react/CloseIcon';
import PubSub from 'pubsub-js';

/**
 * Geometry buttons component shows confirm/cancel buttons for editing geometries.
 */
class GeometryButtons extends Component {
	render() {
		return <div>
			{window.I18n.t("You can start drawing using the map")}
			<ButtonGroup style={{marginLeft: 10}}>
				<Button
					variant="success"
					size="sm"
					onClick={() => PubSub.publish("body.draw.stop")}
				>
					<Check size={24} /> {window.I18n.t("Done")}
				</Button>
				<Button
					variant="outline-danger"
					size="sm"
					onClick={() => PubSub.publish("body.draw.cancel")}
				>
					<Close size={24} /> {window.I18n.t("Cancel")}
				</Button>
			</ButtonGroup>
		</div>;
	}
}

export default GeometryButtons;
