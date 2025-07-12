"use strict";

export default class Secrets {
    constructor() {
        /// Ensure all methods are implemented
        this.#enforce("init", "function");
        this.#enforce("get", "function");
        this.#enforce("set", "function");
    }

    #enforce(method, type){ if(typeof this[method] != type) { throw new Error(`${ method } ${ type } must be implemented.`); } }
}