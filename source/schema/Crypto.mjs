"use strict";

import Helper from "./Helper.mjs";

export default class Crypto {

    static Base = class {

        constructor({ success = false, error = null }){
            this.success = Helper.validate(success, "boolean");
            this.error = Helper.setError(success, error);
        }
    }

    static Create = class {

        static RSA = class extends Crypto.Base {

            constructor({ keys = {} }) {
                super({ ...arguments[0] });

                this.privateKey = null;
                this.publicKey = null;

                if(this.success) {
                    
                    this.privateKey = Helper.validate(keys.privateKey, "cryptokey")
                    this.publicKey = Helper.validate(keys.publicKey, "cryptokey")
                }
            }
        }
    }

    static Export = class {
        static RSA = class extends Crypto.Base {

            constructor({ key = null, format = "raw" }) {
                super({ ...arguments[0] });


                if(this.success) {
                    switch (format) {
                        /// Ensure that the value is an array buffer if the key was exported as raw
                        case "raw" : this.key = Helper.validate(key, "arraybuffer"); break;

                        /// Ensure that the value is string if in PEM format
                        case "pem" : this.key = Helper.validate(key, "string"); break;

                        default : this.key = null; break;
                    }
                }
            }
        }
    }
}