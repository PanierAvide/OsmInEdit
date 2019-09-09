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
import DotsHorizontal from 'mdi-react/DotsHorizontalIcon';
import ListGroup from 'react-bootstrap/ListGroup';
import MapMarker from 'mdi-react/MapMarkerIcon';
import VectorLine from 'mdi-react/VectorLineIcon';
import VectorSquare from 'mdi-react/VectorSquareIcon';

/**
 * Changeset diff component allows to show to user what edits have been done.
 */
class ChangesetDiff extends Component {
	render() {
		const typeIcon = {
			"Point": <MapMarker />,
			"LineString": <VectorLine />,
			"Polygon": <VectorSquare />,
			"MultiPolygon": <VectorSquare />
		};
		const baseCollection = window.vectorDataManager.getBaseCollection();

		return <ListGroup>
			{Object.entries(this.props.diff)
				.map(e => [
					...e,
					window.vectorDataManager.findFeature(
						e[0],
						e[1].deleted ? baseCollection : null
					)
				])
				.filter(e => e[2] !== null && e[2] !== undefined && e[2].properties.tags && Object.keys(e[2].properties.tags).length > 0)
				.map(e => {
					const [ elemId, elemDiff, element ] = e;
					const color = elemDiff.created ? "green" : (elemDiff.deleted ? "red" : "orange");
					const presets = window.presetsManager.findPresetsForFeature(element);

					return <ListGroup.Item
						action
						className="p-1"
						key={elemId}
						style={{color: color}}
						title={Object.entries(element.properties.tags).map(e => e.join(" = ")).join("\n")}
					>
						{typeIcon[element.geometry.type] || <DotsHorizontal />}
						{Body.GetFeatureName(element, [...new Set(presets.map(p => p.name))].join(", "))}
					</ListGroup.Item>;
				})
			}
		</ListGroup>;
	}
}

export default ChangesetDiff;
