"use strict";

/// Import 3rd part libraries
import jwt from "jsonwebtoken";

/// Module scoped variables
let schema;
let logger;
let validate;
let utils;

export default class Middleware {


    constructor(__schema, __logger, __validate, __utils) {
        
        schema = __schema;
        logger = __logger;
        validate = __validate;
        utils = __utils;

        logger.debug("Instantiated middlware module");
    }

    Initializer = class {

        static async initialize(response){

            /// Ensure secret initialization is successful
            if(response.success == false) throw response.error;

        }
    }


    Handler = class {

        static async token(event){
            try {
            
                logger.debug("Validating token from cookie.");

                /// Ensure event have request body
                if(validate.Property.isExistsKey(event, "cookies").result == false) throw new Error("Cookie not found.");

                /// Parse cookies
                let cookies = await utils.Parser.cookies(event.cookies);

                /// Ensure parsing of cookies is successful
                if(cookies.success == false) throw new Error("Invalid cookie.");

                /// Ensure token is inside cookie parsed
                if(validate.Property.isExistsKey(cookies.data.parsed, "sessionToken").result == false) throw new Error("Missing session token.");

                /// Ensure token is not empty
                if(validate.String.isEmpty(cookies.data.parsed.sessionToken).result == true) throw new Error("Token cannot be empty.");
                
                /// Decode token payload
                let payload = jwt.decode(cookies.data.parsed.sessionToken);

                /// Ensure payload contains user_id
                if((await validate.Property.isExistsKeys(payload, [
                    "auth_type",
                    "user_id",
                    "username",
                    "root",
                    "iat",
                    "exp",
                    "iss"
                ])).result == false) throw new Error("Malformed token.");

                return new schema.Operation({
                    success : true, 
                    data : {
                        parsed : cookies.data.parsed.sessionToken,
                        decoded : payload
                    }
                })
            }
            catch(e) {

                logger.debug(`Validation failed for session token. ${ e.stack }`);

                return new schema.Operation({
                    error : new Error(e.message)
                })
            }
        }
    }
}