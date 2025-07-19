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

/// Storage path prefix
const KEYS_PATH_PREFIX = "keys";

await (async function init(){

    logger.info("Initializing application...");

    /// Ensure root user email is defined
    if(validate.Property.isExistsKey(process.env, "ROOT_USER").result == false) throw new Error("ROOT_USER not configured.");
    
    /// Load all the plugins for the platform
    let plugins = await platform.load();
    
    /// Storage library
    storage.private = new plugins.Storage(schema, logger, validate);
    
    /// Initialize key storage plugin instance
    await middleware.Initializer.initialize(await storage.private.init(process.env.STORAGE_BUCKET_PRIVATE));

    logger.info(`Application successfully initialized.`)

})()

export const handler = async(event) => {

    try {

        logger.debug(`Get key request received.`);

        /// Get user information from cookie
        let token = await middleware.Handler.token(event);

        console.log(token)

        /// Return bad request if token information extraction failed
        if(token.success == false) return new schema.Response.Keys.Get({
            statusCode : 400,
            body : {
                message : "Bad request"
            }
        })

        /// Check if root user
        if(token.data.decoded.root) {

            /// Get root device key
            let root_key = await storage.private.getObject(`${ KEYS_PATH_PREFIX }/root/keys.json`);

            /// Ensure retrieval of rootkey is successful
            if(root_key.success == false) throw root_key.error;

            console.log(root_key)
            /// Get master key
        }

        /// Otherwise, get keys for user
        else{

            /// Get user device key
            let user_key = await storage.private.getObject(`${ KEYS_PATH_PREFIX }/users/${ token.data.decoded.user_id }`);

            /// Ensure retrieval of user key is successful
            if(user_key.success == false) throw user_key.error;

            /// Return empty if device key doesn't exists
            if(user_key.exists == false) return new schema.Response.Keys.Get({
                statusCode : 200,
                device : new schema.Keys.Device({}),
                root : false,
            });
        }
        

        return new schema.Response.Keys.Get({
            statusCode : 200
        })
    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)

        return new schema.Response.Keys.Get({
            body : {
                message : e.message 
            }
        })
    }
}