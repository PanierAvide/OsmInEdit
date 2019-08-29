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
import ArrowExpand from 'mdi-react/ArrowExpandIcon';
import AxisArrow from 'mdi-react/AxisArrowIcon';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Close from 'mdi-react/CloseIcon';
import ContentCopy from 'mdi-react/ContentCopyIcon';
import ContentPaste from 'mdi-react/ContentPasteIcon';
import PubSub from 'pubsub-js';
import RotateRight from 'mdi-react/RotateRightIcon';

/**
 * FloorImageryButtons component handles tool buttons to show in toolbar when editing floor plans.
 */
class FloorImageryButtons extends Component {
	render() {
		const floorImgs = window.imageryManager.getFloorImages();
		const f = floorImgs.find(f => f.selected);

		return f ? <div>
			<ButtonGroup>
				<Button
					size="sm"
					variant={this.props.floorImageryMode === "distort" ? "primary" : "outline-secondary"}
					onClick={() => PubSub.publish("body.floorimagery.mode", { mode: this.props.floorImageryMode === "distort" ? null : "distort" })}
					disabled={!f.visible}
					title={window.I18n.t("Distort this plan")}
				>
					<AxisArrow />
				</Button>

				<Button
					size="sm"
					variant={this.props.floorImageryMode === "scale" ? "primary" : "outline-secondary"}
					onClick={() => PubSub.publish("body.floorimagery.mode", { mode: this.props.floorImageryMode === "scale" ? null : "scale" })}
					disabled={!f.visible}
					title={window.I18n.t("Scale this plan")}
				>
					<ArrowExpand />
				</Button>

				<Button
					size="sm"
					variant={this.props.floorImageryMode === "rotate" ? "primary" : "outline-secondary"}
					onClick={() => PubSub.publish("body.floorimagery.mode", { mode: this.props.floorImageryMode === "rotate" ? null : "rotate" })}
					disabled={!f.visible}
					title={window.I18n.t("Rotate this plan")}
				>
					<RotateRight />
				</Button>
			</ButtonGroup>

			<ButtonGroup>
				<Button
					size="sm"
					variant="outline-secondary"
					className="ml-1"
					onClick={() => PubSub.publish("body.floorimagery.copyposition")}
					disabled={!f.visible}
					title={window.I18n.t("Copy position of this plan")}
				>
					<ContentCopy />
				</Button>

				<Button
					size="sm"
					variant="outline-secondary"
					onClick={() => PubSub.publish("body.floorimagery.pasteposition")}
					disabled={!f.visible || !this.props.floorImageryCopyPaste}
					title={window.I18n.t("Move this plan to copied position")}
				>
					<ContentPaste />
				</Button>
			</ButtonGroup>

			<Button
				variant="outline-danger"
				onClick={() => PubSub.publish("body.floorimagery.remove", { id: f.id })}
				className="ml-1"
				size="sm"
				title={window.I18n.t("Delete this plan")}
			>
				<Close /> <span className="hide-mdDown">{window.I18n.t("Delete this plan")}</span>
			</Button>
		</div> : <div></div>;
	}
}

export default FloorImageryButtons;
