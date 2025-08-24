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

    static Activate = class {

        static Main = class extends Response.Base {
            constructor({ }) {
                super({ ...arguments[0] });

            }
        }
    }

    static Keys = class {

        static Recover = class extends Response.Base {

            constructor({ }) {
                super({ ...arguments[0] });

            }
        }

        static Get = class {

            static User = class extends Response.Base {
                constructor({ }) {
                    super({ ...arguments[0] });
                }
            }

            static Recovery = class extends Response.Base {
                constructor({ }) {
                    super({ ...arguments[0] });
                }
            }

            static Master = class extends Response.Base {
                constructor({ }) {
                    super({ ...arguments[0] });
                }
            }
        }

        static Builtin = class extends Response.Base {
            
            constructor({ }) {
                super({ ...arguments[0] });
            }
        }


    }

    static Folders = class {

        static Activate = class extends Response.Base {

            constructor({ id = "" }) {
                super({ ...arguments[0] });
            }
        }

        static Create = class extends Response.Base {

            constructor({ id = "" }) {
                super({ ...arguments[0] });
            }
        }
    }
}