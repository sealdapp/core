
"use strict";

/// Module-scoped variables
let logger;

export default class Platform {

    constructor(__logger) {
        /// Set module variables
        logger = __logger;

        /// Set public variables
        this.platform;

        logger.debug("Platform loader instantiated.")
    }

    async load() {
        
        logger.debug(`Loading platform libraries for [${ process.env["PLATFORM"] }]...`);

        /// Import platform specific plugins
        switch (process.env["PLATFORM"].toLowerCase()) {

            /// Load aws platform libraries
            case "aws" : this.platform = (await import("./aws/aws.mjs")).default; break;

            default: throw new Error("Unsupported platform type.");
        }
        logger.debug("Instantiating loaded platforms...")

        this.platform = new this.platform(logger);

        logger.debug("Invoking initialize platform.");

        await this.platform.init();
        
        return this.platform;
    }
}
