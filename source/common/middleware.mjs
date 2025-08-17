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
            if(response.success != true) throw response.error;

        }
    }


    Handler = class {

        static async main(event, next){
            try {

                logger.debug("Validating request.")

                /// Get user information from cookie
                const parse_token = await Middleware.#handlerToken(event);

                /// Return bad request if token information extraction failed
                if(parse_token.success != true) return new schema.Response.Keys.Init({
                    statusCode : 400,
                    body : {
                        message : "Bad request"
                    }
                })

                /// Construct token. Validation skipped since it was already validated by authverify
                const token = new schema.Request.Token(parse_token.data.decoded)
                
                /// Ensure request body is correct
                const parse_body = await Middleware.#handlerBody(event);

                /// Return bad request if body data extraction failed
                if(parse_body.success != true) return new schema.Response.Keys.Init({
                    statusCode : 400,
                    body : { message : parse_body.error.message }
                })

                /// Extract body data
                const body = parse_body.data.body;

                /// Pass token and body information back to main
                return await next({ token, body })

            }
            catch(e) {
                logger.error(`Something went wrong. ${ e.stack }`)
                
                return new schema.Response.Base({ })
            }

        }

        static async token(event) { return Middleware.#handlerToken(event) };

        static async body(event) { return Middleware.#handlerBody(event) };

    }

    static async #handlerToken(event){
        try {
        
            logger.debug("Validating token from cookie.");

            /// Ensure event have request body
            if(validate.Property.isExistsKey(event, "cookies").result != true) throw new Error("Cookie not found.");

            /// Parse cookies
            const cookies = await utils.Parser.cookies(event.cookies);

            /// Ensure parsing of cookies is successful
            if(cookies.success != true) throw new Error("Invalid cookie.");

            /// Ensure token is inside cookie parsed
            if(validate.Property.isExistsKey(cookies.data.parsed, "sessionToken").result != true) throw new Error("Missing session token.");

            /// Ensure token is not empty
            if(validate.String.isEmpty(cookies.data.parsed.sessionToken).result == true) throw new Error("Token cannot be empty.");
            
            /// Decode token payload
            const payload = jwt.decode(cookies.data.parsed.sessionToken);

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

    static async #handlerBody(event){
        try{

            logger.debug(`Validating body data`);

            /// Ensure event body is supplied
            if(validate.Property.isExistsKey(event, "body").result != true) {
                
                logger.error("Body could not be found inside the event.");

                throw new Error("Bad request.")
            }

            return new schema.Operation({
                success : true,
                data : { 
                    body : event.body
                }
            })
        }
        catch(e) {
            logger.debug(`Validation failed for event body. ${ e.stack }`);

            return new schema.Operation({
                error : new Error(e.message)
            })
        }
    }
}