"use strict";

import Validator from "../common/validator.mjs";

/// Import subset schema
import Keys from "./Keys.mjs"

export default class Request {

    static Token = class {
        
        constructor({ auth_type, user_id, username, root, iat, exp, iss }) {

            const validate = new Validator();
            
            if(validate.String.isEmpty(auth_type).result == true) throw new Error("Invalid auth_type");
            
            if(validate.String.isEmpty(user_id).result == true) throw new Error("Invalid user_id");
            
            if(validate.String.isEmpty(username).result == true) throw new Error("Invalid username");
            
            if(validate.Type.isBoolean(root).result == false) throw new Error("Invalid root");
            
            if(validate.Type.isNumber(iat).result == false) throw new Error("Invalid iat");
            
            if(validate.Type.isNumber(exp).result == false) throw new Error("Invalid exp");
            
            if(validate.String.isEmpty(iss).result == true) throw new Error("Invalid iss");

            Object.assign(this, { ...arguments[0] })
        }
    }

    static Keys = class {

        static Init = class {

            constructor({ master_key, recovery_key, root_key, token }){

                const validate = new Validator();

                if(validate.Type.isObject(recovery_key).result == false) throw new Error("Missing recovery_key.")

                if(validate.Type.isObject(master_key).result == false) throw new Error("Missing master_key.")

                if(validate.Type.isObject(root_key).result == false) throw new Error("Missing root_key.")

                /// Extract metadata information from token
                let metadata = {
                    issuer : token.username,
                    issuedFor : token.iss,
                    root : token.root
                }

                /// Inject metadata information to keys
                recovery_key.metadata = metadata;
                master_key.metadata = metadata;
                root_key.metadata = metadata;

                /// Create new instance of Keys
                this.recovery_key = new Keys.Recovery(recovery_key);
                this.master_key = new Keys.Master(master_key);
                this.root_key = new Keys.User(root_key);
            }
        }

        static Recover = class {

            constructor({ master_key, root_key, token }){

                const validate = new Validator();

                if(validate.Type.isObject(master_key).result == false) throw new Error("Missing master_key.")

                if(validate.Type.isObject(root_key).result == false) throw new Error("Missing root_key.")

                /// Extract metadata information from token
                let metadata = {
                    issuer : token.username,
                    issuedFor : token.iss,
                    root : token.root
                }

                /// Inject metadata information to keys
                master_key.metadata = metadata;
                root_key.metadata = metadata;

                /// Create new instance of Keys
                this.master_key = new Keys.Master(master_key);
                this.root_key = new Keys.User(root_key);
            }
        }
    }
}