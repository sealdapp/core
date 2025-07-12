"use strict";

import Helper from "./Helper.mjs";

export default class Validation {

    constructor({ success = false, result = false, error = null }) {

        this.success = Helper.validate(success, "boolean");
        this.result = Helper.validate(result, "boolean");
        this.error = Helper.setError(success, error);
    }
}