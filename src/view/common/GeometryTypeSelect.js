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
import I18n from '../../config/locales';
import MapMarker from 'mdi-react/MapMarkerIcon';
import VectorLine from 'mdi-react/VectorLineIcon';
import VectorSquare from 'mdi-react/VectorSquareIcon';
import Row from 'react-bootstrap/Row';

/**
 * Geometry type select allows user to choose one type of geometry between several available.
 */
class GeometryTypeSelect extends Component {
	render() {
		const availableTypes = [
			{ id: "node", name: I18n.t("Point"), icon: <MapMarker />, desc: I18n.t("For small features (size less than 2 meters)") },
			{ id: "way", name: I18n.t("Line"), icon: <VectorLine />, desc: I18n.t("For long but not large features") },
			{ id: "closedway", name: I18n.t("Area"), icon: <VectorSquare />, desc: I18n.t("For wide features (surface of more than a few m²)") }
		].filter(t => !this.props.types || this.props.types.length === 0 || this.props.types.includes(t.id));

		return <Container>
			{availableTypes.map((t,i) => (
				<Row
					key={i}
					className="app-geomtype"
					onClick={() => this.props.onClick(t.id)}
				>
					<Col xs={2}>
						{t.icon}
					</Col>
					<Col className="app-geomtype-text">
						<span>{t.name}</span>
						<span>{t.desc}</span>
					</Col>
				</Row>
			))}
		</Container>;
	}
}

export default GeometryTypeSelect;
