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

async function uploadAuthorizedKeys(path, authorized_keys) {

    try {
        logger.debug("Uploading authorized keys.");

        for(const key of authorized_keys) {

            const wrapper = key.keys.aes.wrapper.split(".")[0];

            logger.debug(`Uploading authorized key for user [${ wrapper }]`)
            
            /// Upload properties file
            const key_upload = await storage.private.putObject(`${ path }/${ wrapper }-folder-key.json`, JSON.stringify(key));

            /// Ensure uploading of properties file is successful
            if(key_upload.success != true) throw key_upload.error;
        }
        logger.debug(`Succesfully uploaded all authorized keys.`)

        return new schema.Operation({
            success : true
        })
    }

    catch(e) {
        logger.error(`One or more authorized key failed to upload. ${ e.stack }`);

        return new schema.Operation({
            error : new Error(e.message)
        })
    }
} 

/**
 * This function activates the vault safe.
 * This will create a new folder key inside internal vault.
 * The new folder key created will be used to decrypt vault safe's data 
 * such as name of folders along with its other properties
 * @param {*} event 
 * @returns 
 */
export const handler = async(event) => {

    return await middleware.Handler.main(event, async function({ token, body }){

        logger.info(`Setting up vault safe.`);
        
        /// Ensure user is root
        if(token.role.name != "root") return new schema.Response.Keys.Init({
            statusCode : 401,
            body : { message : "You are not authorized." }
        })

        /// Ensure parsed body contains keys
        if(validate.Property.isExistsKey(body, "keys").result != true) return new schema.Response.Keys.Init({
            statusCode : 400,
            body : { message : "Missing keys." }
        })

        /// Load keys
        try { request = new schema.Request.Folders.Activate(body) }

        /// Return if body is malformed
        catch(e) { 
            logger.error(`Failed to construct body data. ${ e.stack }`);

            return new schema.Response.Folders.Activate({
                statusCode : 400,
                body : { message : "Malformed request." }
            })
        }

        
    })
}