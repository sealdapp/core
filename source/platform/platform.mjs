
"use strict";

/// Module-scoped variables
let logger;
let validate

export default class Platform {

    constructor(__logger, __validate) {
        /// Set module variables
        logger = __logger;
        validate = __validate;

        /// Set public variables
        this.platform;

        /// Ensure platform is defined
        if(!validate.property.isExistsKey(process.env, "PLATFORM").valid) throw new Error("PLATFORM not configured.");

        /// Ensure authentication type is defined
        if(!validate.property.isExistsKey(process.env, "AUTH_TYPE").valid) throw new Error("AUTH_TYPE not configured.");

        /// Ensure authentication type is defined
        if(!validate.property.isExistsKey(process.env, "STORAGE_TYPE").valid) throw new Error("STORAGE_TYPE not configured.");

        logger.debug("Platform loader instantiated.")
    }

    async load() {
        
        logger.debug(`Loading platform libraries for [${ process.env["PLATFORM"] }]...`);

        /// Import platform specific plugins
        switch (process.env["PLATFORM"].toLowerCase()) {

            /// Load aws platform libraries
            case "aws" : this.platform = (await import("./aws.mjs")).default; break;

            default: throw new Error("Unsupported platform type.");
        }

        logger.debug("Instantiating loaded platforms...")

        this.platform = new this.platform(logger);

        logger.debug("Invoking initialize platform.");

        await this.platform.init();
        
        return this.platform;
    }
}
