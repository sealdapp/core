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

/// Initialize libraries
const logger = new Logger(path); 
const schema = new Schema();
const validate = new Validator(schema, logger);
const utils = new Utilities(schema, logger, validate);
const middleware = new Middleware(schema, logger, validate, utils);
const platform = new Platform(schema, logger, validate);

/// Declaration of plugins
let storage = {};

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

export const handler = async(event) => {

    return await middleware.Handler.main(event, async function({ token, body }){

        logger.debug(`Get key request received.`);

        /// Specify path of user key
        let user_key_path;

        /// Set user key path to root user
        if(token.role.name === "root") { user_key_path = `system/users/registered/root/user-key.json`; }

        /// Set user key path to user
        else { user_key_path = `system/users/registered/${ token.auth_type }/${ token.user_id }/user-key.json` }

        /// Get user key
        const user_key = await storage.private.getObject(user_key_path);

        /// Ensure retrieval of user key is successful
        if(user_key.success != true) throw user_key.error;

        /// Return empty user-key if not yet setup
        if(user_key.exists != true) return new schema.Response.Keys.Get.User({
            statusCode : 404,
            body : { message : "Key not found." }
        })

        /// Parse user key if it exists
        const key_value = await utils.Parser.bufferToJson(user_key.data);

        /// Ensure parsing of user key value is successful
        if(key_value.success != true) throw key_value.error;

        /// Try to load key
        let keyObject;

        /// Try to load key to model
        try { keyObject = new schema.Keys.User(key_value.data.json); }

        /// Capture if the key is malfromed
        catch(e) { 
            logger.error(`Key could not be loaded. ${ e.stack }`);

            throw new Error("Malformed key.") 
        }

        logger.info(`Returning user key to requester.`)

        return new schema.Response.Keys.Get.User({
            statusCode : 200,
            body : { key : keyObject }
        })
    })
}