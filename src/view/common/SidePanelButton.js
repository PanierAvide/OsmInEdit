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

import { Control, DomUtil } from 'leaflet';
import { withLeaflet, MapControl } from 'react-leaflet';
import PubSub from 'pubsub-js';

const SideButtonControl = Control.extend({
	onAdd: function(map) {
		this.container = DomUtil.create("div", "leaflet-bar leaflet-control-sidepanelbtn hide-xsDown");
		const btn = DomUtil.create("a");
		btn.innerHTML = "<svg><path d='M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z' /></svg>";
		btn.addEventListener("click", () => PubSub.publish("body.panel.toggle", { panel: "right" }));
		this.container.appendChild(btn);
		return this.container;
	}
});

/**
 * Side panel button is a react-leaflet control for opening right panel
 */
class SidePanelButton extends MapControl {
	createLeafletElement(props) {
		return new SideButtonControl(props);
	}
}

export default withLeaflet(SidePanelButton);
