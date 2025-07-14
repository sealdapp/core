"use strict";

/// Import native libraries
import path from 'path';

/// Import application common libraries
import Schema from "./schema/Schema.mjs";
import Logger from "./common/logger.mjs";
import Validator from "./common/validator.mjs";
import Utilities from "./common/utils.mjs";
import Crypto from "./common/crypto.mjs";
import Session from "./common/session.mjs";
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
    utils.Initializer.initialize(await secret.init());

    /// Authentication library
    auth = new plugins.Authenticator(schema, logger, validate);

    /// Initialize authenticator plugin
    utils.Initializer.initialize(await auth.init());

    logger.info("Plugins successfullly loaded.");

    /// Session manager
    session = new Session(schema, logger, validate, crypto, secret);

    /// Initialize session manager
    utils.Initializer.initialize(await session.init());

    logger.info(`Application successfully initialized.`)

})()

async function parseCookies(list) {

    try {
        logger.debug(`Parsing cookie list.`);

        /// Ensure list is in array type
        if(validate.Type.isArray(list).result == false) throw new Error(`Data provided is not of list format.`);

        const parsed = {};
        for (const cookie of list) {
            const [key, ...val] = cookie.split('=');

            /// Join back the values, remove trailing spaces and semicolons
            parsed[key.trim()] = val.join('=').trim().replace(/;$/, ''); // handles '=' in value
        }
    
        logger.debug("Successfully parsed cookie.")

        return new schema.Operation({
            success : true,
            data : { parsed }
        })
    }
    catch(e) {

        logger.error(`Failed to parse cookie. ${ e.stack }`);

        return new schema.Operation({
            error : new Error(e.message)
        })
    }
}

export const handler = async(event) => {

    try {

        logger.info(`Verifying authentication.`)
        
        /// Ensure event is supplied
        if(validate.Property.isExistsKey(event, "cookies").result == false) return new schema.Response.Auth.Verify({
            context : { message : "Cookie not found." }
        });

        /// Parse cookies
        let cookies = await parseCookies(event.cookies);

        /// Ensure parsing of cookies is successful
        if(cookies.success == false) return new schema.Response.Auth.Verify({
            context : { message : "Invalid cookie." }
        })

        /// Ensure token is inside cookie parsed
        if(validate.Property.isExistsKey(cookies.data.parsed, "sessionToken").result == false) return new schema.Response.Auth.Verify({
            context : { message : "Missing session token." }
        })

        /// Verify token parsed from cookie
        let verify = await session.verify_token({ token : cookies.data.parsed.sessionToken });

        /// Ensure verification operation is successful
        if(verify.success == false) return new schema.Response.Auth.Verify({
            context : { message : "Invalid session token." }
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