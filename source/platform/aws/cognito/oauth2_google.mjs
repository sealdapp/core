"use strict";

/// Import 3rd part libraries
import { OAuth2Client } from 'google-auth-library';
import jwt from "jsonwebtoken";
import Authenticators from './interface.mjs';

/// Module-scoped variables
let schema;
let logger;
let validate;
let client;

export default class Authenticator extends Authenticators {

    constructor(__schema, __logger, __validate) {
        super()

        /// Set module varaibles
        schema = __schema;
        logger = __logger;
        validate = __validate;

        /// Set stateful variables
        client = null;

        logger.debug("Initializing plugin [oauth2_google]")

        /// Validate google client id if it exists inside environment variables
        if(!validate.property.isExistsKey(process.env, "OAUTH_GOOGLE_ID").valid) throw new Error("OAUTH_GOOGLE_ID is not defined.");

        /// Initialize client
        client = new OAuth2Client(process.env["OAUTH_GOOGLE_ID"]);

        logger.debug("oauth2_google plugin instantiated.")

    }

    signin(){
        logger.debug("Signin in")
        /// Validate user if it has a valid provisioned key

        /// Generate jwt token
    }

    verify(){
        logger.debug("Verifying credentials")
        /// Validate jwt token
    }

    register() {
        logger.debug("Registering user")

        /// Store generated user key to storage
    }

    delete(){
        logger.debug("Deleting user.")

        /// Delete generated user key from storage
    }
}