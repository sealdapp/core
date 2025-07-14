"use strict";

import Helper from "./Helper.mjs";

export default class Response {

    static Base = class {

        constructor({ statusCode = 500, headers = {}, body = {} }){

            this.statusCode = Helper.validate(statusCode, "number");
            this.headers = Helper.validate(headers, "object");
            this.body = JSON.stringify(Helper.validate(body, "object"));
        }
    }

    static Auth = class {

        static Signin = class extends Response.Base {

            constructor({ cookies = [] }) {
                super({ ...arguments[0] });
                
                this.cookies = Helper.validate(cookies, "array");
            }
        }

        static Verify = class {
            constructor({ isAuthorized = false, context = {} }) {

                this.isAuthorized = Helper.validate(isAuthorized, "boolean");
                this.context = Helper.validate(context, "object");
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