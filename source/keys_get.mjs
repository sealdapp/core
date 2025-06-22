"use strict";
"use strict";

/// Import native libraries
import path from 'path';

/// Import 3rd party libraries
import Winston from 'winston';

/// Import application common libraries
import Logger from "./common/logger.mjs";
import Schema from "./common/schema.mjs";
import Validator from "./common/validator.mjs";
import Platform from "./platform/platform.mjs";

/// Initialize libraries
const logger = new Logger(Winston, path); 
const schema = new Schema();
const validate = new Validator(schema, logger);
let platform = new Platform(logger, validate);

/// Declaration of plugins
let auth;
let storage;

await (async function init(){

    logger.info("Initializing application...");

    /// Ensure root user email is defined
    if(!validate.property.isExistsKey(process.env, "ROOT_USER").valid) throw new Error("ROOT_USER not configured.");

    /// Load all the plugins for the platform
    let plugins = await platform.load();

    /// Initialize required subclasses
    auth = new plugins.Authenticator(schema, logger, validate);
    
    storage = new plugins.Storage(schema, logger, validate);

    logger.info(`Application successfully initialized.`)
})()

async function getKeys() {

}

export const handler = async(event) => {

    try {
    
        let info = await auth.info(event);
        
        logger.debug(`Getting keys of user [${ info.username }]`);
        
        return new schema.Response.Keys.Get({ 
            keys : [],
            root : info.username === process.env.ROOT_USER ? true : false
        });
    }
    
    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)
        
        return new schema.Response.Keys.Get({ 
            success : false,
            code : 500,
            message : e.stack 
        });
    }
}

let response = await handler({
    headers : {
        authorization : process.env.AUTH_TOKEN
    }
})

console.log(response)