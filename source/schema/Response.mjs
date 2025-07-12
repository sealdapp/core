"use strict";

import Helper from "./Helper.mjs";

export default class Response {

    static Base = class {

        constructor({ success = false, code = 500, body = {}, message = "" }){

            this.success = Helper.validate(success, "boolean");
            this.code = Helper.validate(code, "number");
            this.message = Helper.validate(message, "string");
            this.body = Helper.validate(body, "object");
        }
    }

    static Auth = class {

        static Signin = class extends Response.Base {

            constructor() {
                super({ ...arguments[0] });
                
            }
        }
    }

    static Keys = class {

        static Get = class extends Response.Base {

            constructor({ keys = [], root = false }) {
                super({ ...arguments[0] });

                this.body = JSON.stringify({ 
                    keys : keys,
                    count : keys.length,
                    root : root
                });
            }
        }
    }
}