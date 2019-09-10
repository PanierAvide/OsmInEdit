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
import I18n from '../../config/locales/ui';
import MapMarker from 'mdi-react/MapMarkerIcon';
import MapMarkerMultiple from 'mdi-react/MapMarkerMultipleIcon';
import MapMarkerPlus from 'mdi-react/MapMarkerPlusIcon';
import Media from 'react-bootstrap/Media';

const TAGS_ICONS = [ "amenity", "aeroway", "barrier", "emergency", "highway", "historic", "man_made", "railway", "shop", "tourism" ];

/**
 * Preset card is a single entry of a PresetSelect list.
 */
class PresetCard extends Component {
	render() {
		if(!this.props.preset) {
			return <Media
				className="p-1 app-preset-card"
				onClick={() => this.props.onClick()}
			>
				<MapMarkerPlus size={32} className="align-self-center mr-2" style={{color: "gray"}} />

				<Media.Body>
					<h5>{I18n.t("Select a preset")}</h5>
				</Media.Body>
			</Media>;
		}
		else {
			let icon = this.props.preset.icon || null;

			if(!icon && this.props.preset.tags) {
				const tags = Object.entries(this.props.preset.tags).filter(e => TAGS_ICONS.includes(e[0]));
				if(tags.length > 0) {
					icon = window.EDITOR_URL + "img/icons/"+tags[0][0]+"_"+tags[0][1]+".png";

					if(window.UNUSABLE_ICONS.has(icon)) {
						icon = null;
					}
				}
			}

			return <Media
				className="p-1 app-preset-card"
				onClick={() => this.props.onClick(this.props.preset)}
			>
				{icon &&
					<img
						width={32}
						height={32}
						className="align-self-center mr-2"
						src={icon}
						alt={this.props.preset.name}
						onError={e => {
							e.target.style.display = "none";
							window.UNUSABLE_ICONS.add(e.target.src);
							this.forceUpdate();
						}}
					/>
				}

				{!icon && (this.props.preset.groups || this.props.preset.items ?
					<MapMarkerMultiple size={32} className="align-self-center mr-2" style={{color: "gray"}} />
					:
					<MapMarker size={32} className="align-self-center mr-2" style={{color: "gray"}} />
				)}

				<Media.Body>
					<h5>{this.props.preset.name}</h5>
				</Media.Body>

				{(this.props.preset.groups || this.props.preset.items) &&
					<ChevronRight className="app-preset-enter align-self-center" size={32} />
				}
			</Media>;
		}
	}
}

export default PresetCard;
