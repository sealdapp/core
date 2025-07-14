"use strict";

/// Import 3rd party libraries
import crypto, { subtle } from "crypto";

/// Module scoped variables
let schema;
let logger;
let validate;

/// Constants
const RSA_NAME='RSASSA-PKCS1-v1_5';
const RSA_MODLEN=2048;
const RSA_HASH='SHA-256';

export default class Crypto {

    constructor(__schema, __logger, __validate) {
        
        schema = __schema;
        logger = __logger;
        validate = __validate;

        logger.debug("Instantiated crypto module");
    }

    Create = class {

        static async rsa({ options = {}, extractable = false, usages = []} = {}) {
            
            try {

                logger.debug("Creating new RSA key pair");

                let pair = await crypto.webcrypto.subtle.generateKey(
                    {
                        name: RSA_NAME,
                        modulusLength: RSA_MODLEN,
                        publicExponent: new Uint8Array([1, 0, 1]),
                        hash: RSA_HASH
                    },
                    extractable,
                    usages
                );

                logger.debug(`Successfully generated new RSA key pair.`);

                return new schema.Crypto.Create.RSA({
                    success : true,
                    keys : pair
                })
            }
            catch(e) {

                logger.error(`Failed to generate new key. ${ e.stack }`);

                return new schema.Crypto.Create.RSA({
                    error : new Error(e.message)
                })
            }
        }
    }

    Export = class {

        static async rsa({ key = null, format = "raw" } = {}) {
            try {

                logger.debug(`Exporting RSA key to a [${ format }] format`);

                /// Defines the structure of key to be exported
                let structure;

                /// Ensure key is not null
                if(validate.Type.isNull(key).result == true) throw new Error("Invalid key.");

                /// Ensure key is exportable
                if(key.extractable == false) throw new Error ("Key is not extractable.");

                if(key.type === "private") structure = "pkcs8";
                    
                else if(key.type === "public") structure = "spki";

                else throw new Error("Unsupported rsa key type.");

                logger.debug(`Detected export request for ${ key.type } key. Setting key format structure to [${ structure }]`)

                let exported = await crypto.webcrypto.subtle.exportKey(structure, key);

                if (format === "raw"){

                    return new schema.Crypto.Export.RSA({
                        success : true,
                        format : format,
                        key : exported
                    })
                }
                else if (format == "pem") {
                    logger.debug(`Converting exported key to PEM format..`);

                    /// Convert ArrayBuffer to base64
                    const base64 = Buffer.from(exported).toString('base64');

                    /// Replace with PEM format standard
                    const body = base64.match(/.{1,64}/g).join('\n');

                    /// Indicate whether this is private or public
                    const header = key.type === 'private' ? 'PRIVATE KEY' : 'PUBLIC KEY';

                    /// Concatenate contents
                    let content = `-----BEGIN ${ header }-----\n${ body }\n-----END ${ header }-----`;

                    logger.debug(`Successfully converted exported key into PEM format`);

                    return new schema.Crypto.Export.RSA({
                        success : true,
                        format : format,
                        key : content
                    })
                }
                else throw new Error(`Unsupported RSA export format [${ format }]`)
            }
            catch(e) {

                logger.error(`Failed to export key. ${ e.stack }`);

                return new schema.Crypto.Export.RSA({
                    error : new Error(e.message)
                })
            }
        }
    }
}
