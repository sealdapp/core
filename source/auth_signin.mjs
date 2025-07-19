"use strict";

/// Import native libraries
import path from 'path';

/// Import application common libraries
import Schema from "./schema/Schema.mjs";
import Logger from "./common/logger.mjs";
import Validator from "./common/validator.mjs";
import Utilities from "./common/utils.mjs";
import Middleware from "./common/middleware.mjs";
import Crypto from "./common/crypto.mjs";
import Session from "./common/session.mjs";
import Platform from "./platform/platform.mjs";

/// Initialize libraries
const logger = new Logger(path); 
const schema = new Schema();
const validate = new Validator(schema, logger);
const utils = new Utilities(schema, logger, validate);
const middleware = new Middleware(schema, logger, validate, utils);
const crypto = new Crypto(schema, logger, validate);
const platform = new Platform(schema, logger, validate);

/// Declaration of plugins
let auth;
let secret;
let storage = {};
let session;

/// Storage path prefix
const USERS_PATH_PREFIX = "users";

await (async function init(){

    logger.info("Initializing application...");

    /// Ensure root user email is defined
    if(validate.Property.isExistsKey(process.env, "ROOT_USER").result == false) throw new Error("ROOT_USER not configured.");

    /// Ensure jwt private key to be used is defined
    if(validate.Property.isExistsKey(process.env, "SECRET_JWT_PRIVATE").result == false) throw new Error("SECRET_JWT_PRIVATE not configured");
    
    /// Load all the plugins for the platform
    let plugins = await platform.load();

    /// Secrets library
    secret = new plugins.Secret(schema, logger, validate);

    /// Initialize secrets plugin
    await middleware.Initializer.initialize(await secret.init());
    
    /// Storage library
    storage.private = new plugins.Storage(schema, logger, validate);
    
    /// Initialize key storage plugin instance
    await middleware.Initializer.initialize(await storage.private.init(process.env.STORAGE_BUCKET_PRIVATE));

    /// Authentication library
    auth = new plugins.Authenticator(schema, logger, validate);

    /// Initialize authenticator plugin
    await middleware.Initializer.initialize(await auth.init());

    logger.info("Plugins successfullly loaded.");

    /// Session manager
    session = new Session(schema, logger, validate, crypto, secret);

    /// Initialize session manager
    await middleware.Initializer.initialize(await session.init());

    logger.info(`Application successfully initialized.`)

})()

export const handler = async(event) => {

    try {

        logger.debug(`Signin attempt detected.`)
        
        /// Ensure event have request body
        if(validate.Property.isExistsKey(event, "body").result == false) return new schema.Response.Auth.Signin({
            statusCode : 400,
            message : "Bad request"
        })

        /// Pass event body to authenticator signin method
        let signed_in = await auth.signin(event.body);

        /// Handle exceptions
        if(signed_in.success == false) throw signed_in.error;
        
        /// Handle invalid authentications
        if(signed_in.authenticated == false) return new schema.Response.Auth.Signin({
            statusCode : 401,
            body : {
                retry: signed_in.retry,
                message : "Failed to authenticate user."
            }
        })


        /// Handle authorization check for root
        if(process.env.ROOT_USER.toLowerCase() === signed_in.username) {

            /// Skip authorization check if the user logged in is the root user
            let generateToken = await session.generate_token({ 
                payload : new schema.Authentication.Token.Payload({
                    user_id : signed_in.userid,
                    username : signed_in.username,
                    root : true
                })
            });

            if(generateToken.success == false) throw generateToken.error;

            logger.info(`Root user [${ signed_in.username }] successfully authenticated!`)
            
            return new schema.Response.Auth.Signin({ 
                statusCode : 200,
                headers : { 'Content-Type': 'text/plain' },
                cookies: [
                    `sessionToken=${ generateToken.data.token }; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`
                ],
                body : {
                    message : "User successfully authenticated!",
                }
            });
        }

        /// Handle authorization check for user
        /// Check if there are keys generated for users
        else{

            /// Draft the expected path of the key
            let key = `${ USERS_PATH_PREFIX }/registered/${ process.env.AUTH_TYPE }/${ signed_in.userid }/key.json`;

            /// Check if user is registered
            let object = await storage.private.headObject(key);
            
            /// Ensure operation is successful
            if(object.success == false) throw object.error;
            
            /// If there are no key issued for user, throw unauthorized
            if(object.exists == false) return new schema.Response.Auth.Signin({
                statusCode : 403,
                body : {
                    retry: signed_in.retry,
                    message : "You are not authorized."
                }
            })
            
            /// Otherwise, return success
            else {
                
                /// Generate a new token for standard user
                let generateToken = await session.generate_token({ 
                    payload : new schema.Authentication.Token.Payload({
                        user_id : signed_in.userid,
                        username : signed_in.username,
                        root : false
                    })
                });

                //// Ensure that the token generation is successful
                if(generateToken.success == false) throw generateToken.error;

                logger.info(`User [${ signed_in.username }] successfully authenticated!`);
            
                return new schema.Response.Auth.Signin({ 
                    statusCode : 200,
                    headers : { 'Content-Type': 'text/plain' },
                    cookies: [
                        `sessionToken=${ generateToken.data.token }; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`
                    ],
                    body : {
                        message : "User successfully authenticated!",
                    }
                });
            }
        }
    }

    catch(e) {

        logger.error(`Something went wrong. ${ e.stack }`)
        
        return new schema.Response.Auth.Signin({ 
            body : {
                message : e.message 
            }
        });
    }
}