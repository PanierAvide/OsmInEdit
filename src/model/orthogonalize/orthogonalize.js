import deepEqual from 'fast-deep-equal';
import { geoVecAdd, geoVecEqual, geoVecInterp, geoVecLength, geoVecNormalize, geoVecProject, geoVecScale, geoVecSubtract } from './vector';
import { geoOrthoNormalizedDotProduct, geoOrthoCalcScore } from './ortho';
import { fixPrecision } from '../../utils';

/*
 * Constants
 */
const EPSILON = 1e-4;
const THRESHOLD = 13; // degrees within right or straight to alter

/*
 * Utility functions
 */

function clonePoints(array) {
	return array.map(function(p) {
		return { id: p.id, coord: [p.coord[0], p.coord[1]] };
	});
}

function cloneNodes(array) {
	return array.map(function(p) {
		return { id: p.id, loc: [p.loc[0], p.loc[1]] };
	});
}

function findNode(mynodes, nodeId) {
	return mynodes.find(n => n.id === nodeId);
}

function moveNode(nodes, nodeId, newCoords) {
	return nodes.map(n => n.id === nodeId ? { id: n.id, loc: newCoords } : n);
}


/**
 * Transform a given GeoJSON feature into an orthogonalized geometry (squarified version).
 * Based on iD editor implementation.
 * @see https://github.com/openstreetmap/iD/blob/master/modules/actions/orthogonalize.js
 */
export function makeSquare(feature, map) {
	if(feature.geometry.type !== "Polygon" && feature.geometry.type !== "LineString") { return feature; }

	// We test normalized dot products so we can compare as cos(angle)
	const lowerThreshold = Math.cos((90 - THRESHOLD) * Math.PI / 180);
	const upperThreshold = Math.cos(THRESHOLD * Math.PI / 180);
	const t = 1;

	const isClosed = feature.geometry.type === "Polygon"
					|| deepEqual(feature.geometry.coordinates[0], feature.geometry.coordinates[feature.geometry.coordinates.length -1]);

	let nodes = cloneNodes(
		(feature.geometry.type === "Polygon" ? feature.geometry.coordinates[0] : feature.geometry.coordinates).map((n,i) => ({ id: i, loc: n.slice() }))
	);

	// Remove nearly duplicates
	for(let i=0; i < nodes.length - 1; i++) {
		if(geoVecLength(nodes[i].loc, nodes[i+1].loc) < 1e-6) {
			nodes.splice(i, 1);
			i--;
		}
	}

	const originalNodes = cloneNodes(nodes);

	if (isClosed) {
		nodes.pop();
	}

	// note: all geometry functions here use the unclosed node/point/coord list
	const nodeCount = {};
	const points = [];
	const corner = { i: 0, dotp: 1 };
	let node, point, loc, score, motions, i, j;

	const project = (point) => {
		const res = map.latLngToLayerPoint([ point[1], point[0] ]);
		return [ res.x, res.y ];
	};

	const invert = (point) => {
		const res = map.layerPointToLatLng(point);
		return [ res.lng, res.lat ];
	};

	const calcMotion = (point, i, array) => {
		// don't try to move the endpoints of a non-closed way.
		if (!isClosed && (i === 0 || i === array.length - 1)) {
			return [0, 0];
		}
		// don't try to move a node that appears more than once (self intersection)
		if (nodeCount[array[i].id] > 1) {
			return [0, 0];
		}

		const a = array[(i - 1 + array.length) % array.length].coord;
		const origin = point.coord;
		const b = array[(i + 1) % array.length].coord;
		let p = geoVecSubtract(a, origin);
		let q = geoVecSubtract(b, origin);

		const scale = 2 * Math.min(geoVecLength(p), geoVecLength(q));
		p = geoVecNormalize(p);
		q = geoVecNormalize(q);

		const dotp = (p[0] * q[0] + p[1] * q[1]);
		const val = Math.abs(dotp);

		if (val < lowerThreshold) {  // nearly orthogonal
			corner.i = i;
			corner.dotp = val;
			const vec = geoVecNormalize(geoVecAdd(p, q));
			return geoVecScale(vec, 0.1 * dotp * scale);
		}

		return [0, 0];   // do nothing
	};

	// Map nodes into points (using current Leaflet map)
	for (i = 0; i < nodes.length; i++) {
		node = nodes[i];
		nodeCount[node.id] = (nodeCount[node.id] || 0) + 1;
		points.push({ id: node.id, coord: project(node.loc) });
	}

	if (points.length === 3) {   // move only one vertex for right triangle
		for (i = 0; i < 1000; i++) {
			motions = points.map(calcMotion);

			points[corner.i].coord = geoVecAdd(points[corner.i].coord, motions[corner.i]);
			score = corner.dotp;
			if (score < EPSILON) {
				break;
			}
		}

		node = originalNodes[corner.i];
		loc = invert(points[corner.i].coord);
		nodes = moveNode(nodes, node.id, geoVecInterp(node.loc, loc, t));
	}
	else {
		const straights = [];
		const simplified = [];

		// Remove points from nearly straight sections..
		// This produces a simplified shape to orthogonalize
		for (i = 0; i < points.length; i++) {
			point = points[i];
			let dotp = 0;
			if (isClosed || (i > 0 && i < points.length - 1)) {
				const a = points[(i - 1 + points.length) % points.length];
				const b = points[(i + 1) % points.length];
				dotp = Math.abs(geoOrthoNormalizedDotProduct(a.coord, b.coord, point.coord));
			}

			if (dotp > upperThreshold) {
				straights.push(point);
			} else {
				simplified.push(point);
			}
		}

		// Orthogonalize the simplified shape
		let bestPoints = clonePoints(simplified);
		const originalPoints = clonePoints(simplified);

		score = Infinity;
		for (i = 0; i < 1000; i++) {
			motions = simplified.map(calcMotion);

			for (j = 0; j < motions.length; j++) {
				simplified[j].coord = geoVecAdd(simplified[j].coord, motions[j]);
			}
			const newScore = geoOrthoCalcScore(simplified, isClosed, EPSILON, THRESHOLD);
			if (newScore < score) {
				bestPoints = clonePoints(simplified);
				score = newScore;
			}
			if (score < EPSILON) {
				break;
			}
		}

		const bestCoords = bestPoints.map(function(p) { return p.coord; });

		if(isClosed) {
			bestCoords.push(bestCoords[0]);
		}

		// move the nodes that should move
		for (i = 0; i < bestPoints.length; i++) {
			point = bestPoints[i];

			if (!geoVecEqual(originalPoints[i].coord, point.coord)) {
				node = findNode(originalNodes, point.id);
				loc = invert(point.coord);
				nodes = moveNode(nodes, node.id, geoVecInterp(node.loc, loc, t));
			}
		}

		// move the nodes along straight segments
		for (i = 0; i < straights.length; i++) {
			point = straights[i];
			if (nodeCount[point.id] > 1) continue;   // skip self-intersections

			node = findNode(originalNodes, point.id);

			// move interesting points to the nearest edge..
			const choice = geoVecProject(point.coord, bestCoords);
			if (choice) {
				loc = invert(choice.target);
				nodes = moveNode(nodes, node.id, geoVecInterp(node.loc, loc, t));
			}
		}
	}

	if(isClosed) {
		nodes.push(nodes[0]);
	}

	// Create clean feature for sending back
	const newFeature = { type: "Feature", geometry: { type: feature.geometry.type } };
	if(feature.geometry.type === "Polygon") {
		newFeature.geometry.coordinates = [ nodes.map(n => fixPrecision(n.loc)) ];
	}
	else {
		newFeature.geometry.coordinates = nodes.map(n => fixPrecision(n.loc));
	}

	return newFeature;
};
