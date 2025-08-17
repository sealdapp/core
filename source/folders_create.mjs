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

export const handler = async(event) => {

    return await middleware.Handler.main(event, async function({ token, body }){

        logger.debug(`Create folder request received.`);

        let request;

        Object.assign(body, { token });

        /// Load keys
        try { request = new schema.Request.Folders.Create(body) }

        /// Return if body is malformed
        catch(e) { 
            logger.error(`Failed to construct body data. ${ e.stack }`);

            return new schema.Response.Folders.Create({
                statusCode : 400,
                body : { message : "Malformed request." }
            })
        }

        /// Ensure user has permission to create folder
        if(token.role.permissions.vault[body.type].add != true)  return new schema.Response.Folders.Create({
            statusCode : 401,
            body : { message : "You are not authorized to create new folder." }
        })

        const path = `vault/${ body.type }/${ body.id }`;

        /// Ensure folder id doesn't exists yet
        const folder = await storage.private.headObject(`${ path }/folder-key.json`);

        /// Ensure folder retrieval is successful
        if(folder.success != true) throw folder.error;

        /// Ensure folder doesn't exists yet
        if(folder.exists == true) return new schema.Response.Folders.Create({
            statusCode : 409,
            body : { message : "Folder already exists." }
        })

        /// Upload properties file
        const properties_upload = await storage.private.putObject(`${ path }/properties`, request.properties);

        /// Ensure uploading of properties file is successful
        if(properties_upload.success != true) throw properties_upload.error;

        /// Upload authorized keys
        let authorized_keys_upload = await uploadAuthorizedKeys(`${ path }/authorized_keys`, request.authorized_keys)

        /// Ensure uploading of authorized keys is succesful.
        if(authorized_keys_upload.success != true) throw authorized_keys_upload.error;

        /// Upload folder key
        const folder_key_upload = await storage.private.putObject(`${ path }/folder-key.json`, JSON.stringify(request.folderKey));

        /// Ensure uploading of folder key is successful
        if(folder_key_upload.success != true) throw folder_key_upload.error;

        return new schema.Response.Folders.Create({
            statusCode : 201,
            body : { message : "Successfully created folder!" }
        })
    })
}