"use strict";

const { log } = require("console");
const crypto = require("crypto");

module.exports = function(logger){

    let methods = {};

    methods.hash = {
        string : {
            sha256 : async function(string, format){

                try {

                    logger.debug(`Getting sha256 hash of string.`);

                    /// Create new crypto hash instance for sha256
                    const hash = await crypto.createHash("sha256");

                    /// Set container for output
                    let output;

                    /// Instantiate hash with the string input
                    hash.update(string);
    
                    /// If digest output format is indicated, digest to format specified
                    if(format){
                        /// Convert output to format specified
                        output = hash.digest(format);
                    }
                    /// Otherwise, return digest in raw format
                    else{
                        /// Convert outpout to raw format
                        output = hash.digest();
                    }

                    return {
                        success : true,
                        msg : "",
                        data : output
                    }
                }
                catch(e) {
                    /// Log error to console
                    logger.error(`Failed to calculate sha256 hash of string. ${ e }`);

                    return {
                        success : false,
                        msg : e.toString(),
                        data : {}
                    }
                }
            }
        },
        buffer : {
            sha256 : async function(buffer, format){

                try {

                    logger.debug(`Getting sha256 hash of buffer.`);

                    /// Create new crypto hash instance for sha256
                    const hash = await crypto.createHash("sha256");

                    /// Set container for output
                    let output;

                    /// Instantiate hash with the string input
                    hash.update(buffer);
    
                    /// If digest output format is indicated, digest to format specified
                    if(format){
                        /// Convert output to format specified
                        output = hash.digest(format);
                    }
                    /// Otherwise, return digest in raw format
                    else{
                        /// Convert outpout to raw format
                        output = hash.digest();
                    }

                    return {
                        success : true,
                        msg : "",
                        data : output
                    }
                }
                catch(e) {
                    /// Log error to console
                    logger.error(`Failed to calculate sha256 hash of string. ${ e }`);

                    return {
                        success : false,
                        msg : e.toString(),
                        data : {}
                    }
                }
            }
        }
    }
    
    methods.generate = {

        random : async function(length, hexed) {
            try {

                logger.debug(`Generating random value.`);

                // Generate a random array of bytes
                const randomBuffer = crypto.webcrypto.getRandomValues(new Uint8Array(length));
        
                /// Retrieve hex value from buffer
                if(hexed){
                    return {
                        success : true,
                        msg : "",
                        data : Array.from(randomBuffer).map(byte => byte.toString(16).padStart(2, '0')).join('')
                    }
                }
                else{
                    return {
                        success : true,
                        msg : "",
                        data : randomBuffer
                    }
                }
            } 
            catch (e) {
                // Handle errors during random generation
                logger.error(`Failed to generate random value: ${ e }`);
                
                return {
                    success : false,
                    msg : e.toString(),
                    data : {}
                }
            }
        }
    }
    methods.import = {

        ecdsa_p384_public : async function(format, key, extractable, usages) {

            try {

                logger.debug(`Importing ecdsa p384 public key`);

                // Convert the base64-encoded ciphertext to a Uint8Array
                const bytes = new Uint8Array(Buffer.from(key, 'base64'));

                /// Unwrap the wrapped key using the wrapping key material
                const unwrappedKey = await crypto.webcrypto.subtle.importKey(
                    // Format of the key to return
                    format, 
                    // Key data to unwrap
                    bytes, 
                    // Algorithm details for the unwrapped key
                    { name: 'ECDSA', namedCurve : "P-384" }, 
                    // Key is not extractable
                    extractable, 
                    // Key usage
                    usages 
                );
                
                return {
                    success : true,
                    msg : "",
                    data : unwrappedKey
                }

            }
            catch(e) {
                /// Show actual error on console
                logger.error(`Failed to import ecdsa p384 public key. ${ e }`);

                return {
                    success : false,
                    msg : e.toString(),
                    data : {}
                }
            }
        }
    },

    methods.ecdsa = {

        verifyMessage : async function(key, message, signature, format) {
            try {

                logger.debug(`Verifying ecdsa signed message`);

                /// Convert string to array buffer
                let msg = new TextEncoder().encode(message);

                /// Set container for signature buffer
                let buffer;

                /// Handle buffer input format for signature
                if(format === "buffer") {
                    buffer = signature;
                }
                
                /// Handle base64 encoded input format for signature
                else if(format === "base64") {
                    // Convert the base64-encoded string to a Uint8Array buffer
                    buffer = new Uint8Array(Buffer.from(signature, 'base64'));
                }

                /// Handle unsupported formats
                else{
                    throw `Usupported input format.`
                }


                let result = await crypto.webcrypto.subtle.verify(
                    {
                        name: "ECDSA",
                        hash: { name: "SHA-384" },
                    },
                    key,
                    buffer,
                    msg,
                );

                return {
                    success : true,
                    msg : "",
                    data : result
                }
            }
            catch(e) {
                logger.error(`Failed to verify signature. ${ e }`);
                
                return {
                    success : false,
                    msg : e.toString(),
                    data : {}
                }
            }
        }
    }

    return methods;
}