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
import Checkbox from 'react-three-state-checkbox';
import Form from 'react-bootstrap/Form';
import HelpCircle from 'mdi-react/HelpCircleIcon';
import I18n from '../../config/locales';
import Multiselect from 'react-bootstrap-multiselect';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import PubSub from 'pubsub-js';
import 'react-bootstrap-multiselect/css/bootstrap-multiselect.css';

/**
 * Preset input field is a component allowing user to set value for a certain tag, according to preset definition.
 */
class PresetInputField extends Component {
	constructor() {
		super();

		this.state = {
			value: null
		};
	}

	/**
	 * Event handler for change in field value
	 * @private
	 */
	_onEdit(val) {
		this.setState({ value: val });

		const applyChange = () => {
			const newTags = Object.assign({}, this.props.tags, { [this.props.data.key]: val });

			if(val === "null" || val.trim() === "") {
				delete newTags[this.props.data.key];
			}

			PubSub.publish("body.tags.set", { tags: newTags });
		};

		// Should we delay tags change event or not (according to if its text input) ?
		if(["combo", "check", "multiselect"].includes(this.props.type)) {
			applyChange();
		}
		else {
			if(this._timer) {
				clearTimeout(this._timer);
			}

			this._timer = setTimeout(applyChange, 500);
		}
	}

	render() {
		const d = this.props.data;
		const currentVal = typeof this.state.value === "string" ? this.state.value : (this.props.tags[d.key] || "");
		let res = null;
		let infoTip = null;

		if(d.info) {
			const popover = <Popover id="popover-basic" title={I18n.t("Help")} style={{padding: "5px 0px 5px 6px"}}>
				{d.info}
			</Popover>;
			infoTip = <OverlayTrigger placement="right" overlay={popover} popperConfig={{modifiers:{preventOverflow:{boundariesElement: "window"}}}}>
				<HelpCircle />
			</OverlayTrigger>;
		}

		if(["text", "number"].includes(this.props.type)) {
			res = <Form.Group className="m-0 mb-3">
				<Form.Label>{d.text || d.key} {infoTip}</Form.Label>
				<Form.Control
					type={this.props.type}
					placeholder={d.default}
					value={currentVal}
					onChange={e => this._onEdit(e.target.value)}
					size="sm"
				/>
			</Form.Group>;
		}
		else if(this.props.type === "textarea") {
			res = <Form.Group className="m-0 mb-3">
				<Form.Label>{d.text || d.key} {infoTip}</Form.Label>
				<Form.Control
					as="textarea"
					rows="3"
					placeholder={d.default}
					value={currentVal}
					onChange={e => this._onEdit(e.target.value)}
					size="sm"
				/>
			</Form.Group>;
		}
		else if(this.props.type === "combo") {
			const values = d.list_entrys ? d.list_entrys.map(d => d.value) : (d.values || "").split("," || d.delimiter);
			const displayValues = d.list_entrys ?
				d.list_entrys.map(d => d.display_value || d.value)
				: (d.display_values ?
					d.display_values.split("," || d.delimiter)
					: values);

			res = <Form.Group className="m-0 mb-3">
				<Form.Label>{d.text || d.key} {infoTip}</Form.Label>
				<Form.Control
					as="select"
					onChange={e => this._onEdit(e.target.value)}
					value={currentVal}
					size="sm"
				>
					{(d.use_last_as_default === undefined || d.use_last_as_default === "false") &&
						<option value={"null"}></option>
					}
					{values.map((e,i) => (
						<option key={i} value={e || ""}>{displayValues[i]}</option>
					))}
				</Form.Control>
			</Form.Group>;
		}
		else if(this.props.type === "check") {
			const states = [
				{ id: 0, val: d.value_on || "yes", label: I18n.t("Yes") },
				{ id: 1, val: d.value_off || "no", label: I18n.t("No") },
				{ id: 2, val: "null", label: I18n.t("Unknown") }
			];

			let currentState = 2;
			const currentValState = states.filter(s => s.val === currentVal);
			if(currentValState.length === 1) {
				currentState = currentValState[0].id;
			}

			const onEvent = () => {
				const newState = (currentState+1) % 3;
				this._onEdit(states[newState].val);
			};

			res = <Form.Group className="m-0 mb-3 form-group-check">
				<p className="m-0">{d.text || d.key} {infoTip}</p>

				<Checkbox
					checked={currentState === 0}
					indeterminate={currentState === 2}
					onChange={() => onEvent()}
				/>

				<Form.Check.Label onClick={() => onEvent()}>
					{states[currentState].label}
				</Form.Check.Label>
			</Form.Group>;
		}
		else if(this.props.type === "multiselect") {
			let data = null;
			const currentValues = currentVal.split(";");

			if(d.list_entrys) {
				data = d.list_entrys.map(e => ({
					value: e.value,
					label: e.display_value || e.value,
					title: e.short_description,
					selected: currentValues.includes(e.value)
				}));
			}
			else {
				data = d.values.split(";" || d.delimiter).map(e => ({ value: e, selected: currentValues.includes(e) }));
				if(d.display_values) {
					d.display_values.split(";" || d.delimiter).forEach((e,i) => {
						data[i].label = e;
					});
				}
			}

			res = <Form.Group className="m-0 mb-3">
				<Form.Label>{d.text || d.key} {infoTip}</Form.Label>
				<Form.Control
					as={Multiselect}
					data={data}
					multiple
					ref={"multiselect-"+d.key}
					size="sm"
				/>
			</Form.Group>;
		}

		return res;
	}

	componentDidMount() {
		if(this.props.type === "multiselect") {
			// Handle value changes on multiselect (is broken when using onChange prop on react component)
			const ms = this.refs["multiselect-"+this.props.data.key]["$multiselect"][0];
			ms.onchange = () => {
				let val = [];
				for(const elem of ms.selectedOptions) {
					val.push(elem.value);
				}
				this._onEdit(val.join(";"));
			};
		}
	}

	componentDidUpdate(prevProps) {
		// Re-sync internal state with value in component props
		if(
			(this.props.tags && this.props.data && this.props.data.key && this.props.tags[this.props.data.key] && (!prevProps.tags || !prevProps.data || !prevProps.data.key || !prevProps.tags[prevProps.data.key] || prevProps.tags[prevProps.data.key] !== this.props.tags[this.props.data.key]))
			||
			(prevProps.tags && prevProps.data && prevProps.data.key && prevProps.tags[prevProps.data.key] && (!this.props.tags || !this.props.data || !this.props.data.key || !this.props.tags[this.props.data.key] || prevProps.tags[prevProps.data.key] !== this.props.tags[this.props.data.key]))
		) {
			this.setState({ value: null });
		}
	}
}

export default PresetInputField;
