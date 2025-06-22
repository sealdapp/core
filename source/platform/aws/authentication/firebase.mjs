"use strict";

/// Import 3rd part libraries
import Authenticators from './interface.mjs';

/// Module-scoped variables
let schema;
let logger;
let validate;

export default class Authenticator extends Authenticators {

    constructor(__schema, __logger, __validate) {
        super()

        /// Set module varaibles
        schema = __schema;
        logger = __logger;
        validate = __validate;

        logger.debug("Initializing plugin [firebase]")

        /// Validate google client id if it exists inside environment variables
        if(!validate.property.isExistsKey(process.env, "AUTH_FIREBASE_PROVIDERS").valid) throw new Error("OAUTH_GOOGLE_ID is not defined.");

        logger.debug("firebase plugin instantiated.")
    }

    /// This is handled from AWS API Gateway token authorizer
    signin(){ throw new Error("Not implemented.") }

    /// This is handled from AWS API Gateway token authorizer
    verify(){ throw new Error("Not implemented.") }

    /// Registration is handled from Firebase
    register(){ throw new Error("Not implemented.") }

    /// Not implemented
    delete(){ throw new Error("Not implemented.") }

    info(event){

        logger.debug("Getting details of user from firebase jwt.")

        const [ type, token ] = event.headers.authorization.split(' ');

        /// JWT validation is already configured on AWS api gateway
        const [ header, payload, signature ] = token.split('.');

        const decoded = Buffer.from(payload, 'base64').toString('utf-8');

        const data = JSON.parse(decoded);
        
        return new schema.Authentication.Info({ username : data.email });
    }
}