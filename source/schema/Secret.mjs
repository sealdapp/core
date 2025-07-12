"use strict";

import Helper from "./Helper.mjs";

export default class Secret {

    constructor({ name = "", value = "", exists = false, lastModified = 0 }) {

        this.name = Helper.validate(name, "string")
        this.value = Helper.validate(value, "string")
        this.exists = Helper.validate(exists, "boolean")
        this.lastModified = Helper.validate(lastModified, "number")

    }
}