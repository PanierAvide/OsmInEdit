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
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import I18n from '../../config/locales';
import PubSub from 'pubsub-js';

/**
 * Navigator is the breadcrumb allowing to travel through building hierarchy.
 */
class Navigator extends Component {
	render() {
		return <Breadcrumb className="justify-content-center bc-dense breadcrumb-arrow">
			<Breadcrumb.Item
				onClick={e => {
					PubSub.publishSync("body.mode.set", { mode: Body.MODE_BUILDING });
					PubSub.publish("body.unselect.feature");
				}}
				active={this.props.mode === Body.MODE_BUILDING && !this.props.building}
				title={I18n.t("Go back to building selection")}
			>
				{I18n.t("All buildings")}
			</Breadcrumb.Item>

			{this.props.building &&
				<Breadcrumb.Item
					onClick={e => PubSub.publish("body.mode.set", { mode: Body.MODE_BUILDING })}
					active={this.props.mode === Body.MODE_BUILDING}
					title={I18n.t("Edit this single building")}
				>
					{I18n.t("Building %{name}", { name: Body.GetFeatureName(this.props.building) })}
				</Breadcrumb.Item>
			}

			{this.props.building &&
				<Breadcrumb.Item
					onClick={e => {
						PubSub.publishSync("body.mode.set", { mode: Body.MODE_LEVELS });
						PubSub.publish("body.unselect.feature");
					}}
					active={this.props.mode === Body.MODE_LEVELS && !this.props.floor}
					title={I18n.t("Edit all levels of this building")}
				>
					{I18n.t("Levels structure")}
				</Breadcrumb.Item>
			}

			{this.props.mode === Body.MODE_LEVELS && this.props.floor &&
				<Breadcrumb.Item
					onClick={e => PubSub.publish("body.mode.set", { mode: Body.MODE_LEVELS })}
					active={this.props.mode === Body.MODE_LEVELS}
					title={I18n.t("Edit this single floor part")}
				>
					{this.props.building === this.props.floor ?
						I18n.t("Level %{lvl}", { lvl: this.props.level })
						:
						Body.GetFeatureName(this.props.floor)
					}
				</Breadcrumb.Item>
			}

			{[Body.MODE_FEATURES, Body.MODE_LEVELS].includes(this.props.mode) &&
				<Breadcrumb.Item
					onClick={e => PubSub.publish("body.mode.set", { mode: Body.MODE_FEATURES })}
					active={this.props.mode === Body.MODE_FEATURES}
					title={I18n.t("Edit features of this level")}
				>
					{I18n.t("Features of level %{lvl}", { lvl: this.props.level })}
				</Breadcrumb.Item>
			}
		</Breadcrumb>;
	}
}

export default Navigator;
