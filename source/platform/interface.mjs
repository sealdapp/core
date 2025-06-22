"use strict";

export default class Platforms {

    constructor() {
        /// Ensure all methods are implemented
        this.#enforce("init", "function");
    }

    #enforce(method, type){ if(typeof this[method] != type) { throw new Error(`${ method } ${ type } must be implemented.`); } }
}