"use strict";

/// Import native libraries
import path from 'path';

/// Import application common libraries
import Schema from "./schema/Schema.mjs";
import Logger from "./common/logger.mjs";
import Validator from "./common/validator.mjs";
import Utilities from "./common/utils.mjs";
import Middleware from "./common/middleware.mjs";
import Crypto from "./common/crypto.mjs";
import Platform from "./platform/platform.mjs";

/// Initialize libraries
const logger = new Logger(path); 
const schema = new Schema();
const validate = new Validator();
const utils = new Utilities(schema, logger, validate);
const middleware = new Middleware(schema, logger, validate, utils);
const crypto = new Crypto(schema, logger, validate);
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

async function prepareUpload(keyObject) {

    try {
        logger.debug(`Preparing key for upload.`);

        const stringified = JSON.stringify(keyObject);

        /// Get sha256 digest of data to be used for uploading
        const hash = await crypto.Hash.sha256({ 
            data : stringified,
            output : "base64"
        })

        /// Ensure calculation of digest is successful
        if(hash.success == false) throw hash.error;

        return new schema.Operation({
            success : true,
            data : { 
                content : stringified,
                digest : hash.digest
            }
        })
    }
    catch(e) {
        logger.error(`Failed to load key. ${ e.stack }`);

        return new schema.Operation({
            error : new Error(e.message)
        })
    }
}

export const handler = async(event) => {

    try {

        logger.info(`Setting up keys.`);

        let token;
        let keys;

        /// Get user information from cookie
        const parse_token = await middleware.Handler.token(event);

        /// Return bad request if token information extraction failed
        if(parse_token.success == false) return new schema.Response.Keys.Init({
            statusCode : 400,
            body : {
                message : "Bad request"
            }
        })

        /// Construct token. Validation skipped since it was already validated by authverify
        token = new schema.Request.Token(parse_token.data.decoded)

        /// Ensure user is root
        if(token.root == false) return new schema.Response.Keys.Init({
            statusCode : 401,
            body : { message : "You are not authorized." }
        })

        /// Ensure request body is correct
        const parse_body = await middleware.Handler.body(event);

        /// Return bad request if body data extraction failed
        if(parse_body.success == false) return new schema.Response.Keys.Init({
            statusCode : 400,
            body : { message : parse_body.error.message }
        })

        /// Ensure parsed body contains keys
        if(validate.Property.isExistsKey(parse_body.data.body, "keys").result == false) return new schema.Response.Keys.Init({
            statusCode : 400,
            body : { message : "Missing keys." }
        })

        /// Insert token information inside keys
        Object.assign(parse_body.data.body.keys, { token });

        /// Construct body according to the expected request schema for this function
        try { keys = new schema.Request.Keys.Init(parse_body.data.body.keys) }


        /// Return if body is malformed
        catch(e) { 
            logger.error(`Failed to construct body data. ${ e.stack }`);

            return new schema.Response.Keys.Init({
                statusCode : 400,
                body : { message : "Malformed request." }
            })
        }

        /// Get master key
        const master_key = await storage.private.headObject(`root/master-key.json`);

        /// Ensure master key retrieval is successful
        if(master_key.success == false) throw master_key.error;

        /// Ensure master key doesn't exists yet
        if(master_key.exists == true) return new schema.Response.Keys.Init({
            statusCode : 409,
            body : { message : "Master key already exists." }
        })

        logger.info("There is no master key detected. Proceeding with key initialization setup");
        
        /// Validate master key
        const wrapped_master = await prepareUpload(keys.master_key);

        /// Ensure wrapped_master file is valid
        if(wrapped_master.success == false) return new schema.Response.Keys.Init({
            statusCode : 400,
            body : { message : "Master key supplied is malformed." }
        })

        /// Validate recovery key
        const wrapped_recovery = await prepareUpload(keys.recovery_key);

        /// Ensure wrapped_recovery file is valid
        if(wrapped_recovery.success == false) return new schema.Response.Keys.Init({
            statusCode : 400,
            body : { message : "Recovery key supplied is malformed." }
        })

        /// Validate root user key
        const root_key = await prepareUpload(keys.root_key);

        /// Ensure root user key file is valid
        if(root_key.success == false) return new schema.Response.Keys.Init({
            statusCode : 400,
            body : { message : "Root user key supplied is malformed." }
        })

        logger.info("All keys supplied are valid. Proceeding with the upload.");

        /// Store root user key
        const root_key_upload = await storage.private.putObject(`root/user-key.json`, root_key.data.content);

        /// Ensure root user key upload is successful
        if(root_key_upload.success == false) throw root_key_upload.error;

        /// Store recovery key 
        const wrapped_recovery_upload = await storage.private.putObject(
            `root/recovery-key.json`, 
            wrapped_recovery.data.content,
            {
                ObjectLockMode: "GOVERNANCE",
                ObjectLockRetainUntilDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * process.env.KEYS_LOCK_DURATION),
                ChecksumSHA256: wrapped_recovery.data.digest,
                ChecksumAlgorithm: "SHA256"
            }
        );

        /// Ensure wrapped_recovery_upload is successful
        if(wrapped_recovery_upload.success == false) throw wrapped_recovery_upload.error;

        /// Store master key
        const wrapped_master_upload = await storage.private.putObject(
            `root/master-key.json`, 
            wrapped_master.data.content,
            {
                ObjectLockMode: "GOVERNANCE",
                ObjectLockRetainUntilDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * process.env.KEYS_LOCK_DURATION),
                ChecksumSHA256: wrapped_master.data.digest,
                ChecksumAlgorithm: "SHA256"
            }
        );

        /// Ensure wrapped_recovery_upload is successful
        if(wrapped_master_upload.success == false) throw wrapped_master_upload.error;

        logger.info(`Keys successfully initialized!`)

        return new schema.Response.Keys.Init({ 
            statusCode : 200
        })
    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)
        
        return new schema.Response.Keys.Init({ })
    }
}