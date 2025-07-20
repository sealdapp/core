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

    static Jobs = class extends Response.Base {

        constructor() {
            super({ ...arguments[0] });
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

        static Init = class extends Response.Base {

            constructor({ body = {} }) {
                super({ ...arguments[0] });

            }
        }

        static Get = class extends Response.Base {

            constructor({ body = {}, device = null, master = null, root = false }) {
                super({ ...arguments[0] });

                /// Set default body value
                this.body = body;

                /// Insert root value inside body
                this.body.root = root;
                
                /// Insert device key and master key if root
                if(root) this.body.keys = { device, master };

                /// Insert device key only if non-root
                else this.body.keys = { device };

                this.body = JSON.stringify(this.body);
            }
        }


    }
}