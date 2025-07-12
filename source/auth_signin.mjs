"use strict";

/// Import native libraries
import path from 'path';

/// Import application common libraries
import Schema from "./schema/Schema.mjs";
import Logger from "./common/logger.mjs";
import Fetch from "./common/fetch.mjs";
import Validator from "./common/validator.mjs";
import Crypto from "./common/crypto.mjs";
import Platform from "./platform/platform.mjs";

/// Initialize libraries
const logger = new Logger(path); 
const schema = new Schema();
const fetch = new Fetch(schema, logger);
const validate = new Validator(schema, logger);
const crypto = new Crypto(schema, logger, validate);
const platform = new Platform(schema, logger, validate);

/// Declaration of plugins
let auth;
let secret;
let storage = {};

await (async function init(){

    logger.info("Initializing application...");

    /// Ensure root user email is defined
    if(validate.Property.isExistsKey(process.env, "ROOT_USER").result == false) throw new Error("ROOT_USER not configured.");

    /// Ensure jwt private key to be used is defined
    if(validate.Property.isExistsKey(process.env, "SECRET_JWT_PRIVATE").result == false) throw new Error("SECRET_JWT_PRIVATE not configured");

    /// Load all the plugins for the platform
    let plugins = await platform.load();

    /// Secrets library
    secret = new plugins.Secret(schema, logger, validate);

    /// Initialize secrets plugin
    let init_secret = await secret.init()

    /// Ensure secret initialization is successful
    if(init_secret.success == false) throw init_secret.error;
    
    /// Storage library
    storage.private = new plugins.Storage(schema, logger, validate);
    
    /// Initialize key storage plugin instance
    let init_storage_private = await storage.private.init(process.env.STORAGE_BUCKET_PRIVATE);

    /// Ensure key storage plugin instance was initialized successfully
    if(init_storage_private.success == false) throw init_storage_private.error;

    /// Authentication library
    auth = new plugins.Authenticator(schema, logger, validate, fetch, crypto, secret, storage.private);

    /// Initialize authenticator plugin
    let init_auth = await auth.init()

    /// Ensure authenticator initialization is successful
    if(init_auth.success == false) throw init_auth.error;

    logger.info(`Application successfully initialized.`)
})()

export const handler = async(event) => {

    try {

        logger.debug(`Signin attempt detected.`)
        
        /// Ensure event have request body
        if(validate.Property.isExistsKey(event, "body").result == false) return new schema.Response.Auth.Signin({
            statusCode : 400,
            message : "Bad request"
        })

        /// Pass event body to authenticator signin method
        let signed_in = await auth.signin(event.body);

        /// Handle exceptions
        if(signed_in.success == false) throw signed_in.error;
        
        /// Handle invalid authentications
        if(signed_in.authenticated == false) return new schema.Response.Auth.Signin({
            statusCode : 401,
            body : {
                retry: signed_in.retry,
                message : "Failed to authenticate user."
            }
        })

        /// Handle unauthorized access
        if(signed_in.authorized == false) return new schema.Response.Auth.Signin({
            statusCode : 403,
            body : {
                retry: signed_in.retry,
                message : "You are not authorized."
            }
        })

        /// Return successful signins
        return new schema.Response.Auth.Signin({ 
            statusCode : 200,
            headers : {
                'Set-Cookie': `sessionToken=${ signed_in.token }; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`,
                'Content-Type': 'text/plain'
            },
            body : {
                retry: signed_in.retry,
                message : "User successfully authenticated!",
            }
        });
    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)
        
        return new schema.Response.Auth.Signin({ 
            statusCode : 500,
            body : {
                message : e.message 
            }
        });
    }
}