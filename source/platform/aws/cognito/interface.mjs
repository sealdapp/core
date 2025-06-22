"use strict";

export default class Authenticators {
    constructor() {
        /// Ensure all methods are implemented
        this.#enforce("signin", "function");
        this.#enforce("verify", "function");
        this.#enforce("register", "function");
        this.#enforce("delete", "function");
    }

    #enforce(method, type){ if(typeof this[method] != type) { throw new Error(`${ method } ${ type } must be implemented.`); } }
}