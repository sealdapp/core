"use strict";

/// Import interface
import Platforms from './interface.mjs';

/// Module-scoped variables
let logger

export default class AWSPlatform extends Platforms {

    constructor(__logger) {
        super();

        /// Set module variables
        logger = __logger;

        logger.debug("AWS Platform instantiated.")
    }

    async init(){

        logger.info("Loading all AWS components...");

        logger.debug(`Setting authentication type to [${ process.env["AUTH_TYPE"] }]`);
        
        /// Import authenticator mode
        switch (process.env['AUTH_TYPE'].toLowerCase()) {

            /// Load firebase authenticator
            case "firebase" : this.Authenticator = (await import("./aws/authentication/firebase.mjs")).default; break;

            default: throw new Error("Unsupported authentication type.");
        }

        /// Import storage libraries
        switch (process.env['STORAGE_TYPE'].toLowerCase()) {

            /// Load aws s3 bucket storage
            case "s3" : this.Storage = (await import("./aws/storages/s3.mjs")).default; break;

            default: throw new Error("Unsupported storage type.")
        }

    }
}