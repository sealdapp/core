"use strict";

/// Import native libraries
import path from 'path';

/// Import application common libraries
import Schema from "./schema/Schema.mjs";
import Logger from "./common/logger.mjs";
import Validator from "./common/validator.mjs";
import Utilities from "./common/utils.mjs";
import Middleware from "./common/middleware.mjs";
import Platform from "./platform/platform.mjs";
import { error } from 'console';

/// Initialize libraries
const logger = new Logger(path); 
const schema = new Schema();
const validate = new Validator(schema, logger);
const utils = new Utilities(schema, logger, validate);
const middleware = new Middleware(schema, logger, validate, utils);
const platform = new Platform(schema, logger, validate);

/// Declaration of plugins
let storage = {};

let cache = {
    master_public_key : {},
    root_public_key : {}
};

await (async function init(){

    logger.info("Initializing application...");

    /// Ensure root user email is defined
    if(validate.Property.isExistsKey(process.env, "ROOT_USER").result != true) throw new Error("ROOT_USER not configured.");
    
    /// Validate if s3 bucket is defined
    if(validate.Property.isExistsKey(process.env, "STORAGE_BUCKET_PRIVATE").result != true) throw new Error("STORAGE_BUCKET_PRIVATE is not defined.");
    
    /// Load all the plugins for the platform
    const plugins = await platform.load();
    
    /// Storage library
    storage.private = new plugins.Storage(schema, logger, validate);
    
    /// Initialize key storage plugin instance
    await middleware.Initializer.initialize(await storage.private.init(process.env.STORAGE_BUCKET_PRIVATE));

    logger.info(`Application successfully initialized.`)

})()

async function getKeys(){

    /// Get master public key if value is not set
    if(!cache.master_public_key.value) {

        /// Try to load key
        let keyObject;

        /// Get master key
        const master_key = await storage.private.getObject(`system/keys/master-key.json`);

        /// Ensure retrieval of master key is successful
        if(master_key.success != true) throw master_key.error;

        /// Return empty master-key if not yet setup
        if(master_key.exists != true) throw new Error("Master public key not found.")

        /// Parse master key if it exists
        const key_value = await utils.Parser.bufferToJson(master_key.data);

        /// Ensure parsing of master key value is successful
        if(key_value.success != true) throw key_value.error;

        /// Try to load key to model
        try { keyObject = new schema.Keys.Master(key_value.data.json); }

        /// Capture if the key is malfromed
        catch(e) { 
            logger.error(`Key could not be loaded. ${ e.stack }`);

            throw new Error("Malformed key.") 
        }

        cache.master_public_key = keyObject.keys.rsa.publicKey;
    }
    
    if(!cache.root_public_key.value) {

        let keyObject;

        /// Get root user key json file
        const user_key = await storage.private.getObject(`system/users/registered/root/user-key.json`);

        /// Ensure retrieval of user key is successful
        if(user_key.success != true) throw user_key.error;

        /// Return empty user-key if not yet setup
        if(user_key.exists != true) throw new Error("Root public key not found.")

        /// Parse user key if it exists
        const key_value = await utils.Parser.bufferToJson(user_key.data);

        /// Ensure parsing of user key value is successful
        if(key_value.success != true) throw key_value.error;

        /// Try to load key to model
        try { keyObject = new schema.Keys.User(key_value.data.json); }

        /// Capture if the key is malfromed
        catch(e) { 
            logger.error(`Key could not be loaded. ${ e.stack }`);

            throw new Error("Malformed key.") 
        }

        cache.root_public_key = keyObject.keys.rsa.publicKey;
    }

    return new schema.Operation({
        success : true,
        data : {
            master_public_key : cache.master_public_key,
            root_public_key : cache.root_public_key
        }
    })
}

export const handler = async(event) => {

    return await middleware.Handler.main(event, async function({ token, body }){

        logger.debug(`Get folder encryptiont keys received.`);

        /// Ensure folder type is supplied
        if(validate.Property.isExistsKey(body, "type").result != true) return new schema.Response.Keys.Builtin({
            statusCode : 400,
            body : { message : "Missing folder type." }
        })

        /// Ensure folder type is valid
        if(validate.List.isStringInside([
            "files",
            "gallery"
        ], body.type).result != true) throw new schema.Response.Keys.Builtin({
            statusCode : 400,
            body : { message : "Invalid folder type." }
        })

        /// Ensure user has permission to create folder
        if(token.role.permissions.vault[body.type].add != true)  return new schema.Response.Keys.Builtin({
            statusCode : 401,
            body : { message : "You are not authorized to create new folder." }
        })

        let public_keys = await getKeys();

        /// Ensure retrieval of public keys is successful
        if(public_keys.success != true) throw new Error("Could not retrieve public keys.")

        return new schema.Response.Keys.Builtin({
            statusCode : 200,
            body : { 
                master : public_keys.data.master_public_key,
                root : public_keys.data.root_public_key
            }
        })
    })
}