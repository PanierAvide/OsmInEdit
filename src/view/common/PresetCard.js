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
import ChevronRight from 'mdi-react/ChevronRightIcon';
import Media from 'react-bootstrap/Media';

/**
 * Preset card is a single entry of a PresetSelect list.
 */
class PresetCard extends Component {
	render() {
		return <Media
			className="p-1 app-preset-card"
			onClick={() => this.props.onClick(this.props.preset)}
		>
			{this.props.preset.icon &&
				<img
					width={32}
					height={32}
					className="align-self-center mr-2"
					src={this.props.preset.icon}
					alt={this.props.preset.name}
				/>
			}

			<Media.Body>
				<h5>{this.props.preset.name}</h5>
			</Media.Body>

			{(this.props.preset.groups || this.props.preset.items) && <ChevronRight className="app-preset-enter" />}
		</Media>;
	}
}

export default PresetCard;
