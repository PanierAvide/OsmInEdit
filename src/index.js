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

import React from 'react';
import ReactDOM from 'react-dom';
import Body from './view/Body';
import I18n from './config/locales/ui';
import ImageryManager from './ctrl/ImageryManager';
import OsmAuth from 'osm-auth';
import PresetsManager from './ctrl/PresetsManager';
import PubSub from 'pubsub-js';
import request from 'request-promise-native';
import VectorDataManager from './ctrl/VectorDataManager';

/**
 * App is the application starter.
 * It creates mostly everything.
 */
class App {
	constructor() {
		this._initI18n();
		this._initCtrl();
		this._initView();
		this._initAuth();
	}

	/**
	 * Initializes internationalization system
	 * @private
	 */
	_initI18n() {
		let locale = null;
		if(window.navigator.languages) {
			for(const l of window.navigator.languages) {
				if(I18n.supportedLocales.includes(l)) {
					locale = l;
					break;
				}
			}
		}

		I18n.changeLocale(locale || window.navigator.userLanguage || window.navigator.language);
	}

	/**
	 * Creates controller objects.
	 * @private
	 */
	_initCtrl() {
		window.vectorDataManager = new VectorDataManager();
		window.presetsManager = new PresetsManager();
		window.imageryManager = new ImageryManager();

		// Preload some data
		window.presetsManager.loadPresets();
		window.imageryManager.getAvailableImagery();
	}

	/**
	 * Create view components
	 * @private
	 */
	_initView() {
		ReactDOM.render(<Body />, document.getElementById('root'));
		document.title=window.EDITOR_NAME;

		// Disabling context menu
		document.oncontextmenu = () => {
			return false;
		};
	}

	/**
	 * Launches authentication process
	 * @private
	 */
	_initAuth() {
		const opts = {
			url: window.CONFIG.osm_api_url,
			oauth_consumer_key: window.CONFIG.oauth_consumer_key,
			oauth_secret: window.CONFIG.oauth_secret,
			landing: window.EDITOR_URL + window.location.hash,
			singlepage: true
		};
		window.editor_user_auth = OsmAuth(opts);

		const params = this._readURLParams(window.location.href);
		const token = params.oauth_token || localStorage.getItem("oauth_token") || null;

		if(token) {
			window.editor_user_auth.bootstrapToken(token, () => {
				this._checkAuth();
				window.history.pushState({}, "", window.location.href.replace("?oauth_token="+token, ""));
				localStorage.setItem("oauth_token", token);
			});
		}
		else {
			//Check if we receive auth token
			this._checkAuth();
			this.authWait = setInterval(this._checkAuth.bind(this), 100);
		}

		/**
		 * Event for logging in user
		 * @event APP.USER.LOGIN
		 * @memberof App
		 */
		PubSub.subscribe("APP.USER.LOGIN", (msg, data) => {
			opts.landing = window.EDITOR_URL + window.location.hash;
			window.editor_user_auth.options(opts);

			if(!window.editor_user_auth.authenticated()) {
				window.editor_user_auth.authenticate((err, res) => {
					if(err) {
						console.error(err);
						alert(I18n.t("Oops ! Something went wrong when trying to log you in"));
						PubSub.publish("APP.USER.LOGOUT");
					}
					else {
						this._checkAuth();
					}
				});
			}
		});

		/**
		 * Event for logging out user
		 * @event APP.USER.LOGOUT
		 * @memberof App
		 */
		PubSub.subscribe("APP.USER.LOGOUT", (msg, data) => {
			if(window.editor_user_auth && window.editor_user_auth.authenticated()) {
				window.editor_user_auth.logout();
			}

			window.editor_user = null;
			localStorage.removeItem("oauth_token");
		});

		setTimeout(() => {
			if(!window.editor_user) {
				alert(I18n.t("You will be redirected in order to login using your OpenStreetMap account."));
				PubSub.publish("APP.USER.LOGIN");
			}
		}, 5000);
	}

	/**
	 * Check if authentication happened
	 * @private
	 */
	_checkAuth() {
		if(window.editor_user_auth.authenticated()) {
			if(this.authWait) {
				clearInterval(this.authWait);
			}

			//Get user details
			window.editor_user_auth.xhr({
				method: 'GET',
				path: '/api/0.6/user/details'
			}, (err, details) => {
				if(err) {
					console.log(err);
					window.editor_user_auth.logout();
				}
				else {
					try {
						window.editor_user = {
							id: details.firstChild.childNodes[1].attributes.id.value,
							name: details.firstChild.childNodes[1].attributes.display_name.value,
							auth: window.editor_user_auth
						};

						/**
						 * Event when user has been successfully logged in
						 * @event APP.USER.READY
						 * @memberof App
						 */
						PubSub.publish("APP.USER.READY", { username: window.editor_user.name });
						console.log("Logged in as", window.editor_user.name);
					}
					catch(e) {
						console.error(e);
						PubSub.publish("APP.USER.LOGOUT");
					}
				}
			});
		}
	}

	/**
	 * Parse URL parameters
	 * @private
	 */
	_readURLParams(str) {
		const u = str.split('?');

		if(u.length > 1) {
			const p = u[1].split('#')[0];

			return p.split('&').filter(function (pair) {
				return pair !== '';
			}).reduce(function(obj, pair){
				var parts = pair.split('=');
				obj[decodeURIComponent(parts[0])] = (null === parts[1]) ?
					'' : decodeURIComponent(parts[1]);
				return obj;
			}, {});
		}
		else {
			return {};
		}
	}
}


/*
 * Global variables definition
 */

window.EDITOR_URL = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + "/";
window.UNUSABLE_ICONS = new Set();

// Dynamically load config file
request(window.EDITOR_URL + "/config.json")
.then(configTxt => {
	window.CONFIG = JSON.parse(configTxt);
	window.EDITOR_NAME = window.CONFIG.editor_name;

	// Create app
	new App();
})
.catch(e => {
	console.error(e);
	alert("Can't load configuration file, please report this issue.");
});
