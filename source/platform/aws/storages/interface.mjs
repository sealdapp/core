"use strict";

export default class Storages {
    constructor() {
        /// Ensure all methods are implemented
        this.#enforce("init", "function");
        this.#enforce("headObject", "function");
        this.#enforce("getObject", "function");
    }

    #enforce(method, type){ if(typeof this[method] != type) { throw new Error(`${ method } ${ type } must be implemented.`); } }
}