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
import Session from "./common/session.mjs";
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
let auth;
let secret;
let session;

await (async function init(){

    logger.info("Initializing application...");

    /// Ensure root user email is defined
    if(validate.Property.isExistsKey(process.env, "ROOT_USER").result != true) throw new Error("ROOT_USER not configured.");

    /// Ensure jwt private key to be used is defined
    if(validate.Property.isExistsKey(process.env, "SECRET_JWT_PRIVATE").result != true) throw new Error("SECRET_JWT_PRIVATE not configured");
    
    /// Validate if s3 bucket is defined
    if(validate.Property.isExistsKey(process.env, "STORAGE_BUCKET_PRIVATE").result != true) throw new Error("STORAGE_BUCKET_PRIVATE is not defined.");
    
    /// Load all the plugins for the platform
    const plugins = await platform.load();

    /// Secrets library
    secret = new plugins.Secret(schema, logger, validate);

    /// Initialize secrets plugin
    await middleware.Initializer.initialize(await secret.init());

    /// Authentication library
    auth = new plugins.Authenticator(schema, logger, validate);

    /// Initialize authenticator plugin
    await middleware.Initializer.initialize(await auth.init());

    logger.info("Plugins successfullly loaded.");

    /// Session manager
    session = new Session(schema, logger, validate, crypto, secret);

    /// Initialize session manager
    await middleware.Initializer.initialize(await session.init());

    logger.info(`Application successfully initialized.`)

})()

export const handler = async(event) => {

    try {

        logger.info(`Verifying authentication.`);

        let token;

        /// Extract token from cookie
        const parse_token = await middleware.Handler.token(event);

        if(parse_token.success != true) return new schema.Response.Auth.Verify({
            context : { message : parse_token.error.message }
        })

        try {
            logger.debug("Trying to construct token...");

            /// Construct token data
            token = new schema.Request.Token(parse_token.data.decoded)
        }
        catch(e) {
            
            logger.error(`Failed to construct token. ${ e.stack }`);

            /// Otherwise, throw malformed token error
            throw new Error("Malformed token.");
        }

        /// Verify token parsed from cookie
        const verify = await session.verify_token({ token : parse_token.data.parsed });

        /// Ensure verification operation is successful
        if(verify.success != true) return new schema.Response.Auth.Verify({
            context : { message : verify.error.message }
        })

        return new schema.Response.Auth.Verify({
            isAuthorized : verify.data.isAuthorized
        })
    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)
        
        
        return new schema.Response.Auth.Verify({
            context : {
                message : e.message
            }
        })
    }
}