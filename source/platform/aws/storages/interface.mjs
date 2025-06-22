"use strict";

export default class Storages {
    constructor() {
        /// Ensure all methods are implemented
        this.#enforce("get", "function");
    }

    #enforce(method, type){ if(typeof this[method] != type) { throw new Error(`${ method } ${ type } must be implemented.`); } }
}