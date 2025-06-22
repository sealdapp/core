"use strict";

/// Import interface
import Platforms from '../interface.mjs';

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

            /// Load google's OAuth2 authenticator
            case "oauth2_google" : this.Authenticator = (await import("./cognito/oauth2_google.mjs")).default; break;

            default: throw new Error("Unsupported authentication type.");
        }
        /// Import storage libraries

    }
}