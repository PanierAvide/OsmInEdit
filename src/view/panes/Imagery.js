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
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import deepEqual from 'fast-deep-equal';
import Form from 'react-bootstrap/Form';
import I18n from '../../config/locales/ui';
import PubSub from 'pubsub-js';
import Row from 'react-bootstrap/Row';
import SelectList from '../common/SelectList';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

/**
 * Imagery component handles changing background and overlay imagery of map.
 */
class ImageryPane extends Component {
	constructor() {
		super();

		this.state = {
			backgrounds: [],
			overlays: [],
			customUrl: ""
		};
	}

	/**
	 * Update list of imagery
	 * @private
	 */
	_updateImagery(fromProps) {
		if(this.props.imagery) {
			const newState = { backgrounds: [], overlays: [] };

			this.props.imagery.forEach(l => {
				if(l.properties.overlay) {
					newState.overlays.push(Object.assign({}, l, {
						label: l.properties.name || l.properties.id,
						selected: this.props.selectedOverlaysImagery && this.props.selectedOverlaysImagery.filter(l2 => l2.properties.id === l.properties.id).length > 0
					}));
				}
				else {
					newState.backgrounds.push(Object.assign({}, l, {
						label: l.properties.name || l.properties.id || this._customImagery.label,
						selected: this.props.selectedBaseImagery && this.props.selectedBaseImagery.properties.id === l.properties.id
					}));
				}
			});

			if(
				!deepEqual(newState.backgrounds, this.state.backgrounds)
				|| !deepEqual(newState.overlays, this.state.overlays)
			) {
				this.setState(newState);
			}
		}
	}

	/**
	 * Event handler for imagery being clicked
	 * @private
	 */
	_onSelect(img, type) {
		PubSub.publish("body.imagery.set", { imagery: img, type: type });
	}

	/**
	 * Event handler for opacity change
	 * @private
	 */
	_onOpacityChanged(val, type) {
		PubSub.publish("body.imagery.opacity", { opacity: parseInt(val)/100, type: type });
	}

	/**
	 * Event handler for custom TMS URL change
	 * @private
	 */
	_onCustomChanged(url) {
		this.setState({ customUrl: url });

		url = url.trim();
		const newImg = Object.assign({}, this.props.selectedBaseImagery);
		newImg.properties.url = url.length === 0 ? null : url;

		this._onSelect([ newImg ], "background");
	}

	render() {
		return <div className="m-2">
			<h4>{I18n.t("Imagery")}</h4>

			<Tabs defaultActiveKey="background" className="dense-tabs" id="imagery-tab">
				<Tab eventKey="background" title={I18n.t("Background")}>
					<Container className="mt-3 mb-3 p-0 d-flex overflow-hidden">
						<Row className="flex-nowrap">
							<Col className="m-0">{I18n.t("Opacity")} <span className="font-weight-light">{(this.props.baseImageryOpacity*100).toFixed(0)+"%"}</span></Col>
							<Col className="m-0">
								<input
									type="range"
									min="0"
									max="100"
									onChange={v => this._onOpacityChanged(v.target.value, "background")}
									value={this.props.baseImageryOpacity*100}
									className="p-0 m-0 w-100"
								/>
							</Col>
						</Row>
					</Container>

					{this.state.backgrounds ?
						<SelectList
							data={this.state.backgrounds}
							type="single"
							onChange={selection => this._onSelect(selection, "background")}
						/>
						:
						<p>{I18n.t("Loading...")}</p>
					}

					{this.props.selectedBaseImagery && this.props.selectedBaseImagery.properties.id === "custom" &&
						<Form.Group controlId="imagery-custom" className="mt-2">
							<Form.Label>{I18n.t("Custom imagery URL")}</Form.Label>
							<Form.Control
								type="text"
								placeholder="https://mytil.es/{z}/{x}/{y}.jpg"
								value={this.state.customUrl}
								onChange={v => this._onCustomChanged(v.target.value)}
							/>
							<Form.Text className="text-muted">
								{I18n.t("You can use any TMS-like URL")}
							</Form.Text>
						</Form.Group>
					}
				</Tab>

				<Tab eventKey="overlay" title={I18n.t("Overlay")}>
					<Container className="mt-3 mb-3 p-0 d-flex overflow-hidden">
						<Row className="flex-nowrap">
							<Col className="m-0">{I18n.t("Opacity")} <span className="font-weight-light">{(this.props.overlaysImageryOpacity*100).toFixed(0)+"%"}</span></Col>
							<Col className="m-0">
								<input
									type="range"
									min="0"
									max="100"
									onChange={v => this._onOpacityChanged(v.target.value, "overlay")}
									value={this.props.overlaysImageryOpacity*100}
									style={{width: "100%"}}
									className="p-0 m-0 w-100"
								/>
							</Col>
						</Row>
					</Container>

					{this.state.overlays ?
						<SelectList
							data={this.state.overlays}
							type="multi"
							onChange={selection => this._onSelect(selection, "overlay")}
						/>
						:
						<p>{I18n.t("Loading...")}</p>
					}
				</Tab>
			</Tabs>
		</div>;
	}

	componentDidMount() {
		this._updateImagery();
	}

	componentDidUpdate(fromProps) {
		this._updateImagery(fromProps);
	}
}

export default ImageryPane;
