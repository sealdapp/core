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
import { ObjectLockMode } from '@aws-sdk/client-s3';

/// Initialize libraries
const logger = new Logger(path); 
const schema = new Schema();
const validate = new Validator(schema, logger);
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
    let plugins = await platform.load();
    
    /// Storage library
    storage.private = new plugins.Storage(schema, logger, validate);
    
    /// Initialize key storage plugin instance
    await middleware.Initializer.initialize(await storage.private.init(process.env.STORAGE_BUCKET_PRIVATE));

    logger.info(`Application successfully initialized.`)

})()

async function validateWrappedJWK(key) {

    try {
        logger.debug(`Validating wrapped JWK key.`);

        /// Ensure keys contain mandatory parameters
        if(validate.Property.isExistsKeys(key, [
            "type",
            "wrappedKey",
            "algorithm"
        ]).result == false) throw new Error(`One or more mandatory property is missing.`);

        /// Ensure type is wrappedJWK
        if(key.type != "wrappedJWK") throw new Error(`Key type is not wrappedJWK`);

        /// Ensure wrapped key contains value
        if(validate.String.isEmpty(key.wrappedKey).result == true) throw new Error(`WrappedKey is empty.`);

        /// Get sha256 digest of data
        let hash = await crypto.Hash.sha256({ 
            data : JSON.stringify(key),
            output : "base64"
        })

        /// Ensure calculation of digest is successful
        if(hash.success == false) throw hash.error;

        return new schema.Operation({
            success : true,
            data : { 
                content : key,
                digest : hash.digest
            }
        })

    }
    catch(e) {
        logger.error(`Failed to validate wrapped JWK key. ${ e.stack }`);

        return new schema.Operation({
            error : new Error(e.message)
        })
    }
}

async function validateDeviceKey(key) {

    try {

        logger.debug(`Validating device key.`);

        /// Ensure keys contain mandatory parameters
        if(validate.Property.isExistsKeys(key, [
            "type",
            "salt",
            "iterations",
            "hash",
            "algorithm",
            "length"
        ]).result == false) throw new Error(`One or more mandatory property is missing.`);

        /// Ensure type is device key
        if(key.type != "deviceKey") throw new Error(`Key type is not deviceKey`);

        /// Ensure salt value is not empty
        if(validate.String.isEmpty(key.salt).result == true) throw new Error(`Salt is empty.`);

        return new schema.Operation({
            success : true,
            data : { key }
        })


    }
    catch(e) {
        logger.error(`Failed to validate device key. ${ e.stack }`);

        return new schema.Operation({
            error : new Error(e.message)
        })
    }
}

export const handler = async(event) => {

    try {

        logger.info(`Setting up keys.`);

        /// Get user information from cookie
        let token = await middleware.Handler.token(event);

        /// Return bad request if token information extraction failed
        if(token.success == false) return new schema.Response.Keys.Get({
            statusCode : 400,
            body : {
                message : "Bad request"
            }
        })

        /// Ensure user is root
        if(token.data.decoded.root == false) throw new schema.Response.Keys.Setup({
            statusCode : 401,
            body : { message : "You are not authorized." }
        })

        /// Get master key
        let master_key = await storage.private.getObject(`root/master-key.json`);

        /// Ensuer master key retrieval is successful
        if(master_key.success == false) throw master_key.error;

        /// Ensure master key doesn't exists yet
        if(master_key.exists == true) return new schema.Response.Keys.Setup({
            statusCode : 409,
            body : { message : "Master key already exists." }
        })

        /// Ensure event body is supplied
        if(validate.Property.isExistsKey(event, "body").result == false) return new schema.Response.Keys.Setup({
            statusCode : 400,
            body : { message : "Bad request." }
        })

        /// Ensure master key is supplied
        if(validate.Property.isExistsKey(event.body, "master_key").result == false) return new schema.Response.Keys.Setup({
            statusCode : 400,
            body : { message : "Missing master_key." }
        })

        /// Ensure recovery key is supplied
        if(validate.Property.isExistsKey(event.body, "recovery_key").result == false) return new schema.Response.Keys.Setup({
            statusCode : 400,
            body : { message : "Missing recover_key." }
        })

        /// Ensure root device key is supplied
        if(validate.Property.isExistsKey(event.body, "root_key").result == false) return new schema.Response.Keys.Setup({
            statusCode : 400,
            body : { message : "Missing root_key." }
        })

        /// Validate root device key
        let root_key = await validateDeviceKey(event.body.root_key);

        /// Ensure root device key file is valid
        if(root_key.success == false) throw root_key.error;

        /// Store root device key
        let root_key_upload = await storage.private.putObject(`root/user-key.json`, JSON.stringify(root_key.data));

        /// Ensure root device key upload is successful
        if(root_key_upload.success == false) throw root_key_upload.error;

        /// Validate recovery key
        let wrapped_recovery = await validateWrappedJWK(event.body.recovery_key);

        /// Ensure wrapped_recovery file is valid
        if(wrapped_recovery.success == false) throw wrapped_recovery.error;

        /// Store recovery key 
        let wrapped_recovery_upload = await storage.private.putObject(`root/recovery-key.json`, JSON.stringify(wrapped_recovery.data));

        /// Ensure wrapped_recovery_upload is successful
        if(wrapped_recovery_upload.success == false) throw wrapped_recovery_upload.error;

        /// Validate master key
        let wrapped_master = await validateWrappedJWK(event.body.master_key);

        /// Ensure wrapped_master file is valid
        if(wrapped_master.success == false) throw wrapped_master.error;

        /// Store master key
        let wrapped_master_upload = await storage.private.putObject(
            `root/master-key.json`, 
            JSON.stringify(wrapped_master.data.content),
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