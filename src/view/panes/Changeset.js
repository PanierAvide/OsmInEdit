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
import Button from 'react-bootstrap/Button';
import ChangesetDiff from '../common/ChangesetDiff';
import Check from 'mdi-react/CheckIcon';
import CloseCircle from 'mdi-react/CloseCircleIcon';
import I18n from '../../config/locales/ui';
import Magnify from 'mdi-react/MagnifyIcon';
import Pencil from 'mdi-react/PencilIcon';
import PresetInputField from '../common/PresetInputField';
import PubSub from 'pubsub-js';
import Spinner from 'react-bootstrap/Spinner';
import TagsTable from '../common/TagsTable';

/**
 * Changeset pane allows user to review edits before sending to OSM.
 */
class ChangesetPane extends Component {
	render() {
		if(!this.props.changeset) { return <div></div>; }

		return <div>
			<div className="m-2 mb-4">
				<h3 className="m-0 p-0 mb-1">{I18n.t("Send changes to OpenStreetMap")}</h3>

				{this.props.changeset.status === "preparing" &&
					<div className="text-center">
						<Spinner animation="grow" variant="secondary" className="align-middle" /> {I18n.t("Analyzing your changes...")}
					</div>
				}

				{this.props.changeset.status === "check" ?
					<div>
						<PresetInputField
							type="textarea"
							data={{ text: I18n.t("Changeset comment"), key: "comment", default: I18n.t("Describe briefly but explicitely your edits (required)") }}
							tags={this.props.changeset.tags}
						/>

						<PresetInputField
							type="multiselect"
							data={{
								text: I18n.t("Sources"),
								key: "source",
								list_entrys: [
									{ value: "local knowledge", display_value: I18n.t("Local knowledge") },
									{ value: "survey", display_value: I18n.t("Ground survey") },
									{ value: "aerial imagery", display_value: I18n.t("Aerial imagery") },
									{ value: "streetlevel imagery", display_value: I18n.t("Street-level imagery") },
									{ value: "emergency map", display_value: I18n.t("Emergency map") }
								],
								info: I18n.t("List all sources you have used to make your edits (recommended)"),
							}}
							tags={this.props.changeset.tags}
						/>

						<PresetInputField
							type="binarycheck"
							data={{ text: I18n.t("I would like someone to review my edits"), key: "review_requested" }}
							tags={this.props.changeset.tags}
						/>
					</div>
					:
					<div className="text-center">
						{this.props.changeset.status === "upload" &&
							<div><Spinner animation="grow" variant="success" className="align-middle" /> {I18n.t("Uploading your changes...")}</div>
						}
						{this.props.changeset.status === "sent" &&
							<div>
								<Check size={42} style={{color: "green"}} /> {I18n.t("Thanks for your contribution !")}<br />

								<Button
									variant="outline-success"
									size="sm"
									block
									href={window.CONFIG.osm_api_url+"/changeset/"+this.props.changeset.id}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Magnify size={24} /> {I18n.t("See your changes on OpenStreetMap")}
								</Button>

								<Button
									variant="outline-primary"
									size="sm"
									block
									onClick={() => PubSub.publish("body.action.cleanup")}
								>
									<Pencil size={24} /> {I18n.t("Go back to editing")}
								</Button>
							</div>
						}
						{this.props.changeset.status === "error" &&
							<div>
								<CloseCircle size={42} style={{color: "red"}} /> {I18n.t("Oops ! There was an error during upload...")}<br />

								{this.props.changeset.reason === "changeset_failed" ?
									I18n.t("OpenStreetMap server can't be contacted. Check your Internet connection and retry in a few minutes.")
									:
									I18n.t("Some of your edits could have been lost, please reload and retry.")
								}

								{this.props.changeset.reason === "changeset_failed" &&
									<Button
										variant="outline-secondary"
										size="sm"
										onClick={() => PubSub.publish("body.mode.set", { mode: Body.MODE_BUILDING })}
										block
									>
										{I18n.t("Go back to editing")}
									</Button>
								}
							</div>
						}
					</div>
				}
			</div>

			{this.props.changeset.status === "check" &&
				<div className="m-2 mb-4 d-flex justify-content-between">
					<Button
						variant="success"
						size="sm"
						onClick={() => {
							if(this.props.changeset.tags && this.props.changeset.tags.comment && this.props.changeset.tags.comment.trim().length > 0) {
								PubSub.publish("body.action.save");
							}
							else {
								alert(I18n.t("You have to give us more details about your changes using Changeset comment text field."));
							}
						}}
						className="flex-grow-1 mr-1"
					>
						{I18n.t("Send")}
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => PubSub.publish("body.mode.set", { mode: Body.MODE_BUILDING })}
						className="flex-grow-1 ml-1"
					>
						{I18n.t("Cancel")}
					</Button>
				</div>
			}

			{this.props.changeset.status === "check" &&
				<div className="m-2">
					<h5 className="m-0 mt-2 p-0 mb-2">{I18n.t("Changeset tags")}</h5>
					<TagsTable
						tags={this.props.changeset.tags}
					/>

					<h5 className="m-0 mt-4 p-0 mb-2">{I18n.t("Your edits")}</h5>
					<ChangesetDiff diff={this.props.changeset.diff} />
				</div>
			}
		</div>;
	}
}

export default ChangesetPane;
