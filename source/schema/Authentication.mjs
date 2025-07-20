"use strict";

import Helper from "./Helper.mjs";

export default class Authentication {

    static SignIn = class {

        constructor({ success = false, error = null, authenticated = false, username = "", userid = "", retry = false }) {

            this.success = Helper.validate(success, "boolean");
            this.error = Helper.setError(success, error);
            this.authenticated = Helper.validate(authenticated, "boolean");
            this.username = Helper.validate(username, "string");
            this.userid = Helper.validate(userid, "string");

            /// Flag to inform client whether it is advised to retry sign in
            this.retry - Helper.validate(retry, "boolean");
        }
    }

    static Token = class {

        static Payload = class {
            constructor({ auth_type = "", user_id = "", username = "", root = false } = {}) {
                this.auth_type = Helper.validate(auth_type, "string");
                this.user_id = Helper.validate(user_id, "string");
                this.username = Helper.validate(username, "string");
                this.root = Helper.validate(root, "boolean");
            }
        }
    }
}