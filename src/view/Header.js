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
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Layers from 'mdi-react/LayersIcon';
import ArrowLeft from 'mdi-react/ArrowLeftIcon';
import I18n from '../config/locales';
import Navbar from 'react-bootstrap/Navbar';
import Navigator from './common/Navigator';
import Pencil from 'mdi-react/PencilIcon';
import PubSub from 'pubsub-js';
import SearchPlace from './common/SearchPlace';

/**
 * Header component handles the whole header bar.
 */
class Header extends Component {
	render() {
		const isEditingIndoor = [Body.MODE_BUILDING, Body.MODE_LEVELS, Body.MODE_FEATURES].includes(this.props.mode);

		return <Navbar className={this.props.className} bg="light" expand="xs">
			<div className="d-flex">
				{this.props.mode === Body.MODE_EXPLORE ?
					<Navbar.Brand>
						{window.EDITOR_NAME}
					</Navbar.Brand>
					:
					<Button
						variant="outline-secondary"
						title={I18n.t("Go back to map explorer")}
						onClick={() => PubSub.publish("body.mode.set", { mode: Body.MODE_EXPLORE })}
					>
						<ArrowLeft />
					</Button>
				}

				<ButtonToolbar className="ml-2 hide-xsDown">
					<Button
						variant="primary"
						className="mr-2 btn-mode-floorplan"
						active={this.props.mode === Body.MODE_FLOOR_IMAGERY}
						disabled={this.props.mode === Body.MODE_FLOOR_IMAGERY}
						onClick={() => PubSub.publish("body.mode.set", { mode: Body.MODE_FLOOR_IMAGERY })}
						title={I18n.t("Import floor plans")}
					>
						<Layers /> <span className="hide-smDown">{I18n.t("Import floor plans")}</span>
					</Button>

					<Button
						variant="primary"
						active={isEditingIndoor || this.props.mode === Body.MODE_CHANGESET}
						disabled={isEditingIndoor || this.props.mode === Body.MODE_CHANGESET}
						className="btn-mode-editindoor"
						onClick={() => PubSub.publish("body.mode.set", { mode: Body.MODE_BUILDING })}
						title={I18n.t("Edit map")}
					>
						<Pencil /> <span className="hide-smDown">{I18n.t("Edit map")}</span>
					</Button>
				</ButtonToolbar>
			</div>

			{isEditingIndoor &&
				<div className="hide-mdDown"><Navigator {...this.props} /></div>
			}

			{this.props.mode === Body.MODE_EXPLORE &&
				<span className="hide-xsDown"><SearchPlace /></span>
			}
		</Navbar>;
	}
}

export default Header;
