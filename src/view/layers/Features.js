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
import Styled from './Styled';

/**
 * Features layer allows to show OSM data of a specific floor
 */
class FeaturesLayer extends Component {
	render() {
		if(!this.props.locked) {
			const geojson = window.vectorDataManager.getFeaturesInLevel(this.props.building, this.props.level);
			let shadow = this.props.building;

			// Get level footprint
			if(shadow) {
				const lvlFootprints = window.vectorDataManager.getLevelFootprint(this.props.building, this.props.level);
				shadow = { type: "FeatureCollection", features: lvlFootprints.concat(shadow) };
			}

			return <Editable
				data={geojson}
				shadowData={shadow}
				selection={this.props.feature}
				onFeatureClick={feature => PubSub.publish("body.select.feature", { feature: feature })}
				styler={this.props.styler}
				draw={this.props.draw}
				allowVertexClick={true}
				allowFeatureDrag={true}
				keepRoutingGraphConnected={true}
				level={this.props.level}
			/>;
		}
		else {
			const geojson = window.vectorDataManager.getFeaturesInLevel(null, this.props.level);
			const buildings = window.vectorDataManager.getOSMBuildings().features;
			geojson.features = buildings.concat(geojson.features);

			return <Styled
				data={geojson}
				styler={this.props.styler}
				level={this.props.level}
			/>;
		}
	}
}
export default FeaturesLayer;
