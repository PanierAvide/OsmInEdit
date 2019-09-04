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
import { LatLng } from 'leaflet';
import Dropzone from 'react-dropzone';
import Eye from 'mdi-react/EyeIcon';
import EyeOff from 'mdi-react/EyeOffIcon';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Hash from 'object-hash';
import I18n from '../../config/locales';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import PubSub from 'pubsub-js';

/**
 * Floor imagery component handles editing of floor plans
 */
class FloorImageryPane extends Component {
	/**
	 * Event handler for opacity change
	 * @private
	 */
	_onOpacityChanged(val) {
		PubSub.publish("body.imagery.opacity", { opacity: parseInt(val)/100, type: "floor" });
	}

	/**
	 * Event handler for floor plans being dropped
	 * @private
	 */
	_onDropImages(files) {
		if(files.length > 0) {
			// Full config file
			if(files.length === 1 && files[0].type === "application/json") {
				// Parse
				const reader = new FileReader();
				reader.onload = () => {
					try {
						const json = JSON.parse(reader.result);

						if(json && json.length > 0) {
							PubSub.publish("body.floorimagery.remove");

							json.forEach(e => {
								if(!e.image || !e.label || !e.id) {
									throw new Error("Read data from JSON is missing information");
								}
								else {
									e.topleft = new LatLng(e.topleft.lat, e.topleft.lng);
									e.topright = new LatLng(e.topright.lat, e.topright.lng);
									e.bottomleft = new LatLng(e.bottomleft.lat, e.bottomleft.lng);
									e.level = parseFloat(e.level);
								}
							});

							PubSub.publish("body.floorimagery.add", { imagery: json });
						}
					}
					catch(e) { console.error(e); }
				};
				reader.readAsText(files[0]);
			}
			// Classic images
			else {
				// Convert files into data URL
				Promise.all(
					files
					.filter(f => f.type.startsWith("image/"))
					.map(f => new Promise(resolve => {
						const reader = new FileReader();
						reader.onload = () => {
							resolve({
								label: f.name,
								level: null,
								image: reader.result,
								id: Hash(reader.result)
							});
						};
						reader.readAsDataURL(f);
					}))
				)
				// Save loaded floors
				.then(res => PubSub.publish("body.floorimagery.add", { imagery: res }));
			}
		}
	}

	render() {
		const floorImgs = window.imageryManager.getFloorImages();
		const selected = floorImgs && floorImgs.find(img => img.selected && img.visible);

		if(selected && selected.opacity === undefined) { selected.opacity = 1; }

		return <div className="m-0 pl-2 pr-2 mt-2">
			<h3 className="m-0 p-0">{I18n.t("Floor plan")}</h3>

			<Dropzone
				accept="image/jpeg, image/png, application/json"
				onDrop={files => this._onDropImages(files)}
			>
				{({getRootProps, getInputProps}) => (
					<div className="dropzone m-0 mt-3 w-100" {...getRootProps()}>
						<input {...getInputProps()} />
						<p>
							{I18n.t("Drag and drop your images here (or click to open file browser)")}<br />
							<small>{I18n.t("Supported formats: JPEG, PNG, Imagery JSON")}</small>
						</p>
					</div>
				)}
			</Dropzone>

			{selected &&
				<InputGroup className="mt-3">
					<InputGroup.Prepend>
						<InputGroup.Text>{I18n.t("Opacity")}</InputGroup.Text>
					</InputGroup.Prepend>

					<div className="form-control" style={{flexGrow: 2}}>
						<input
							type="range"
							min="0"
							max="100"
							step="5"
							onChange={v => this._onOpacityChanged(v.target.value)}
							value={selected.opacity*100}
							style={{maxWidth: "100%"}}
						/>
					</div>

					<FormControl
						type="number"
						min="0"
						max="100"
						onChange={v => this._onOpacityChanged(v.target.value)}
						value={(selected.opacity*100).toFixed(0)}
					/>

					<InputGroup.Append>
						<InputGroup.Text>%</InputGroup.Text>
					</InputGroup.Append>
				</InputGroup>
			}

			<ListGroup className="mt-3" style={{width: "100%"}}>
				{floorImgs.map((f, i) => {
					const showHideClick = evt => {
						evt.stopPropagation();

						PubSub.publish("body.floorimagery.update", {
							imagery: floorImgs.map(d => {
								const newD = Object.assign({}, d);
								newD.visible = d.id === f.id ? !d.visible : d.visible;
								return newD;
							})
						});
					};

					return <ListGroup.Item
						key={i}
						style={{display: "flex", alignItems: "center", paddingLeft: "0.5rem"}}
						active={f.selected}
						onClick={() => {
							PubSub.publish("body.floorimagery.update", {
								imagery: floorImgs.map(d => {
									const newD = Object.assign({}, d);
									newD.selected = d.id === f.id ? true : false;
									return newD;
								})
							});
							if(!this.props.floorImageryMode) { PubSub.publish("body.floorimagery.mode", { mode: "scale" }); }
						}}
					>
						{f.visible ?
							<Eye size={28} onClick={e => showHideClick(e)} />
							:
							<EyeOff size={28} onClick={e => showHideClick(e)} />
						}

						<img src={f.image} style={{width: 30, height: 30, margin: "0 5px", border: "1px solid #ccc" }} alt="" />

						{f.label.substring(0, f.label.lastIndexOf("."))}

						<Form.Control
							type="number"
							placeholder={I18n.t("Level")}
							value={f.level === null || isNaN(f.level) ? "" : f.level}
							step="any"
							onChange={e => PubSub.publish("body.floorimagery.update", {
								imagery: [ Object.assign({}, f, { level: parseFloat(e.target.value) }) ]
							})}
							style={{width: 80, display: "inline-block", position: "absolute", right: 5}}
							required
							isInvalid={f.level === null || isNaN(f.level)}
						/>

						<Form.Control.Feedback type="invalid" style={f.selected ? { color: "white" } : {}}>
							{I18n.t("Please choose a level")}
						</Form.Control.Feedback>
					</ListGroup.Item>;
				})}
			</ListGroup>
		</div>;
	}
}

export default FloorImageryPane;
