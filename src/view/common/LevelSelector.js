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
import deepEqual from 'fast-deep-equal';
import PubSub from 'pubsub-js';

const LevelControl = Control.extend({
	onAdd: function(map) {
		this.container = DomUtil.create("div", "leaflet-bar leaflet-control-levels");
		this.setAvailableLevels(this.options.levels);
		this.setLevel(this.options.level);
		return this.container;
	},

	setAvailableLevels(lvls) {
		this.container.innerHTML = "";
		this._levels = lvls.map(l => parseFloat(l)) || [ 0 ];

		this._levels.sort((a,b) => a - b);
		const min = this._levels[0];
		const max = this._levels[this._levels.length-1];

		// Condensed version (levels shown in ranges)
		if(max-min > 10) {
			this._mode = "condensed";
			this._lastByTen = null;
			const minByTen = Math.floor(min / 10);
			const maxByTen = Math.floor(max / 10);

			// Display buttons for ranges (0X, 1X, 2X...)
			for(let lvlByTen = maxByTen; lvlByTen >= minByTen; lvlByTen--) {
				const myLvlByTen = parseInt(lvlByTen.toString());

				const cLvlByTen = DomUtil.create("a", "leaflet-control-level-byten lvl-byten"+myLvlByTen);
				cLvlByTen.innerHTML = myLvlByTen+"X";

				// Click event on range button
				cLvlByTen.addEventListener("click", evt => {
					// Clean-up last selection
					for(let last of this.container.getElementsByClassName("leaflet-control-level-byten-extended")) {
						last.classList.remove("leaflet-control-level-byten-extended");
					}

					for(let inten of this.container.getElementsByClassName("leaflet-control-levels-inten")) {
						this.container.removeChild(inten);
					}

					// Click on other range : show in-range selector
					if(this._lastByTen !== myLvlByTen) {
						evt.target.classList.add("leaflet-control-level-byten-extended");

						// Show list of levels in range
						const cLvls = DomUtil.create("div", "leaflet-bar leaflet-control-levels-inten");
						cLvls.style.position = "absolute";
						cLvls.style.top = (evt.target.offsetTop-4)+"px";
						cLvls.style.right = 32+"px";

						for(let lvl = myLvlByTen*10+9; lvl >= myLvlByTen*10; lvl--) {
							const myLvl = parseInt(lvl.toString());
							const cLvl = DomUtil.create("a", "leaflet-control-level lvl"+myLvl);
							cLvl.innerHTML = myLvl;
							cLvl.addEventListener("click", () => {
								PubSub.publish("body.level.set", { level: myLvl });
							});

							if(lvl === this._level) {
								cLvl.classList.add("leaflet-control-level-selected");
							}

							cLvls.appendChild(cLvl);
						}

						this.container.appendChild(cLvls);
						this._lastByTen = myLvlByTen;
					}
					// Click on same range : hide in-range selector
					else {
						this._lastByTen = null;
					}
				});

				this.container.appendChild(cLvlByTen);
			}
		}
		// Extended version (all levels shown)
		else {
			this._mode = "extended";

			for(let lvl = max; lvl >= min; lvl--) {
				const myLvl = parseInt(lvl.toString());
				const cLvl = DomUtil.create("a", "leaflet-control-level lvl"+myLvl);
				cLvl.innerHTML = myLvl;
				cLvl.addEventListener("click", () => {
					PubSub.publish("body.level.set", { level: myLvl });
				});

				this.container.appendChild(cLvl);
			}
		}
	},

	setLevel(l) {
		// Clean previous selection
		for(let last of this.container.getElementsByClassName("leaflet-control-level-selected")) {
			last.classList.remove("leaflet-control-level-selected");
		}

		for(let last of this.container.getElementsByClassName("leaflet-control-level-byten-selected")) {
			last.classList.remove("leaflet-control-level-byten-selected");
		}

		// Highlight current level/range
		if(this._mode === "extended" || this._lastByTen !== null) {
			const next = this.container.getElementsByClassName("lvl"+l)[0];
			if(next) {
				next.classList.add("leaflet-control-level-selected");
				this._level = l;
			}
			else {
				this.setAvailableLevels(this._levels.concat([ l ]));
				this.setLevel(l);
			}
		}

		if(this._mode === "condensed") {
			const currentRange = Math.floor(l/10);

			const next = this.container.getElementsByClassName("lvl-byten"+currentRange)[0];
			if(next) {
				next.classList.add("leaflet-control-level-byten-selected");
				this._level = l;
			}
			else {
				this.setAvailableLevels(this._levels.concat([ l ]));
				this.setLevel(l);
			}
		}
	},

	onRemove: function(map) {
	}
});

/**
 * Level selector is a React-Leaflet control to allow user choosing the indoor level to display.
 */
class LevelSelector extends MapControl {
	createLeafletElement(props) {
		return new LevelControl(props);
	}

	updateLeafletElement(fromProps, toProps) {
		if(!deepEqual(fromProps.levels, toProps.levels)) {
			this.leafletElement.setAvailableLevels(toProps.levels);
			this.leafletElement.setLevel(toProps.level);
		}

		if(fromProps.level !== toProps.level) {
			this.leafletElement.setLevel(toProps.level);
		}
	}
}

export default withLeaflet(LevelSelector);
