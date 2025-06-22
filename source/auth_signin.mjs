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
let platform = new Platform(logger);

/// Declaration of plugins
let auth;


async function init(){

    logger.info("Initializing application...");

    /// Ensure platform is defined
    if(!validate.property.isExistsKey(process.env, "PLATFORM").valid) throw new Error("AUTH_TYPE not configured.");

    /// Ensure authentication type is defined
    if(!validate.property.isExistsKey(process.env, "AUTH_TYPE").valid) throw new Error("AUTH_TYPE not configured.");

    /// Load all the plugins for the platform
    let plugins = await platform.load();

    /// Initialize required subclasses
    auth = new plugins.Authenticator(schema, logger, validate);

    auth.signin()

    logger.info(`Application successfully initialized.`)
}
init()


