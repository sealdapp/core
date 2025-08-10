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
    if(validate.Property.isExistsKey(process.env, "ROOT_USER").result == false) throw new Error("ROOT_USER not configured.");
    
    /// Validate if s3 bucket is defined
    if(validate.Property.isExistsKey(process.env, "STORAGE_BUCKET_PRIVATE").result == false) throw new Error("STORAGE_BUCKET_PRIVATE is not defined.");
    
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

        logger.debug(`Get recovery key request received.`);

        /// Ensure user is root
        if(token.root == false) return new schema.Response.Keys.Get.Recovery({
            statusCode : 401,
            body : { message : "You are not authorized." }
        })

        /// Get recovery key
        const recovery_key = await storage.private.getObject(`root/recovery-key.json`);

        /// Ensure retrieval of recovery key is successful
        if(recovery_key.success == false) throw recovery_key.error;

        /// Return empty recovery-key if not yet setup
        if(recovery_key.exists == false) return new schema.Response.Keys.Get.Recovery({
            statusCode : 404,
            body : { message : "Key not found." }
        })

        /// Parse recovery key if it exists
        const key_value = await utils.Parser.bufferToJson(recovery_key.data);

        /// Ensure parsing of recovery key value is successful
        if(key_value.success == false) throw key_value.error;

        /// Try to load key
        let keyObject;

        /// Try to load key to model
        try { keyObject = new schema.Keys.Recovery(key_value.data.json); }

        /// Capture if the key is malfromed
        catch(e) { 
            logger.error(`Key could not be loaded. ${ e.stack }`);

            throw new Error("Malformed key.") 
        }

        logger.info(`Returning recovery key to root user.`);

        return new schema.Response.Keys.Get.Recovery({
            statusCode : 200,
            body : { key : keyObject }
        })
    })
}