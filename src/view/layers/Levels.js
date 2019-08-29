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
import Editable from './Editable';
import PubSub from 'pubsub-js';

/**
 * Levels layer allows to show OSM data of levels contained in one particular building
 */
class LevelsLayer extends Component {
	render() {
		const levelParts = window.vectorDataManager.getLevelFootprint(this.props.building, this.props.level) || [];
		const data = { type: "FeatureCollection", features: levelParts };

		if(this.props.floor && !levelParts.includes(this.props.floor)) {
			levelParts.push(this.props.floor);
		}

		return <Editable
			data={data}
			shadowData={this.props.building}
			selection={this.props.floor}
			onFeatureClick={feature => PubSub.publish("body.select.floor", { floor: feature })}
			draw={this.props.draw}
			styler={this.props.styler}
		/>;
	}
}

export default LevelsLayer;
