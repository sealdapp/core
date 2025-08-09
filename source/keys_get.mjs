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

    try {

        logger.debug(`Get key request received.`);

        /// Get user information from cookie
        const token = await middleware.Handler.token(event);

        /// Return bad request if token information extraction failed
        if(token.success == false) return new schema.Response.Keys.Get({
            statusCode : 400,
            body : {
                message : "Bad request"
            }
        })

        /// Check if root user
        if(token.data.decoded.root) {

            /// Get master key
            const master_key = await storage.private.getObject(`root/master-key.json`);

            /// Ensure retrieval of master key is successful
            if(master_key.success == false) throw master_key.error;

            /// Return empty master key if master key is not found
            /// This should effectively signal that the keys has not been set up
            if(master_key.exists == false) return new schema.Response.Keys.Get({
                statusCode : 200,
                device : new schema.Keys.User({}),
                master : new schema.Keys.Master({}),
                root : true
            })

            /// Convert buffer to json
            const key_value_master = await utils.Parser.bufferToJson(master_key.data);

            /// Get root device key
            const root_key = await storage.private.getObject(`root/user-key.json`);

            /// Ensure retrieval of rootkey is successful
            if(root_key.success == false) throw root_key.error;

            /// Return empty user-key if not yet setup
            if(root_key.exists == false) return new schema.Response.Keys.Get({
                statusCode : 200,
                device : new schema.Keys.User({}),
                master : new schema.Keys.Master({}),
                root : true
            })

            /// Parse root device key if it exists
            const key_value_root = await utils.Parser.bufferToJson(root_key.data);

            /// Ensure parsing of root key value is successful
            if(key_value_root.success == false) throw key_value_root.error;

            return new schema.Response.Keys.Get({
                statusCode : 200,
                device : new schema.Keys.User(key_value_root.data.json),
                master : new schema.Keys.Master(key_value_master.data.json),
                root : true
            })

        }

        /// Otherwise, get keys for user
        else{

            /// Get user device key
            const user_key = await storage.private.getObject(`users/registered/${ token.data.decoded.auth_type }/${ token.data.decoded.user_id }/user-key.json`);

            /// Ensure retrieval of user key is successful
            if(user_key.success == false) throw user_key.error;

            /// Return empty if device key doesn't exists
            if(user_key.exists == false) return new schema.Response.Keys.Get({
                statusCode : 200,
                device : new schema.Keys.Device({}),
                root : false
            });
            
            /// Convert user key data into json format for transmission
            const key_value = await utils.Parser.bufferToJson(user_key.data)

            /// Ensure conversion is successful
            if(key_value.success == false) throw key_value.error;

            /// Return actual user key if it exists
            return new schema.Response.Keys.Get({
                statusCode : 200,
                device : new schema.Keys.Device({
                    key : key_value.data.json,
                    exists : user_key.exists
                }),
                root : false
            })
        }
    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)

        return new schema.Response.Keys.Get({
            device : new schema.Keys.Device({}),
            master : new schema.Keys.Master({}),
            body : {
                message : e.message 
            }
        })
    }
}