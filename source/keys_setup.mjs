"use strict";

/// Import native libraries
import path from 'path';

/// Import application common libraries
import Schema from "./schema/Schema.mjs";
import Logger from "./common/logger.mjs";
import Validator from "./common/validator.mjs";
import Utilities from "./common/utils.mjs";
import Platform from "./platform/platform.mjs";

/// Initialize libraries
const logger = new Logger(path); 
const schema = new Schema();
const validate = new Validator(schema, logger);
const utils = new Utilities(schema, logger, validate);
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
    await utils.Initializer.initialize(await secret.init());

    /// Authentication library
    auth = new plugins.Authenticator(schema, logger, validate);

    /// Initialize authenticator plugin
    await utils.Initializer.initialize(await auth.init());

    logger.info("Plugins successfullly loaded.");

    /// Session manager
    session = new Session(schema, logger, validate, crypto, secret);

    /// Initialize session manager
    await utils.Initializer.initialize(await session.init());

    logger.info(`Application successfully initialized.`)

})()

export const handler = async(event) => {

    try {

        logger.info(`Setting up keys.`);

        /// Ensure user is root

        /// Ensure master key is supplied

        /// Ensure root device key is supplied

        /// Ensure master key doesn't exists yet

        /// Ensure root device key doesn't exists yet

        /// Store master key

        /// Store root device key

    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)
        
        return new schema.Response.Jobs({ })
    }
}