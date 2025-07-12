"use strict";

import Helper from "./Helper.mjs";

export default class Fetch {

    static Base = class {

        constructor({ success = false, code = 500, data = {}, error = null }){

            this.success = Helper.validate(success, "boolean");
            this.code = Helper.validate(code, "number")
            this.error = Helper.setError(success, error);

            if(success) this.data = Helper.validate(data, "response");
        }
    }

    static Get = class extends Fetch.Base {

        constructor({ }) {
            super({ ...arguments[0] });
        }
    }
}