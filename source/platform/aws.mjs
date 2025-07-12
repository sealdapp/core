"use strict";

/// Import interface
import Platforms from './interface.mjs';

/// Module-scoped variables
let schema;
let logger

export default class AWSPlatform extends Platforms {

    constructor(__schema, __logger) {
        super();

        /// Set module variables
        schema = __schema;
        logger = __logger;

        logger.debug("AWS Platform instantiated.")
    }

    async init(){

        try {

            logger.info("Loading all AWS components...");

            logger.debug(`Setting authentication type to [${ process.env.AUTH_TYPE }]`);
            
            /// Import authenticator mode
            switch (process.env.AUTH_TYPE.toLowerCase()) {

                /// Load firebase authenticator
                case "firebase" : this.Authenticator = (await import("./aws/authentication/firebase.mjs")).default; break;

                default: throw new Error("Unsupported authentication type.");
            }

            logger.debug(`Setting authentication type to [${ process.env.STORAGE_TYPE }]`);

            /// Import storage libraries
            switch (process.env.STORAGE_TYPE.toLowerCase()) {

                /// Load aws s3 bucket storage
                case "s3" : this.Storage = (await import("./aws/storages/s3.mjs")).default; break;

                default: throw new Error("Unsupported storage type.")
            }

            logger.debug(`Setting authentication type to [${ process.env.SECRET_TYPE }]`);

            /// Import secrest libraries
            switch(process.env.SECRET_TYPE.toLowerCase()){

                /// Load aws s3 bucket storage
                case "parameters" : this.Secret = (await import("./aws/secrets/parameters.mjs")).default; break;

                default: throw new Error("Unsupported secrets type.")
            }

            logger.debug(`Successfully loaded aws platform.`);
            
            return new schema.Operation({ 
                success : true 
            });
        }
        catch(e) {
            logger.error(`Failed to load aws platform. ${ e.stack }`);

            return new schema.Operation({ 
                error : new Error(e.message)
            });
        }

    }
}