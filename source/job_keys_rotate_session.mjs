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
const validate = new Validator(schema, logger);
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
    if(validate.Property.isExistsKey(process.env, "ROOT_USER").result == false) throw new Error("ROOT_USER not configured.");

    /// Ensure jwt private key to be used is defined
    if(validate.Property.isExistsKey(process.env, "SECRET_JWT_PRIVATE").result == false) throw new Error("SECRET_JWT_PRIVATE not configured");
    
    /// Load all the plugins for the platform
    let plugins = await platform.load();

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

        logger.info(`Starting job - Session key rotation.`)

        /// Verify token parsed from cookie
        let rotated = await session.rotate_keys();

        /// Ensure verification operation is successful
        if(rotated.success == false) throw rotated.error;

        return new schema.Response.Jobs({
            statusCode : 200 
        })
    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)
        
        return new schema.Response.Jobs({ })
    }
}