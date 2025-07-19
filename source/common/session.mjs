"use strict";

/// Import 3rd part libraries
import jwt from "jsonwebtoken";

/// Module-scoped variables
let schema;
let logger;
let validate;
let crypto;
let secret;

export default class Session {
    
    #cache;

    constructor(__schema, __logger, __validate, __crypto, __secret) {

        /// Set module varaibles
        schema = __schema;
        logger = __logger;
        validate = __validate;
        crypto = __crypto;
        secret = __secret;

        /// Validate if jwt token issuer is defined
        if(validate.Property.isExistsKey(process.env, "APP_JWT_ISSUER").result == false) throw new Error("APP_JWT_ISSUER is not defined.");

        /// Validate if jwt token expiry configuration is defined
        if(validate.Property.isExistsKey(process.env, "APP_JWT_TOKEN_EXPIRY").result == false) throw new Error("APP_JWT_TOKEN_EXPIRY is not defined.");

        this.#cache = new Cache();

        logger.debug("firebase plugin instantiated.")
    }

    async init(){
        
        try{

            logger.debug(`Initializing session handler.`);

            /// Trigger initial retrieval of keys to force caching
            let jwt_keys_cached = await this.#cache.getKeys();

            /// Ensure caching of jwt public key is successful
            if(jwt_keys_cached.success == false) throw jwt_keys_cached.error;

            return new schema.Operation({
                success : true
            })
        }
        catch(e) {

            logger.error(`Failed to initialize session handler. ${ e.stack }`);

            return new schema.Operation({
                error : new Error(e.message)
            })
        }
    }

    
    async generate_token({ payload = {} } = {}){
        try {

            logger.debug(`Generating new JWT token for username [${ payload.username }]`)

            const secret = await this.#cache.getKeys();

            /// Ensure retrieval of secret from cache is successful
            if(secret.success == false) throw secret.error;

            const options = {
                algorithm: 'RS256',
                expiresIn: process.env.APP_JWT_TOKEN_EXPIRY,
                issuer: process.env.APP_JWT_ISSUER
            };
            
            logger.debug("Signing new JWT token for user.")

            const token = jwt.sign(
                Object.assign({}, payload), 
                secret.data.keyPair.value.private, 
                options
            );

            logger.debug(`Successfully signed new token for user [${ payload.username }]`)
            
            return new schema.Operation({
                success : true,
                data : { token }
            })
        }
        catch(e) {

            logger.error(`Failed to generate new token. ${ e.stack }`);

            return new schema.Operation({
                error : new Error(e.message)
            })
        }
    }

    async verify_token({ token = "" }) {
        try {

            logger.debug("Verifying token...");

            /// Ensure token is not empty
            if(validate.String.isEmpty(token).result == true) throw new Error("Token cannot be empty.");

            /// Retrieve keys from cache
            const secret = await this.#cache.getKeys();

            /// Ensure retrieval of secret from cache is successful
            if(secret.success == false) throw secret.error;

            /// Verify the token
            let payload = jwt.verify(token, secret.data.keyPair.value.public, {
                algorithms: ['RS256']
            });

            /// Ensure issuer is this application
            if(payload.iss != process.env.APP_JWT_ISSUER) throw new Error("Invalid issuer.");

            logger.debug(`Successfully verified token.`);

            return new schema.Operation({
                success : true,
                data : { isAuthorized : true }
            })
        }
        catch(e) {
            logger.debug(`Failed to verify token. ${ e.stack }`);

            return new schema.Operation({
                error : new Error(e.message)
            })
        }
    }

    async rotate_keys() {

        try{

            logger.debug("Rotating JWT session key pair.");

            /// Create new RSA key pair
            let key = await crypto.Create.rsa({
                extractable : true,
                usages : ["sign", "verify"]
            });

            /// Ensure key creation is successful
            if(key.success == false) throw key.error;

            /// Export private key
            let privateKey = await crypto.Export.rsa({
                key : key.privateKey,
                convert : true,
                format : "pem"
            })

            /// Ensure private key was exported successfully
            if(privateKey.success == false) throw privateKey.error;

            /// Export public key
            let publicKey = await crypto.Export.rsa({
                key : key.publicKey,
                convert : true,
                format : "pem"
            })

            /// Ensure public key was exported succesfully
            if(publicKey.success == false) throw publicKey.error;

            /// Upload keys to secrets 
            let uploaded = await secret.set({
                name : process.env.SECRET_JWT_PRIVATE,
                value : JSON.stringify({
                    private : privateKey.key,
                    public : publicKey.key
                })
            });

            /// Ensure uploading of keys to secrets is successful
            if(uploaded.success == false) throw uploaded.error;

            return new schema.Operation({
                success : true
            })
        }
        catch(e){

            logger.error(`Failed to refresh jwt keys. ${ e.stack }`);

            return new schema.Operation({
                error : new Error(e.message)
            })
        }
    }
}

const Cache = class {

    #keyPair = null;

    async getKeys() {

        try {

            logger.debug(`Retrieving keys from cache...`);

            /// Check if keypair is not yet cached
            if(validate.Type.isNull(this.#keyPair).result == true) {

                logger.debug("Key pair was not found locally.")

                /// If it doesn't, get jwt keys
                let retrieved = await this.#downloadJWTKeys();

                /// Ensure retrieval of jwt key was successful
                if(retrieved.success == false) throw retrieved.error;

                logger.debug("Updating local cache.")
                
                /// Store values in-memory
                this.#keyPair = retrieved.data.secret;

            }

            else{
                
                /// Force download jwt keys if keys doesn't match Month
                if(new Date(Date.now()).getMonth() != new Date(this.#keyPair.lastModified).getMonth()) {

                    logger.debug("Key pair timestamp mismatch.")

                    /// If it doesn't, get jwt keys
                    let retrieved = await this.#downloadJWTKeys();

                    /// Ensure retrieval of jwt key was successful
                    if(retrieved.success == false) throw retrieved.error;

                    logger.debug("Updating local cache.")
                    
                    /// Store values in-memory
                    this.#keyPair = retrieved.data.secret;
                }
            }

            /// Return cached value
            return new schema.Operation({
                success : true,
                data : {
                    keyPair : this.#keyPair
                }
            })
        }
        catch(e) {

            logger.error(`Failed to cache jwt keys. ${ e.stack }`);

            return new schema.Operation({
                error : new Error(e.message)
            })
        }
    }

    async #downloadJWTKeys(){

        try{

            let keyPair

            logger.debug("Downloading jwt private key from parameter store");
            
            /// Retrieve jwt private key
            let keys = await secret.get({
                name : process.env.SECRET_JWT_PRIVATE
            })

            /// Ensure retrieval of jwt keys is successful
            if(keys.success == false) throw keys.error;

            /// Ensure that the parameter resource exists
            if(keys.data.secret.exists == false) throw new Error("Secret resource does not exists.");
            
            /// Try to parse downloaded keys
            keyPair = JSON.parse(keys.data.secret.value)

            /// Rotate jwt key if value is not in expected format
            if(await validate.Property.isExistsKeys(keyPair, [ "private", "public" ]).result == false) {

                throw new Error("Keys are not a valid value.");
                
            }

            /// Parse value of actual secret
            keys.data.secret.value = JSON.parse(keys.data.secret.value)

            logger.debug(`Successfully retrieved private key for jwt`)

            return keys;
        }
        catch(e) {

            logger.error(`Failed to get jwt keys. ${ e.stack }`);

            return new schema.Operation({
                error : new Error(e.message)
            })
        }
    }
}