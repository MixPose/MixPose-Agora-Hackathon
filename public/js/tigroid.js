class TigroidException {
    constructor(message, code) {
        this.message = message;
        this.code    = code;
    }
}

class HttpError {
    constructor(message, code) {
        this.message = message;
        this.code    = code;
    }
}

/**
 * JavaScript connector for TigerGraph
 * https://www.tigergraph.com
 *
 * Common arguments used in methods:
 * vertexType, sourceVertexType, targetVertexType -- The name of a vertex type in the graph.
 *                                                   Use `getVertexTypes()` to fetch the list of vertex types currently in the graph.
 * vertexId, sourceVertexId, targetVertexId       -- The PRIMARY_ID of a vertex instance (of the appropriate data type).
 * edgeType                                       -- The name of the edge type in the graph.
 *                                                   Use `getEdgeTypes()` to fetch the list of edge types currently in the graph.
 */
class Tigroid {

    // Private functions ========================================================

	/**
	 * Checks if the JSON document returned by an endpoint has contains error: true; if so, it raises an exception
	 *
	 * @param {string} res - The response returned by the endpoint.
	 */
    _errorCheck(res) {
        if ("error" in res && res["error"] && res["error"] != "false") {
            throw new TigroidException(res["message"], ("code" in res) ? res["code"] : null);
        }
    }

    /**
     * Generic REST++ API request
     *
	 * @param {string} method - HTTP method, currently one of GET, POST, DELETE or PUT.
	 * @param {string} url - Complete REST++ API URL including path and parameters.
	 * @param {string} authMode - Authentication mode, one of 'token' (default) or 'pwd'.
	 * @param {object} headers - Standard HTTP request headers.
	 * @param {string} data - Request payload, typically a JSON document.
	 * @param {string} resKey - the JSON subdocument to be returned, default is 'result'.
	 * @param {boolean} skipCheck - Skip error checking? Some endpoints return error to indicate that the requested action is not applicable; a problem, but not really an error.
	 * @param {string|Object} params - Request URL parameters.
	 *
	 * @returns {string} The relevant part of the endpoint response as selected by resKey.
     */
    _req({method = "GET", url = "", authMode= "token", headers = null, data = null, resKey = "results", skipCheck = false, params = null}) {

        let _auth = null;
/*
        if (authMode == "pwd") {
            _auth = {username, password};
        }
*/
        let _headers = {};
        /*
        if (authMode === "token") {
            _headers = this.authHeader;
        }
        */
        if (headers) {
            _headers = Object.assign(_headers, headers)
        }
        if (this.debug && _headers) {
            console.log(_headers);
        }

        let _data;
        if (method === "POST") {
            _data = data
        } else {
            _data = null
        }

        let _params = ""
        if (params) {
            if (typeof params === "string") {
                _params = params;
            } else if (typeof params === "object") {
                let isFirst = true;
                for (let p in params) {
                    if (! isFirst) {
                        _params += "&";
                    }
                    _params += p + "=" + params[p];
                    isFirst = false;
                }
            }
            _params = "?" + encodeURI(_params);
        }

        if (this.debug) {
            console.log(method + " " + url + (_params ? _params : "") + (data ? " => " + data : ""));
        }

        // TODO: async access
        this.xhr.open(method, url + (_params ? _params : ""), false); //, this.username, this.password);
/*
        if (_headers) {
            if (this.debug) {
                console.log(_headers);
            }
            for (let h in _headers) {
                this.xhr.setRequestHeader(h, _headers[h]);
            }
        }
*/
        this.xhr.send(_data);
        let res = JSON.parse(this.xhr.responseText);

        if (this.debug) {
            console.log(this.xhr.responseURL);
        }

        if (this.xhr.status !== 200) {
            throw new HttpError(this.xhr.statusText, this.xhr.status);
        }

        if (! skipCheck) {
            this._errorCheck(res)
        }

        if (! resKey) {
            if (this.debug) {
                console.log(res);
            }
            return res;
        }
        if (this.debug) {
            console.log(res[resKey]);
        }
        return res[resKey];
    }

    /**
     * Generic GET method.
     *
     * For parameter and return details see {@link _req}.
     */
    _get({url, authMode = "token", headers = null, resKey = "results", skipCheck = false, params = null}) {
        return this._req({method: "GET", url: url, authMode: authMode, headers: headers, data: null, resKey: resKey, skipCheck: skipCheck, params: params});
    }

    /**
     * Generic POST method.
     *
     * For parameter and return details see {@link _req}.
     */
    _post({url, authMode= "token", headers = null, data = null, resKey = "results", skipCheck = false, params = null}) {
        return this._req({method: "POST", url: url, authMode: authMode, headers: headers, data: data, resKey: resKey, skipCheck: skipCheck, params: params})
    }

    /**
     * Generic DELETE method.
     *
     * For parameter and return details see {@link _req}.
     */
    _delete({url, authMode}) {
    	console.log("URL: " + url);
        return this._req({method: "DELETE", url: url, authMode: authMode});
    }

    /**
     * Transforms attributes (provided as an string or array of strings) into a hierarchy as expect by the upsert functions.
     *
     * @param {Object} attributes - Vertex or edge attributes.
     *
     * @returns {Object} Attributes in new structure.
     */
    _upsertAttrs(attributes) {
        if (this.debug) {
            console.log(attributes);
        }
        if (typeof attributes !== "object") {
            return {};
        }
        let vals = {};
        for (let attr in attributes) {
            let val = attributes[attr];
            if (Array.isArray(val)) {
                vals[attr] = {value: val[0], op: val[1]};
            } else {
                vals[attr] = {value: val}
            }
        }
        if (this.debug) {
            console.log(vals);
        }
        return vals;
    }

    // Schema related functions =================================================

    /**
     * Retrieves all User Defined Types (UDTs) of the graph.
     *
     * Endpoint:      GET /gsqlserver/gsql/udtlist
     * Documentation: Not documented publicly
     *
     * @returns {string} The JSON document containing the UDT details (or empty string).
     */
    _getUDTs() {
        return this._get({url: this.gsUrl + "/gsqlserver/gsql/udtlist?graph=" + this.graphname, authMode: "pwd"});
    }

    getSchema(udts = true, force = false) {
        if (! this.schema || force) {
            this.schema = this._get({url: this.gsUrl + "/gsqlserver/gsql/schema?graph=" + this.graphname, authMode: "pwd"});
        }
        if (udts && (! "UDTs" in this,schema || force)) {
            this.schema["UDTs"] = this._getUDTs();
        }
        return this.schema;
    }

    getUDTs() {
        let ret = [];
        let udts = this._getUDTs();
        for (let udt in udts) {
            ret.push(udts[udt]["name"]);
        }
        return ret;
    }

    getUDT(udtName) {
        let udts = this._getUDTs();
        for (let udt in udts) {
            if (udts[udt]["name"] === udtName) {
                return udts[udt]["fields"];
            }
        }
        return [];  // UDT was not found
    }

    upsertData(data) {
        if (typeof data !== "string") {
            data = JSON.stringify(data);
        }
        return this._post({url: this.restppUrl + "/graph/" + this.graphname, data: data})[0];
    }

    // Vertex related functions =================================================

    getVertexTypes(force = false) {
        let ret = [];
        let vts = this.getSchema(true, force)["VertexTypes"];
        for (let vt in vts) {
            ret.push(vts[vt]["Name"]);
        }
        return ret;
    }

    getVertexType(vertexType, force = false) {
        let vts = this.getSchema(true, force)["VertexTypes"];
        for (let vt in vts) {
            if (vts[vt]["Name"] === vertexType) {
                return vts[vt];
            }
        }
        return {}
    }

    getVertexCount(vertexType, where = "") {
        let res;
        // If WHERE condition is not specified, use /builtins else user /vertices
        if (where) {
            if (vertexType === "*") {
                throw new TigroidException("VertexType cannot be \"*\" if where condition is specified.", null);
            }
            res = this._get({url: this.restppUrl + "/graph/" + this.graphname + "/vertices/" + vertexType + "?count_only=true&filter=" + where});
        } else {
            let data = '{"function":"stat_vertex_number","type":"' + vertexType + '"}';
            res = this._post({url: this.restppUrl + "/builtins/" + this.graphname, data: data});
        }
        if (res.length === 1 && res[0]["v_type"] === vertexType) {
            return res[0]["count"];
        }
        let ret = {};
        for (let r in res) {
            ret[res[r]["v_type"]] = res[r]["count"];
        }
        return ret;
    }

    upsertVertex(vertexType, vertexId, attributes = null) {
        if ( typeof attributes !== "object") {
            return null;
        }
        let vals = this._upsertAttrs(attributes);
        let v = {};
        v[vertexId] = vals;
        let vt = {};
        vt[vertexType] = v;
        let data = JSON.stringify({vertices: vt})
        return this._post({url: this.restppUrl + "/graph/" + this.graphname, data: data})[0]["accepted_vertices"];
    }

    upsertVertices(vertexType, vertices) {
        if (! Array.isArray(vertices)) {
            return null;
        }
        let vts = {};
        for (let v in vertices) {
            let v1 = vertices[v];
            let vid = Object.keys(v1)[0];
            vts[vid] = this._upsertAttrs(v1[vid]);
        }
        let vt = {}
        vt[vertexType] = vts;
        let data = JSON.stringify({vertices: vt});
        return this._post({url: this.restppUrl + "/graph/" + this.graphname, data: data})[0]["accepted_vertices"];
    }

    /**
     * Retrieves vertices of the given vertex type.
     *
     * @param {string} select - Comma separated list of vertex attributes to be retrieved or omitted.
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#select}
	 * @param {string} where - Comma separated list of conditions that are all applied on each vertex' attributes.
     *                 The conditions are in logical conjunction (i.e. they are "AND'ed" together).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#filter}
	 * @param {number} limit - Maximum number of vertex instances to be returned (after sorting).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#limit}
     *                 Must be used with sort.
	 * @param {string} sort - Comma separated list of attributes the results should be sorted by.
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#sort}
     *                 Must be used with limit.
     *
     * @returns {string} A JSON document containing the vertex'/vertices' details.
     *
     * NOTE: The primary ID of a vertex instance is NOT an attribute, thus cannot be used in above arguments.
     *       Use `getVerticesById` if you need to retrieve by vertex ID.
     *
     * Endpoint:      GET /graph/{graph_name}/vertices
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#get-graph-graph_name-vertices}
     */
    getVertices(vertexType, select = "", where = "", limit = "", sort = "", timeout = 0) {
        let url = this.restppUrl + "/graph/" + this.graphname + "/vertices/" + vertexType;
        let isFirst = true;
        if (select) {
            url += "?select=" + select;
            isFirst = false;
        }
        if (where) {
            url += (isFirst ? "?" : "&") + "filter=" + where;
            isFirst = false;
        }
        if (limit) {
            url += (isFirst ? "?" : "&") + "limit=" + limit.toString();
            isFirst = false;
        }
        if (sort) {
            url += (isFirst ? "?" : "&") + "sort=" + sort;
            isFirst = false;
        }
        if (timeout) {
            url += (isFirst ? "?" : "&") + "timeout=" + timeout.toString();
        }
        return this._get({url: url});
    }

    /**
     * Retrieves vertices of the given vertex type, identified by their ID.
     *
     * @param {string|string[]} vertexIds -  A single vertex ID or a list of vertex IDs.
     *
     * @returns {string} A JSON document containing the vertex'/vertices' details.
     *
     * Endpoint:      GET /graph/{graph_name}/vertices
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#get-graph-graph_name-vertices}
     */
    getVerticesById(vertexType, vertexIds) {
        if (! vertexIds) {
            throw new TigroidException("No vertex ID was specified.", null);
        }
        let vids = [];
        if (typeof vertexIds == "string") {
            vids.push(vertexIds);
        } else if (! Array.isArray(vertexIds)) {
            return null;
        } else {
            vids = vertexIds;
        }
        let url = this.restppUrl + "/graph/" + this.graphname + "/vertices/" + vertexType + "/";
        let ret = [];
        for (let vid in vids) {
            ret.push(this._get({url: url + vids[vid].toString()})[0]);
        }
        return ret;
    }

    // TODO: getVertexNeighbors()

    /** Returns vertex attribute statistics.
     *
	 * @param {string|string[]} vertexTypes - A single vertex type name or a list of vertex types names or '*' for all vertex types.
	 * @param {boolean} skipNA - Skip those non-applicable vertices that do not have attributes or none of their attributes have statistics gathered.
	 *
	 * @returns: A JSON document of vertex startistics.
	 *
	 * Endpoint:      POST /builtins
	 * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#stat_vertex_attr}
     */
    getVertexStats(vertexTypes, skipNA = false) {
        let vts = [];
        if (vertexTypes === "*") {
            vts = this.getVertexTypes();
        } else if (typeof vertexTypes === "string") {
            vts.push(vertexTypes);
        } else if (Array.isArray(vertexTypes)) {
            vts = vertexTypes;
        } else {
            return null;
        }
        let ret = {};
        for (let vt in vts) {
            let data = '{"function":"stat_vertex_attr","type":"' + vts[vt] + '"}';
            let res = this._post({url: this.restppUrl + "/builtins/" + this.graphname, data: data, resKey: null, skipCheck: true});
            if (res["error"]) {
                if (res["message"].search("stat_vertex_attr is skipped") !== -1) {
                    if (! skipNA) {
                        ret[vts[vt]] = {};
                    } else {
                        throw new TigroidException(res["message"], "code" in res ? res["code"] : null);
                    }
                }
            } else {
                res = res["results"];
                for (let r in res) {
                    ret[res[r]["v_type"]] = res[r]["attributes"];
                }
            }
        }
        return ret;
    }

    /**
     * Deletes vertices from graph.
     *
	 * @param {string} where - Comma separated list of conditions that are all applied on each vertex' attributes.
     *                 The conditions are in logical conjunction (i.e. they are "AND'ed" together).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#filter}
	 * @param {number} limit - Maximum number of vertex instances to be returned (after sorting).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#limit}
     *                 Must be used with sort.
	 * @param {string} sort - Comma separated list of attributes the results should be sorted by.
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#sort}
     *                 Must be used with limit.
	 * @param {boolean} permanent - If true, the deleted vertex IDs can never be inserted back, unless the graph is dropped or the graph store is cleared.
	 * @param {number} timeout - Time allowed for successful execution (0 = no limit, default).
	 *
	 * @returns {number} A single number of deleted vertices.
	 *
	 * NOTE: The primary ID of a vertex instance is NOT an attribute, thus cannot be used in above arguments.
	 *                Use {@link delVerticesById} if you need to delete by vertex ID.
	 * Endpoint:      DELETE /graph/{graph_name}/vertices
	 * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#delete-graph-graph_name-vertices}
     */
    delVertices(vertexType, where = "", limit = "", sort = "", permanent = false, timeout = 0) {
        let url = this.restppUrl + "/graph/" + this.graphname + "/vertices/" + vertexType;
        let isFirst = true;
        if (where) {
            url += "?filter=" + where;
            isFirst = false;
        }
        if (limit && sort) {  // These two must be provided together.
            url += (isFirst ? "?" : "&") + "limit=" + limit.toString() + "&sort=" + sort;
            isFirst = false;
        }
        if (permanent) {
            url += (isFirst ? "?" : "&") + "permanent=true";
            isFirst = false;
        }
        if (timeout && timeout > 0) {
            url += (isFirst ? "?" : "&") + "timeout=" + timeout.toString();
        }
        console.log("URL: " + url);
        return this._delete({url: url})["deleted_vertices"];
    }

    /**
     * Deletes vertices from graph identified by their ID.
     *
	 * @param {string|string[]} vertexIds - A single vertex ID or a list of vertex IDs.
	 * @param {boolean} permanent - If true, the deleted vertex IDs can never be inserted back, unless the graph is dropped or the graph store is cleared.
	 * @param {number} timeout - Time allowed for successful execution (0 = no limit, default).
	 *
	 * @returns {number} A single number of deleted vertices.
	 *
	 * Endpoint:      DELETE /graph/{graph_name}/vertices
	 * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#delete-graph-graph_name-vertices}
     */
    delVerticesById(vertexType, vertexIds, permanent = false, timeout = 0) {
        if (! vertexIds) {
        	throw new TigroidException ("No vertex ID was not specified.", null);
        }
        let vids = [];
        if (typeof vertexIds === "string" || typeof vertexIds === "number") {
            vids.push(vertexIds);
        } else if (! Array.isArray(vertexIds)) {
            return null;
        } else {
            vids = vertexIds;
        }
        let url1 = this.restppUrl + "/graph/" + this.graphname + "/vertices/" + vertexType + "/";
        let url2 = "";
        if (permanent) {
            url2 = "?permanent=true";
        }
        if (timeout && timeout > 0) {
            url2 += (url2 ? "?" : "&") + "timeout=" + timeout.toString();
        }
        let ret = 0;
        for (let vid in vids) {
            ret += this._delete(url1 + str(vid) + url2)["deleted_vertices"];
        }
        return ret;
    }

    // Edge related functions ===================================================

    /**
     * Returns the list of edge type names of the graph.
     *
     * @param {boolean} force - If true, forces the retrieval the schema details again, otherwise returns a cached copy of edge type details (if they were already fetched previously).
     *
     * @returns {string[]} An array of edge type names.
     */
    getEdgeTypes(force = false) {
        let ret = [];
        let ets = this.getSchema(force = force)["EdgeTypes"];
        for (let et in ets) {
            ret.push(ets[et]["Name"]);
        }
        return ret;
    }

    /**
     * Returns the details of vertex type.
     *
	 * @param {string} edgeType - The name of the edge type.
	 * @param {boolean} force - If true, forces the retrieval the schema details again, otherwise returns a cached copy of edge type details (if they were already fetched previously).
	 *
	 * @returns {string} A JSON document describing the vertex type.
     */
    getEdgeType(edgeType, force = false) {
        let ets = this.getSchema(force = force)["EdgeTypes"];
        for (let et in ets) {
            if (ets[et]["Name"] === edgeType) {
                return ets[et];
            }
        }
        return {};
    }

    /**
     * Returns the type(s) of the edge type's source vertex.
     *
	 * @param {string} edgeType - The name of the edge type.
     *
     * @returns
     *  - A single source vertex type name string if the edge has a single source vertex type
     *  - "*" if the edge can originate from any vertex type (notation used in 2.6.1 and earlier versions)
     *      See {@link https://docs.tigergraph.com/v/2.6/dev/gsql-ref/ddl-and-loading/defining-a-graph-schema#creating-an-edge-from-or-to-any-vertex-type}
     *  - A set of vertex type name strings (unique values) if the edge has multiple source vertex types (notation used in 3.0 and later versions)
     *      Note: Even if the source vertex types were defined as "*", the REST API will list them as pairs (i.e. not as "*" in 2.6.1 and earlier versions),
     *            just like as if there were defined one by one (e.g. `FROM v1, TO v2 | FROM v3, TO v4 | …`)
     *      Note: The returned set contains all source vertex types, but does not certainly mean that the edge is defined between all source and all target
     *            vertex types. You need to look at the individual source/target pairs to find out which combinations are valid/defined.
     */
    getEdgeSourceVertexType(edgeType) {
        let edgeTypeDetails = this.getEdgeType(edgeType);

        // Edge type with a single source vertex type
        if (edgeTypeDetails["FromVertexTypeName"] != "*") {
            return edgeTypeDetails["FromVertexTypeName"];
        }

        // Edge type with multiple source vertex types
        if ("EdgePairs" in edgeTypeDetails) {
            // v3.0 and later notation
            let vts = new Set();
            for (ep in edgeTypeDetails["EdgePairs"]) {
                vts.add(ep["From"]);
            }
            return vts;
        } else {
            // 2.6.1 and earlier notation
            return "*";
        }
    }

    /**
     * Returns the type(s) of the edge type's target vertex.
     *
	 * @param {string} edgeType - The name of the edge type.
     *
     * @returns
     *  - A single target vertex type name string if the edge has a single target vertex type
     *  - "*" if the edge can originate from any vertex type (notation used in 2.6.1 and earlier versions)
     *      See {@link https://docs.tigergraph.com/v/2.6/dev/gsql-ref/ddl-and-loading/defining-a-graph-schema#creating-an-edge-from-or-to-any-vertex-type}
     *  - A set of vertex type name strings (unique values) if the edge has multiple target vertex types (notation used in 3.0 and later versions)
     *      Note: Even if the target vertex types were defined as "*", the REST API will list them as pairs (i.e. not as "*" in 2.6.1 and earlier versions),
     *            just like as if there were defined one by one (e.g. `FROM v1, TO v2 | FROM v3, TO v4 | …`)
     *      Note: The returned set contains all target vertex types, but does not certainly mean that the edge is defined between all source and all target
     *            vertex types. You need to look at the individual source/target pairs to find out which combinations are valid/defined.
     */
    getEdgeTargetVertexType(edgeType) {
        let edgeTypeDetails = this.getEdgeType(edgeType);

        // Edge type with a single target vertex type
        if (edgeTypeDetails["ToVertexTypeName"] != "*") {
            return edgeTypeDetails["ToVertexTypeName"];
        }

        // Edge type with multiple target vertex types
        if ("EdgePairs" in edgeTypeDetails) {
            // v3.0 and later notation
            let vts = new Set();
            for (ep in edgeTypeDetails["EdgePairs"]) {
                vts.add(ep["To"]);
            }
            return vts;
        } else {
            // 2.6.1 and earlier notation
            return "*";
        }
    }

    /**
     * Is the specified edge type directed?
     *
	 * @param {string} edgeType - The name of the edge type.
	 *
	 * @returns {boolean}
     */
    isDirected(edgeType) {
        return this.getEdgeType(edgeType)["IsDirected"];
    }

    /**
     * Returns the name of the reverse edge of the specified edge type, if applicable.
     *
	 * @param {string} edgeType - The name of the edge type.
	 *
	 * @returns {string} Reverse edge name
     */
    getReverseEdge(edgeType) {
        if (! this.isDirected(edgeType)) {
            return null;
        }
        let config = this.getEdgeType(edgeType)["Config"];
        if ("REVERSE_EDGE" in config) {
            return config["REVERSE_EDGE"];
        }
        return null;
    }

    /**
     * Returns the number of edges from a specific vertex.
     *
     * @param {string} where - Comma separated list of conditions that are all applied on each edge's attributes.
     *                         The conditions are in logical conjunction (i.e. they are "AND'ed" together).
     *                         See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#filter}
     *
     * @returns {object} Edge type / edge count pairs.
     *
     * Uses:
     * - If `edgeType` = "*": edge count of all edge types (no other arguments can be specified in this case).
     * - If `edgeType` is specified only: edge count of the given edge type.
     * - If `sourceVertexType`, `edgeType`, `targetVertexType` are specified: edge count of the given edge type between source and target vertex types.
     * - If `sourceVertexType`, `sourceVertexId` are specified: edge count of all edge types from the given vertex instance.
     * - If `sourceVertexType`, `sourceVertexId`, `edgeType` are specified: edge count of all edge types from the given vertex instance.
     * - If `sourceVertexType`, `sourceVertexId`, `edgeType`, `where` are specified: the edge count of the given edge type after filtered by `where` condition.
     *
     * If `targetVertexId` is specified, then `targetVertexType` must also be specified.
     * If `targetVertexType` is specified, then `edgeType` must also be specified.
     *
     * For valid values of `where` condition, see https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#filter
     *
     * Returns a dictionary of <edge_type>: <edge_count> pairs.
     *
     * Endpoint:      GET /graph/{graph_name}/edges
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#get-graph-graph_name-edges}
     * Endpoint:      POST /builtins
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#stat_edge_number}
     */
    getEdgeCountFrom(sourceVertexType = null, sourceVertexId = null, edgeType = null, targetVertexType = null, targetVertexId = null, where = "") {
        // If WHERE condition is not specified, use /builtins else user /vertices
        let res;
        if (where || (sourceVertexType && sourceVertexId)) {
            if (!sourceVertexType || !sourceVertexId) {
                throw new TigroidException("If where condition is specified, then both sourceVertexType and sourceVertexId must be provided too.", null);
            }
            let url = this.restppUrl + "/graph/" + this.graphname + "/edges/" + sourceVertexType + "/" + sourceVertexId.toString();
            if (edgeType) {
                url += "/" + edgeType;
                if (targetVertexType) {
                    url += "/" + targetVertexType;
                    if (targetVertexId) {
                        url += "/" + targetVertexId.toString();
                    }
                }
            }
            url += "?count_only=true";
            if (where) {
                url += "&filter=" + where;
            }
            res = this._get({url: url});
        } else {
            if (!edgeType) {  // TODO: is this a valid check?
                throw new TigroidException("A valid edge type or \"*\" must be specified for edgeType.", null);
            }
            let data = '{"function":"stat_edge_number","type":"' + edgeType + '"'
                + (sourceVertexType ? ',"from_type":"' + sourceVertexType + '"' : '')
                + (targetVertexType ? ',"to_type":"' + targetVertexType + '"' : '')
                + '}';
            res = this._post({url: this.restppUrl + "/builtins/" + this.graphname, data: data});
        }
        if (res.length === 1 && res[0]["e_type"] === edgeType) {
            return res[0]["count"];
        }
        let ret = {}
        for (let r in res) {
            ret[res[r]["e_type"]] = res[r]["count"];
        }
        return ret;
    }

    /**
     * Returns the number of edges of an edge type.
     *
     * This is a simplified version of `getEdgeCountFrom`, to be used when the total number of edges of a given type is needed, regardless which vertex instance they are originated from.
     * See documentation of {@link getEdgeCountFrom} above for more details.
     */
    getEdgeCount(edgeType = "*", sourceVertexType = null, targetVertexType = null) {
        return this.getEdgeCountFrom(sourceVertexType, null, edgeType, targetVertexType);
    }

    // TODO: upsertEdge()
    /**
     * Upserts an edge.
     *
     * Data is upserted:
     * - If edge is not yet present in graph, it will be created (see special case below).
     * - If it's already in the graph, it is updated with the values specified in the request.
     *
     * The `attributes` argument is expected to be a dictionary in this format:
     *     {<attribute_name>, <attribute_value>|(<attribute_name>, <operator>), …}
     *
     * Example:
     *     {"visits": (1482, "+"), "max_duration": (371, "max")}
     *
     * For valid values of <operator> see: https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#post-graph-graph_name-upsert-the-given-data
     *
     * @returns A single number of accepted (successfully upserted) edges (0 or 1).
     *
     * Note: If operator is "vertex_must_exist" then edge will only be created if both vertex exists in graph.
     *       Otherwise missing vertices are created with the new edge.
     *
     * Endpoint:      POST /graph
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#post-graph-graph_name-upsert-the-given-data}
     */

    // TODO: upsertEdges()
    /**
     * Upserts multiple edges (of the same type).
     *
     * See the description of {@link upsertEdge} for generic information.
     *
     * The `edges` argument is expected to be a list in of tuples in this format:
     * [
     *   (<source_vertex_id>, <target_vertex_id>, {<attribute_name>: <attribute_value>|(<attribute_name>, <operator>), …})
     *   ⋮
     * ]
     *
     * Example:
     *     [
     *       (17, "home_page", {"visits": (35, "+"), "max_duration": (93, "max")}),
     *       (42, "search", {"visits": (17, "+"), "max_duration": (41, "max")}),
     *     ]
     *
     * For valid values of <operator> see: https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#post-graph-graph_name-upsert-the-given-data
     *
     * @returns A single number of accepted (successfully upserted) edges (0 or positive integer).
     *
     * Endpoint:      POST /graph
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#post-graph-graph_name-upsert-the-given-data}
     */

    /**
     * Retrieves edges of the given edge type originating from a specific source vertex.
     *
     * Only `sourceVertexType` and `sourceVertexId` are required.
     * If `targetVertexId` is specified, then `targetVertexType` must also be specified.
     * If `targetVertexType` is specified, then `edgeType` must also be specified.
     *
     * Arguments:
     * @param {string} select - Comma separated list of vertex attributes to be retrieved or omitted.
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#select}
	 * @param {string} where - Comma separated list of conditions that are all applied on each vertex' attributes.
     *                 The conditions are in logical conjunction (i.e. they are "AND'ed" together).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#filter}
	 * @param {number} limit - Maximum number of vertex instances to be returned (after sorting).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#limit}
     *                 Must be used with sort.
	 * @param {string} sort - Comma separated list of attributes the results should be sorted by.
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#sort}
     *                 Must be used with limit.
     *
     * @returns {string} A JSON document containing the vertex'/vertices' details.
     *
     * Endpoint:      GET /graph/{graph_name}/vertices
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#get-graph-graph_name-edges}
     */
    // TODO: change sourceVertexId to sourceVertexIds and allow passing both number and list as parameter
    getEdges(sourceVertexType, sourceVertexId, edgeType = null, targetVertexType = null, targetVertexId = null, select = "", where = "", sort = "", limit = "", timeout = 0) {
        if (! sourceVertexType || ! sourceVertexId) {
            throw new TigroidException("Both source vertex type and source vertex ID must be provided.", null)
        }
        let url = this.restppUrl + "/graph/" + this.graphname + "/edges/" + sourceVertexType + "/" + sourceVertexId.toString();
        if (edgeType) {
            url += "/" + edgeType;
            if (targetVertexType) {
                url += "/" + targetVertexType;
                if (targetVertexId) {
                    url += "/" + targetVertexId.toString()
                }
            }
        }
        let isFirst = true;
        if (select) {
            url += "?select=" + select;
            isFirst = false;
        }
        if (where) {
            url += (isFirst ? "?" : "&") + "filter=" + where;
            isFirst = false;
        }
        if (sort) {
            url += (isFirst ? "?" : "&") + "sort=" + sort;
            isFirst = false;
        }
        if (limit) {
            url += (isFirst ? "?" : "&") + "limit=" + limit.toString();
            isFirst = false;
        }
        if (timeout && timeout > 0) {
            url += (isFirst ? "?" : "&") + "timeout=" + timeout.toString();
        }
        ret = this._get({url: url});

        // Add reverse edge name where applicable
        let rev = this.getReverseEdge(ret[0]["e_type"]);
        if (rev) {
        	for (let e in ret) {
        		ret[e]["reverse_edge"] = rev;
        	}
        }

        return ret;
    }

    /**
     * Retrieves edges of the given edge type regardless the source vertex.
     *
     * @param {string} edgeType - The name of the edge type.
     */
    getEdgesByType(edgeType) {
        if (! edgeType) {
            return [];
        }

        // Check if ttk_getEdgesFrom query was installed
        if (this.ttkGetEF == null) {
            this.ttkGetEF = false;
            let eps = this.getEndpoints(false,true);
            for (let ep in eps) {
                if (ep.endsWith("ttk_getEdgesFrom")) {
                    this.ttkGetEF = true;
                }
            }
        }
        let sourceVertexType = this.getEdgeSourceVertexType(edgeType);
        if (sourceVertexType === "*") {
            throw new TigroidException("Wildcard edges are not currently supported.", null);
        }

        let ret;
        if (this.ttkGetEF) { // If installed version is available, use it, as it can return edge attributes too.
            if (this.debug) {
                console.log("Using installed query.")
            }
            ret = this.runInstalledQuery("ttk_getEdgesFrom", {"edgeType": edgeType, "sourceVertexType": sourceVertexType});
        } else {  // If installed version is not available, use interpreted version. Always available, but can't return attributes.
            if (this.debug) {
                console.log("Using interpreted query.")
            }
            let queryText =
'INTERPRET QUERY () FOR GRAPH $graphname {\n' +
'    SetAccum<EDGE> @@edges; \n' +
'    start = {ANY}; \n' +
'    res = \n' +
'        SELECT s \n' +
'        FROM   start:s-(:e)->ANY:t \n' +
'        WHERE  e.type == "$edgeType" \n' +
'           AND s.type == "$sourceEdgeType" \n' +
'        ACCUM  @@edges += e; \n' +
'    PRINT @@edges AS edges; \n' +
'}';

            queryText = queryText.replace("$graphname", this.graphname)
                .replace('$sourceEdgeType', sourceVertexType)
                .replace('$edgeType', edgeType);
            ret = this.runInterpretedQuery(queryText)
        }
        ret = ret[0]["edges"];

        // Add reverse edge name where applicable
        let rev = this.getReverseEdge(ret[0]["e_type"]);
        if (rev) {
        	for (let e in ret) {
        		ret[e]["reverse_edge"] = rev;
        	}
        }

        return ret;
    }

    /**
     * Returns edge attribute statistics.
     *
     * @param {strng|string[]} edgeTypes - A single edge type name or a list of edges types names or '*' for all edges types.
     * @param {boolean} skipNA - Skip those edges that do not have attributes or none of their attributes have statistics gathered.
     *
     * @return {sting} A JSON document with edge statistics.
     *
     * Endpoint:      POST /builtins
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#stat_edge_attr}
     */
    getEdgeStats(edgeTypes, skipNA = false) {
        let ets = [];
        if (edgeTypes === "*") {
            ets = this.getEdgeTypes();
        } else if (typeof edgeTypes === "string") {
            ets = [edgeTypes];
        } else if (Array.isArray(edgeTypes)) {
            ets = edgeTypes;
        } else {
            return null;
        }
        let ret = {};
        for (let et in ets) {
            let data = '{"function":"stat_edge_attr","type":"' + ets[et] + '","from_type":"*","to_type":"*"}';
            let res = this._post({url: this.restppUrl + "/builtins/" + this.graphname, data: data, resKey: null, skipCheck: true});
            if (res["error"]) {
                if (res["message"].search("stat_edge_attr is skiped") !== -1 || res["message"].search("No valid edge") !== -1) {
                    if (!skipNA) {
                        ret[ets[et]] = {};
                    }
                } else {
                    throw new TigroidException(res["message"], "code" in res ? res["code"] : null);
                }
            } else {
                res = res["results"];
                for (let r in res) {
                    ret[res[r]["e_type"]] = res[r]["attributes"];
                }
            }
        }
        return ret
    }

    // TODO: delEges()
    /**
     * Deletes edges from the graph.
     *
     * Only `sourceVertexType` and `sourceVertexId` are required.
     * If `targetVertexId` is specified, then `targetVertexType` must also be specified.
     * If `targetVertexType` is specified, then `edgeType` must also be specified.
     *
     * Arguments:
	 * @param {string} where - Comma separated list of conditions that are all applied on each vertex' attributes.
     *                 The conditions are in logical conjunction (i.e. they are "AND'ed" together).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#filter}
	 * @param {number} limit - Maximum number of vertex instances to be returned (after sorting).
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#limit}
     *                 Must be used with sort.
	 * @param {string} sort - Comma separated list of attributes the results should be sorted by.
     *                 See {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#sort}
     *                 Must be used with limit.
	 * @param {number} timeout - Time allowed for successful execution (0 = no limit, default).
     *
     * @returns {object} An object of edge type / deleted edge count pairs.
     *
     * Endpoint:      DELETE /graph/{/graph_name}/edges
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#delete-graph-graph_name-edges}
     */

    // Query related functions ==================================================

    /**
     * Runs an installed query.
     *
     * The query must be already created and installed in the graph.
     * Use `getEndpoints(dynamic=true)` or GraphStudio to find out the generated endpoint URL of the query, but only the query name needs to be specified here.
     *
     * Arguments:
     * @param {string} params - A string of param1=value1&param2=value2 format or an object.
	 * @param {number} timeout - Time allowed for successful execution (0 = no limit, default).
     * @param {number} sizeLimit - Maximum size of response (in bytes).
     *
     * Endpoint:      POST /query/{graph_name}/<query_name>
     * Documentation: {@link https://docs.tigergraph.com/dev/gsql-ref/querying/query-operations#running-a-query}
     */
    runInstalledQuery(queryName, params = null, timeout = 16000, sizeLimit = 32000000) {
        return this._get({url: this.restppUrl + "/query/" + this.graphname + "/" + queryName, params: params, headers: {"RESPONSE-LIMIT": sizeLimit.toString(), "GSQL-TIMEOUT": timeout.toString()}});
    }

    /**
     * Runs an interpreted query.
     *
     * You must provide the query text in this format:
     *     INTERPRET QUERY (<params>) FOR GRAPH <graph_name> {
     *        <statements>
     *     }'
     *
     * Use `$graphname` in the `FOR GRAPH` clause to avoid hard-coding it; it will be replaced by the actual graph name.
     *
     * Arguments:
     * @param {string} params - A string of param1=value1&param2=value2 format or an object.
     *
     * Endpoint:      POST /gsqlserver/interpreted_query
     * Documentation: {@link https://docs.tigergraph.com/dev/restpp-api/built-in-endpoints#post-gsqlserver-interpreted_query-run-an-interpreted-query}
     */
    runInterpretedQuery(queryText, params = null) {
        queryText = queryText.replace("$graphname", this.graphname);
        if (this.debug) {
            console.log(queryText);
        }
        return this._post({url: this.gsUrl + "/gsqlserver/interpreted_query", data: queryText, params: params, authMode: "pwd"});
    }

    /**
     * Parses query output and separates vertex and edge data (and optionally other output) for easier use.
     *
     * @param {object} output - The data structure returned by `runInstalledQuery()` or `runInterpretedQuery()`
     * @param {boolean} graphOnly` - Should output be restricted to vertices and edges (True, default) or should any other output (e.g. values of
     *                 variables or accumulators, or plain text printed) be captured as well.
     *
     * @returns An object with two (or three) keys: "Vertices", "Edges" and optionally "Output". First two refer to another object
     *      containing keys for each vertex and edge types found, and the instances of those vertex and edge types. "Output" is a list of
     *      objects containing the key/value pairs of any other output.
     *
     * The JSON output from a query can contain a mixture of results: vertex sets (the output of a SELECT statement),
     *      edge sets (e.g. collected in a global accumulator), printout of global and local variables and accumulators,
     *      including complex types (LIST, MAP, etc.). The type of the various output entries is not explicit, we need
     *      to inspect the content to find out what it actually is.
     *  This function "cleans" this output, separating, collecting and collating vertices and edges in an easy to access way.
     *      It can also collect other generic output or ignore it.
     *  The output of this function can be used e.g. with the `vertexSetToDataFrame()` and `edgeSetToDataFrame()` functions or
     *      (after some transformation) to pass a subgraph to a visualisation component.
     */
    parseQueryOutput(output, graphOnly=true) {

    	function attCopy(src, trg) {
    		let srca = src["attributes"];
    		let trga = trg["attributes"];
    		for (let att in srca) {
    			trga[att] = srca[att];
    		};
    	}

    	function addOccurrences(obj, src) {
    		if (obj.hasOwnProperty("x_occurrences")) {
    			obj["x_occurrences"] = obj["x_occurrences"] + 1;
    		} else {
    			obj["x_occurrences"] = 1;
    		}
    		if (obj.hasOwnProperty("x_sources")) {
    			obj["x_sources"].push(src);
    		} else {
    			obj["x_sources"] = [src];
    		}
    	}

        let vs = {};
        let es = {};
        let ou = [];

        // Outermost data type is an array
        for (let o1 in output) {
        	let _o1 = output[o1];
            // Next level data type is an object with one or more properties that could be vertex sets, edge sets or generic output (of simple or complex data types)
            for (let o2 in _o1) {
            	let _o2 = _o1[o2];
            	if (Array.isArray(_o2)) { // Is it an array?
	            	for(let o3 in _o2) { // Iterate through the array
	            		let _o3 = _o2[o3];
	            		if (_o3.hasOwnProperty("v_type")) { // It's a vertex!

	            			// Handle vertex type first
	                		let vType = _o3["v_type"];
	                		let vtm;
	                		if (vs.hasOwnProperty(vType)) { // Do we have this type of vertices in our list (which is an object, really)?
	                			// Yes, get it (a Map)
	                			vtm = vs[vType];
	                		} else {
	                			// No, let's create a Map for them and add to the list
	                			vtm = new Map();
	                			vs[vType] = vtm;
	                		}

	                		// Then handle the vertex itself
		                	let vId = _o3["v_id"];
		                	if (vtm.has(vId)) { // Do we have this specific vertex (identified by the ID) in our list?
		                		// Yes, update it
		                		let tmp = vtm.get(vId);
		                		attCopy(_o3, tmp);
		                		addOccurrences(tmp, o2);
		                	} else {
		                		// No, add it
		                		addOccurrences(_o3, o2);
		                		vtm.set(vId, _o3);
		                	}

	            		} else if (_o3.hasOwnProperty("e_type")) { // It's an edge!

	            			// Handle edge type first
	                		let eType = _o3["e_type"];
	                		let etm;
	                		if (es.hasOwnProperty(eType)) { // Do we have this type of edges in our list (which is an object, really)?
	                			// Yes, get it (a Map)
	                			etm = es[eType];
	                		} else {
	                			// No, let's create a Map for them and add to the list
	                			etm = new Map();
	                			es[eType] = etm;
	                		}

	                		// Then handle the edge itself
    	                	let eId = _o3["from_type"] + "(" + _o3["from_id"] + ")->" + _o3["to_type"] + "(" + _o3["to_id"] + ")";
    	                	_o3["e_id"] = eId;

    	                	// Add reverse edge name, if applicable
    	                	if (this.isDirected(eType)) {
    	                		let rev = this.getReverseEdge(eType);
    	                		if (rev) {
    	                			_o3["reverse_edge"] = rev;
    	                		}
    	                	}
    	                	if (etm.has(eId)) { // Do we have this specific edge (identified by the composite ID) in our list?
    	                		let tmp = etm.get(eId);
    	                		attCopy(_o3, tmp);
    	                		addOccurrences(tmp, o2);
    	                	} else {
    	                		// No, add it
    	                		addOccurrences(_o3, o2);
    	                		etm.set(eId, _o3);
    	                	}

	            		} else { // It's a ... something else
	                    	ou.push({"label": o2, "value": _o2});
	            		}
	            	}
            	} else { // It's a ... something else.
                	ou.push({"label": o2, "value": _o2});
            	}
            }
        }
        // Converting maps to arrays
        for (let vm in vs) {
        	vs[vm] = Array.from(vs[vm].values());
        }
        for (let em in es) {
        	es[em] = Array.from(es[em].values());
        }
        // Putting all together
        let ret = {"Vertices": vs, "Edges": es};
        if (! graphOnly) {
            ret["Output"] = ou;
        }
        if (this.debug) {
        	console.log(ret);
        }
        return ret;
    }

    // Token management =========================================================

    getToken(secret, setToken = true, lifetime = null) {
        this.xhr.open("GET", this.restppUrl + "/requesttoken?secret=" + secret + (lifetime ? "&lifetime=" + lifetime.toString() : ""), false);
        this.xhr.send();
        let res = JSON.parse(this.xhr.responseText);
        if (! res["error"]) {
            if (setToken) {
                this.apiToken = res["token"];
                this.authHeader = {'Authorization': "Bearer " + this.apiToken};
            }
            return {token: res["token"], expiration: res["expiration"], expiration_datetime: (new Date(res["expiration"] * 1000)).toISOString()};
        }
        if (res["message"].search("Endpoint is not found from url = /requesttoken") !== -1) {
            throw new TigroidException("REST++ authentication is not enabled, can't generate token.", null);
        }
        throw new TigroidException(res["message"], "code" in res ? res["code"] : null);
    }

    refreshToken(secret, token = null, lifetime = 2592000) {
        if (! token) {
            token = this.apiToken;
        }
        this.xhr.open("PUT", this.restppUrl + "/requesttoken?secret=" + secret + "&token=" + token + (lifetime ? "&lifetime=" + lifetime.toString() : ""), false);
        this.xhr.send();
        let res = JSON.parse(this.xhr.responseText);
        if (! res["error"]) {
            let exp = Date.now() + res["expiration"]
            return {token: res["token"], expiration: Number.parseInt(exp), expiration_datetime: (new Date(exp * 1000)).toISOString()};
        }
        if (res["message"].search("Endpoint is not found from url = /requesttoken") !== -1) {
            throw new TigroidException("REST++ authentication is not enabled, can't refresh token.", null);
        }
        throw new TigroidException(res["message"], "code" in res ? res["code"] : null);
    }

    deleteToken(secret, token = null, skipNA = true) {
        if (! token) {
            token = this.apiToken;
        }
        this.xhr.open("DELETE", this.restppUrl + "/requesttoken?secret=" + secret + "&token=" + token, false);
        this.xhr.send();
        let res = JSON.parse(this.xhr.responseText);
        if (! res["error"]) {
            return true;
        }
        if (res["code"] === "REST-3300" && skipNA) {
            return true;
        }
        if (res["message"].search("Endpoint is not found from url = /requesttoken") !== -1) {
            throw new TigroidException("REST++ authentication is not enabled, can't delete token.", null);
        }
        throw new TigroidException(res["message"], "code" in res ? res["code"] : null);
    }

    // Other functions ==========================================================

    echo() {
        return this._get({url: this.restppUrl + "/echo/" + this.graphname, resKey: "message"});
    }

    getEndpoints(builtins = false, dynamics = false, statics = false) {
        let ret = {};
        let bui, dyn, sta;
        if (! builtins && ! dynamics && ! statics) {
            bui = dyn = sta = true;
        }
        else {
            bui = builtins;
            dyn = dynamics;
            sta = statics;
        }
        let url = this.restppUrl + "/endpoints/" + this.graphname + "?";
        if (bui) {
            let eps = {};
            let res = this._get({url: url + "builtin=true", resKey: null})
            for (const ep in res) {
                if (ep.search(/ \/graph\//) === -1 || ep.search(/ \/graph\/{graph_name}\//) !== -1) {
                    eps[ep] = res[ep];
                }
            }
            ret = Object.assign(ret, eps);
        }
        if (dyn) {
            let pattern = new RegExp("^GET \/query\/" + this.graphname);
            let eps = {}
            let res = this._get({url: url + "dynamic=true", resKey: null})
            for (let ep in res) {
                if (ep.search(pattern) !== -1) {
                    eps[ep] = res[ep];
                }
            }
            ret = Object.assign(ret, eps);
        }
        if (sta) {
            ret = Object.assign(ret, this._get({url: url + "static=true", resKey: null}))
        }
        return ret;
    }

    // TODO: getInstalledQueries

    getStatistics(seconds = 10, segment = 10) {
        if (! seconds || typeof seconds !== "number") {
            seconds = 10;
        } else {
            seconds = Math.max(Math.min(seconds, 0), 60);
        }
        if (! segment || typeof segment !== "number") {
            segment = 10;
        } else {
            segment = Math.max(Math.min(segment, 0), 100);
        }
        return this._get({url: this.restppUrl + "/statistics/" + this.graphname + "?seconds=" + seconds.toString() + "&segment=" + segment.toString(), resKey: null});
    }

    getVersion() {
        this.xhr.open("GET", this.restppUrl + "/version/" + this.graphname, false);
        // TODO: this.xhr.setRequestHeader("Authorization", "Bearer " + this.apiToken);
        this.xhr.send();
        let res = this.xhr.responseText;
        res = res.substring(res.search("TigerGraph RESTPP"),res.search("\"}")).split(/\n/);
        let components = [];
        for (let i = 3; i < res.length - 1; i++) {
            let m =  res[i].split(/ +/);
            let component = {name: m[0], version: m[1], hash: m[2], datetime: m[3] + " " + m[4] + " " + m[5]};
            components.push(component);
        }
        return components;
    }

    getVer(component = "product", full = false) {
        let ret = "";
        let components = this.getVersion();
        for (let i = 0; i < components.length; i++) {
            let v = components[i];
            if (v["name"] === component) {
                ret = v["version"];
            }
        }
        if (ret) {
            if (full) {
                return ret;
            }
            return ret.substring(ret.indexOf("_") + 1, ret.lastIndexOf("_"));
        } else {
            throw new TigroidException("\"" + component + "\" is not a valid component.", null);
        }
    }

    getLicenseInfo() {
        let res = this._get({url: this.restppUrl + "/showlicenseinfo", resKey: null, skipCheck: true});
        let ret = {};
        if (! res["error"]) {
            ret["message"] = res["message"];
            ret["expirationDate"] = res["results"][0]["Expiration date"];
            ret["daysRemaining"] = res["results"][0]["Days remaining"];
        } else if ("code" in res && res["code"] === "REST-5000") {
            ret["message"] = "This instance does not have a valid enterprise license. Is this a trial version?";
            ret["daysRemaining"] = -1;
        } else {
            throw new TigroidException(res["message"], res["code]"]);
        }
        return ret
    }

    // ==========================================================================

    constructor({host = "http://localhost", graphname = "MyGraph", username = "tigergraph", password = "tigergraph", restppPort = "9000", gsPort = "14240", apiToken = "", debug = false}) {
        this.host       = host;
        this.graphname  = graphname;
        this.username   = username;
        this.password   = password;
        this.restppPort = restppPort;
        this.restppUrl  = this.host + ":" + this.restppPort;
        this.gsPort     = gsPort.toString();
        this.gsUrl      = this.host + ":" + this.gsPort;
        this.apiToken   = apiToken;
        this.authHeader = {"Authorization": "Bearer " + this.apiToken};
        this.debug      = debug;
        this.schema     = null;
        this.ttkGetEF   = null;

        if (window.XMLHttpRequest) {
            this.xhr = new XMLHttpRequest();
        } else {
            this.xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }
    }
}
