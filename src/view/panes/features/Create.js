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
import GeometryTypeSelect from '../../common/GeometryTypeSelect';
import I18n from '../../../config/locales';
import PresetSelect from '../../common/PresetSelect';
import PubSub from 'pubsub-js';

/**
 * Create feature pane allows user to choose the kind of feature to create.
 */
class CreateFeaturePane extends Component {
	render() {
		return <div>
			<h3 className="m-2">{I18n.t("Add features")}</h3>

			{!this.props.preset &&
				<PresetSelect
					key={1}
					lastUsed={this.props.lastUsedPreset}
					onSelect={p => PubSub.publish("body.select.preset", { preset: p })}
				/>
			}

			{this.props.preset && !this.props.draw &&
				<div className="m-2">
					<p>
						{I18n.t("Please select how you want to represent your feature.")}
					</p>
					<GeometryTypeSelect
						types={this.props.preset.type}
						onClick={type => PubSub.publish("body.select.preset", { preset: this.props.preset, type: type })}
					/>
					<Button
						variant="outline-danger"
						size="sm"
						onClick={() => PubSub.publish("body.select.preset", { preset: null })}
						block
					>
						<Close /> {I18n.t("Cancel")}
					</Button>
				</div>
			}

			{this.props.preset && this.props.draw &&
				<div className="m-2">
					<p>{I18n.t("You can draw your feature on the map. Click on done button or click again on last node you created to finish.")}</p>
				</div>
			}
		</div>;
	}
}

export default CreateFeaturePane;
