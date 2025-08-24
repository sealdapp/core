"use strict";

import Validator from "../common/validator.mjs";

/// Import subset schema
import Keys from "./Keys.mjs"
import Roles from "./Roles.mjs"

export default class Request {

    static Token = class {
        
        constructor({ auth_type, user_id, username, role, iat, exp, iss }) {

            const validate = new Validator();
            
            if(validate.String.isEmpty(auth_type).result == true) throw new Error("Invalid auth_type");
            
            if(validate.String.isEmpty(user_id).result == true) throw new Error("Invalid user_id");
            
            if(validate.String.isEmpty(username).result == true) throw new Error("Invalid username");
            
            if(validate.Type.isObject(role).result != true) throw new Error("Invalid role");
            
            if(validate.Type.isNumber(iat).result != true) throw new Error("Invalid iat");
            
            if(validate.Type.isNumber(exp).result != true) throw new Error("Invalid exp");
            
            if(validate.String.isEmpty(iss).result == true) throw new Error("Invalid iss");

            this.auth_type = auth_type;
            this.user_id = user_id;
            this.username = username;
            this.iat = iat;
            this.exp = exp;
            this.iss = iss;
            this.role = new Roles(role);
        }
    }

    static Keys = class {

        static Init = class {

            constructor({ master_key, recovery_key, root_key, token }){

                const validate = new Validator();

                if(validate.Type.isObject(recovery_key).result != true) throw new Error("Missing recovery_key.")

                if(validate.Type.isObject(master_key).result != true) throw new Error("Missing master_key.")

                if(validate.Type.isObject(root_key).result != true) throw new Error("Missing root_key.")

                /// Extract metadata information from token
                let metadata = {
                    issuer : token.user_id,
                    issuedFor : token.iss,
                    role : token.role.name
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

                if(validate.Type.isObject(master_key).result != true) throw new Error("Missing master_key.")

                if(validate.Type.isObject(root_key).result != true) throw new Error("Missing root_key.")

                /// Extract metadata information from token
                let metadata = {
                    issuer : token.username,
                    issuedFor : token.iss,
                    role : token.role.name
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

    static Folders = class {

        static Activate = class {
            
            constructor({ type = "" }) {
                const validate = new Validator();
                
                /// Ensure folder type is supplied
                if(validate.String.isNotEmpty(type).result != true) throw new Error("Missing folder type.")

                /// Ensure folder type is valid
                if(validate.List.isStringInside([
                    "files",
                    "gallery"
                ], type).result != true) throw new Error("Invalid folder type.")
                
                this.type = type.toLocaleLowerCase();
            }

        }

        static Create = class {

            constructor({ id = "", type = "", properties = "", folderKey = {}, authorized_keys = [], token }) {

                const validate = new Validator();

                const expected_authorized_keys = [
                    "root.userKey.rsa.public"
                ];
                
                let actual_authorized_keys = [];

                /// Ensure folder id is supplied
                if(validate.String.isNotEmpty(id).result != true) throw new Error("Missing folder id.")

                /// Ensure folder type is supplied
                if(validate.String.isNotEmpty(type).result != true) throw new Error("Missing folder type.")

                /// Ensure folder type is valid
                if(validate.List.isStringInside([
                    "files",
                    "gallery"
                ], type).result != true) throw new Error("Invalid folder type.")

                /// Ensure properties is supplied
                if(validate.String.isNotEmpty(properties).result != true) throw new Error("Missing folder properties.")

                /// Ensure folderKey are supplied
                if(validate.Type.isObject(folderKey).result != true) throw new Error("Missing folder key.")

                /// Ensure keys are supplied
                if(validate.Type.isArray(authorized_keys).result != true) throw new Error("Missing authorized keys.")

                /// Extract metadata information from token
                let metadata = {
                    issuer : token.username,
                    issuedFor : token.iss
                }

                /// Inject metadata information to key
                folderKey.metadata = metadata;

                /// Store authorized key materials
                let authorized_key_materials = [];

                /// Inject metadata information to keys and transform to key material
                /// Extract built in keys only with optional of actual creator
                for(const key of authorized_keys){

                    key.metadata = metadata;

                    const key_material = new Keys.Folder(key);

                    actual_authorized_keys.push(key_material.keys.aes.wrapper);
                    authorized_key_materials.push(key_material)

                    /// Ensure wrapper information is in correct format
                    if(/^\S+\.userKey\.rsa\.public$/.test(key_material.keys.aes.wrapper) != true) throw new Error("Invalid wrapper name format.")
                }
                
                /// Ensure expected builtins are inside the actual authorized keys
                if(expected_authorized_keys.every(item => actual_authorized_keys.includes(item)) != true) throw new Error("Missing built in authorized keys");

                this.id = id.toLocaleLowerCase();
                this.type = type.toLocaleLowerCase();
                this.properties = properties;
                this.folderKey = new Keys.Folder(folderKey);
                this.authorized_keys = authorized_key_materials;
                
                /// Ensure folder key is wrapped with master key
                if(this.folderKey.keys.aes.wrapper != "masterKey.rsa.public") throw new Error("Invalid folder key.")
            }
        }
    }
}