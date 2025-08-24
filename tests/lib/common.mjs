"use strict";

/// 3rd party modules
import dotenv from "dotenv";
import crypto from "crypto";

let env_files = [ 
    '../dev/.env.common',
    '../dev/.env.tests',
    '../dev/.env.creds.aws'
]

dotenv.config({ path: env_files, quiet : true }); // load specific dotenv file

let auth_signin;

export default class Common {

    static Keys = class {

        static async GenerateRandomHex(length){ return crypto.randomBytes(length).toString('hex'); }

        static async GenerateRandomBytes(length){ return crypto.getRandomValues(new Uint8Array(length)); }

        static async CreatePasswordKey(password, salt){

            /// Import password key material
            const password_km = await crypto.subtle.importKey(
                'raw',
                (new TextEncoder()).encode(password),
                { name : "PBKDF2"},
                false,
                [ 'deriveKey' ]
            );
            
            /// Derive wrapping key from password key
            return {
                key : await crypto.subtle.deriveKey(
                    {
                        name: 'PBKDF2',
                        salt: salt,
                        iterations: 100_000,
                        hash: 'SHA-256',
                    },
                    password_km,
                    {
                        name: 'AES-GCM',
                        length: 256,
                    },
                    true,
                    [ 'encrypt', 'decrypt' ]
                )
            }
        }

        static async CreateWrappingKey(wrappingKey){

            const key = await crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));

            const wrapped = Buffer.from(await crypto.subtle.encrypt(
                { name : "AES-GCM", iv: iv },
                wrappingKey,   
                await crypto.subtle.exportKey("raw", key)
            )).toString("base64");

            return { key, iv, wrapped };
        }

        static async CreateFolderWrappingKey(wrappingKey){

            const key = await crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));

            /// Parse rsa public key
            let bytes = Buffer.from(wrappingKey.value, "base64");
            bytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

            /// Import rsa public key material
            const public_km = await crypto.subtle.importKey(
                "spki",
                bytes,
                wrappingKey.algorithm,
                false,
                wrappingKey.usages
            )

            /// Encrypt folder wrapping key using rsa public key
            const wrapped = Buffer.from(await crypto.subtle.encrypt(
                { name : wrappingKey.algorithm.name },
                public_km,
                await crypto.subtle.exportKey("raw", key)
            )).toString("base64");

            return { key, iv, wrapped };
        }

        static async CreateFileWrappingKey(wrappingKey){

            const key = await crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));

            /// Parse rsa public key
            let bytes = Buffer.from(wrappingKey.value, "base64");
            bytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

            /// Import rsa public key material
            const public_km = await crypto.subtle.importKey(
                "spki",
                bytes,
                wrappingKey.algorithm,
                false,
                wrappingKey.usages
            )

            /// Encrypt file wrapping key using rsa public key
            const wrapped = Buffer.from(await crypto.subtle.encrypt(
                { name : wrappingKey.algorithm.name },
                public_km,
                await crypto.subtle.exportKey("raw", key)
            )).toString("base64");

            return { key, iv, wrapped };
        }

        static async CreateWrappedRSA(wrappingKey){
            
            const key = await crypto.subtle.generateKey(
                    {
                    name: 'RSA-OAEP',
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([ 1, 0, 1 ]),
                    hash: "SHA-256",
                },
                true,
                [ 'encrypt', 'decrypt' ]
            );

            /// Generate a random IV value
            const iv = crypto.getRandomValues(new Uint8Array(12));

            /// Export master public key
            const rsa_public = Buffer.from(await crypto.subtle.exportKey("spki", key.publicKey)).toString("base64");

            /// Wrap device rsa private key using aes device key
            const rsa_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
                { name : "AES-GCM", iv: iv },
                wrappingKey,   
                await crypto.subtle.exportKey("pkcs8", key.privateKey)
            )).toString("base64");

            return { key, iv, rsa_public, rsa_private_wrapped }
        }

        static async CreateWrappedECDH(wrappingKey){

            const key = await crypto.subtle.generateKey(
                {
                    name: "ECDH",
                    namedCurve: "P-256", 
                },
                true, // extractable
                [ "deriveKey", "deriveBits" ]
            );

            /// Generate a random IV value
            const iv = crypto.getRandomValues(new Uint8Array(12));
    
            /// Export device ecdh public key into base64 format
            const ecdh_public = Buffer.from(await crypto.subtle.exportKey("raw", key.publicKey)).toString("base64");
    
            /// Wrap device ecnd private key using aes key derived from user password
            const ecdh_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
                { name : "AES-GCM", iv: iv },
                wrappingKey,   
                await crypto.subtle.exportKey("pkcs8", key.privateKey)
            )).toString("base64");

            return { key, iv, ecdh_public, ecdh_private_wrapped }
        }

        static async CreateWrappedECDSA(wrappingKey){

            const key = await crypto.subtle.generateKey(
                {
                    name: "ECDSA",
                    namedCurve: "P-256", // Also valid: P-384, P-521
                },
                true,
                ["sign", "verify"]
            );
    
            /// Generate a random IV value
            const iv = crypto.getRandomValues(new Uint8Array(12));
    
            /// Export device ecdh public key into base64 format
            const ecdsa_public = Buffer.from(await crypto.subtle.exportKey("raw", key.publicKey)).toString("base64");
    
            /// Wrap device ecnd private key using aes key derived from user password
            const ecdsa_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
                { name : "AES-GCM", iv: iv },
                wrappingKey,   
                await crypto.subtle.exportKey("pkcs8", key.privateKey)
            )).toString("base64");

            return { key, iv, ecdsa_public, ecdsa_private_wrapped }
        }

        static async CreateWrappedAES(wrappingKey){

            const key = await crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );
    
            /// Generate a random IV value
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const aes_wrapped = Buffer.from(await crypto.subtle.encrypt(
                { name : "AES-GCM", iv: iv },
                wrappingKey,   
                await crypto.subtle.exportKey("raw", key)
            )).toString("base64");

            return { key, iv, aes_wrapped }
        }
    }

}