"use strict";

import Helper from "./Helper.mjs";
import Permissions from "./Permissions.mjs";

export default class Roles {

    constructor({ name = "guest", permissions = {} }) {

        this.name = Helper.validate(name, "string");
        this.permissions = new Permissions(permissions)

    }

}