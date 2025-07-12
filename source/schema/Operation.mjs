"use strict";

import Helper from "./Helper.mjs";

export default class Operation {

    constructor({ success = false, data = {}, error = null }){

        this.success = Helper.validate(success, "boolean");
        this.data = Helper.validate(data, "object");
        this.error = Helper.setError(success, error);
    }
}