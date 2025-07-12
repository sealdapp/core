
"use strict";

/// Module-scoped variables
let schema;
let logger;
let validate

export default class Platform {

    constructor(__schema, __logger, __validate) {
        /// Set module variables
        schema = __schema;
        logger = __logger;
        validate = __validate;

        /// Set public variables
        this.platform;

        /// Ensure platform is defined
        if(validate.Property.isExistsKey(process.env, "PLATFORM").result == false) throw new Error("PLATFORM not configured.");

        /// Ensure authentication type is defined
        if(validate.Property.isExistsKey(process.env, "AUTH_TYPE").result == false) throw new Error("AUTH_TYPE not configured.");

        /// Ensure authentication type is defined
        if(validate.Property.isExistsKey(process.env, "STORAGE_TYPE").result == false) throw new Error("STORAGE_TYPE not configured.");

        /// Ensure secrets type is defined
        if(validate.Property.isExistsKey(process.env, "SECRET_TYPE").result == false) throw new Error("SECRET_TYPE not configured.");

        logger.debug("Platform loader instantiated.")
    }

    async load() {
        
        logger.debug(`Loading platform libraries for [${ process.env.PLATFORM }]...`);

        /// Import platform specific plugins
        switch (process.env.PLATFORM.toLowerCase()) {

            /// Load aws platform libraries
            case "aws" : this.platform = (await import("./aws.mjs")).default; break;

            default: throw new Error("Unsupported platform type.");
        }

        logger.debug("Instantiating loaded platforms...")

        this.platform = new this.platform(schema, logger);

        logger.debug("Invoking initialize platform.");

        let init = await this.platform.init();

        if(init.success == false) throw new Error(`Failed to load platform. ${ init.error.stack }`)
        
        return this.platform;
    }
}
