"use strict";

import Helper from "./Helper.mjs";

export default class Authentication {

    static SignIn = class {

        constructor({ success = false, error = null, authenticated = false, authorized = false, retry = false, token = null }) {

            this.success = Helper.validate(success, "boolean");
            this.authenticated = Helper.validate(authenticated, "boolean");
            this.authorized = Helper.validate(authorized, "boolean");
            this.retry = Helper.validate(retry, "boolean");
            this.error = Helper.setError(success, error);

            /// Expect token to be in string format if sign in returns authenticated and authorized
            if(this.authenticated && this.authorized) this.token = Helper.validate(token, "string");
        }
    }

    static Token = class {

        static Payload = class {
            constructor({ user_id = "", username = "", root = false } = {}) {
                this.user_id = Helper.validate(user_id, "string");
                this.username = Helper.validate(username, "string");
                this.root = Helper.validate(root, "boolean");
            }
        }
    }
}