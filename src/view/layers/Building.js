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
import { GeoJSON } from 'react-leaflet';
import PubSub from 'pubsub-js';

/**
 * Building layer allows to show OSM data for building contours.
 */
class BuildingLayer extends Component {
	render() {
		if(this.props.locked) {
			return <GeoJSON
				data={window.vectorDataManager.getOSMBuildings()}
				style={{ color: "purple", fillColor: "black", opacity: 0.5, fillOpacity: 0.2 }}
			/>;
		}
		else {
			return <Editable
				data={window.vectorDataManager.getOSMBuildings()}
				onFeatureClick={feature => PubSub.publish("body.select.building", { building: feature })}
				selection={this.props.building}
				styler={this.props.styler}
				draw={this.props.draw}
			/>;
		}
	}
}

export default BuildingLayer;
