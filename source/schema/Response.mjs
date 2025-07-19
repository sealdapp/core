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

        static Get = class extends Response.Base {

            constructor({ device = null, master = null, root = false }) {
                super({ ...arguments[0] });

                /// Include master key if requester is root
                if(root) {
                    this.body = JSON.stringify({ 
                        keys : {  device, master },
                        root : root
                    });
                }

                /// Otherwise, return device key only
                else{
                    this.body = JSON.stringify({ 
                        keys : {  device },
                        root : root
                    });
                }
            }
        }
    }
}