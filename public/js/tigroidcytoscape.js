/**
 *
 */

class TigroidCytoscape {

	makeVertexId(vType, vId) {
		return vType + "(" + vId + ")";
	}

	// Vertex functions --------------------------------------------------------

	isValidVertex(vertex) {
		return vertex.hasOwnProperty("v_type") && vertex.hasOwnProperty("v_id") &&
			vertex.hasOwnProperty("attributes");
	}

	convertVertex(vertex) {
		if (! this.isValidVertex(vertex)) {
			return null;
		}
		let ret = {
				id: this.makeVertexId(vertex["v_type"], vertex["v_id"]),
				v_id: vertex["v_id"],
				v_type: vertex["v_type"]
		};
		if (vertex.hasOwnProperty("v_missed")) {
			ret["v_missed"] = vertex["v_missed"];
		}
		Object.assign(ret, vertex["attributes"]);
		if (this.debug) {
			console.log(ret);
		}
		return ret;
	}

	addVertex(vertex) {
		if (! this.isValidVertex(vertex)) {
			return null;
		}
		this.cy.add({group: "nodes", data: this.convertVertex(vertex)});
	}

	addVertexSet(vertexSet) {
		for (let v in vertexSet) {
			this.addVertex(vertexSet[v]);
		}
	}

	addVertices(vertices) {
		this.addVertexSet(vertices);
	}

	// Edge functions ----------------------------------------------------------

	isValidEdge(edge) {
		return edge.hasOwnProperty("e_type") &&
			edge.hasOwnProperty("from_type") && edge.hasOwnProperty("from_id") &&
			edge.hasOwnProperty("to_type")   && edge.hasOwnProperty("to_id") &&
			edge.hasOwnProperty("attributes");
	}

	convertEdge(edge) {
		if (! this.isValidEdge(edge)) {
			return null;
		}
		let sourceV = this.makeVertexId(edge["from_type"], edge["from_id"]);
		let targetV = this.makeVertexId(edge["to_type"],   edge["to_id"]);
		let ret = {
				id: edge["e_type"] + ":" + sourceV + "->" + targetV,
				source: sourceV,
				target: targetV,
				e_type: edge["e_type"],
				from_type: edge["from_type"],
				from_id: edge["from_id"],
				to_type: edge["to_type"],
				to_id: edge["to_id"],
				directed: edge["directed"].toString()
		};
		if (this.revEdge && edge.hasOwnProperty("reverse_edge")) {
			ret["reverse_edge"] = edge["reverse_edge"];
		}
		Object.assign(ret, edge["attributes"]);
		if (this.debug) {
			console.log(ret);
		}
		return ret;
	}

	addEdge(edge) {
		if (! this.isValidEdge(edge)) {
			return null;
		}
		let e = this.convertEdge(edge);

		let src = this.cy.getElementById(e["source"])["_private"].hasOwnProperty("data");
		let trg = this.cy.getElementById(e["target"])["_private"].hasOwnProperty("data");

		if ((! src || ! trg) && ! this.strayEdge) {
			return;
		}

		if (! src) {
			src = {
				v_id: e["from_id"],
				v_type: e["from_type"],
				v_missed: true,
				attributes: {}
			}
			this.addVertex(src);
		}

		if (! trg) {
			trg = {
				v_id: e["to_id"],
				v_type: e["to_type"],
				v_missed: true,
				attributes: {}
			}
			this.addVertex(trg);
		}

		this.cy.add({group: "edges", data: e});
	}

	addEdgeSet(edgeSet) {
		for (let e in edgeSet) {
			this.addEdge(edgeSet[e]);
		}
	}

	addEdges(edges) {
		this.addEdgeSet(edges);
	}

	// Query functions ---------------------------------------------------------

	addQueryOutput(output) {
		if (output.hasOwnProperty("Vertices")) {
			let vs = output["Vertices"];
			for (let v in vs) {
				this.addVertexSet(vs[v]);
			}
		}

		if (output.hasOwnProperty("Edges")) {
			let es = output["Edges"];
			for (let e in es) {
				this.addEdgeSet(es[e]);
			}
		}
	}

	// -------------------------------------------------------------------------

	constructor ({cy, strayEdge = true, revEdge = false, debug = false}) {
		this.cy = cy;
		this.debug = debug;
		this.strayEdge = strayEdge;
		this.revEdge = revEdge;
	}
}
