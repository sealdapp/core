"use strict";

/// 3rd party modules
import dotenv from "dotenv";
import axios from "axios";
import crypto, { pbkdf2 } from "crypto";

let env_files = [ 
    '../dev/.env.common',
    '../dev/.env.tests',
    '../dev/.env.creds.aws'
]

dotenv.config({ path: env_files, quiet : true }); // load specific dotenv file

let auth_signin;

export default class Setup {

    /// Test authentication tokens
    TOKEN_ROOT;
    TOKEN_USER;
    TOKEN_UNAUTHORIZED;

    /// Test application jwt tokens
    APP_TOKEN_ROOT;
    APP_TOKEN_USER;

    /// Dummy tokens
    DUMMY_TOKEN_INVALID;
    DUMMY_TOKEN_EXPIRED;

    async init(){

        auth_signin = (await import("../../source/auth_signin.mjs")).handler;

        /// Tokens from authentication component
        this.TOKEN_ROOT = await this.getIdToken(process.env.EMAIL1, process.env.PASSW1);
        this.TOKEN_USER = await this.getIdToken(process.env.EMAIL2, process.env.PASSW2);
        this.TOKEN_UNAUTHORIZED = await this.getIdToken(process.env.EMAIL3, process.env.PASSW3);

        /// Application generated session tokens
        this.APP_TOKEN_ROOT = await this.getSessionToken(this.TOKEN_ROOT);
        this.APP_TOKEN_USER = await this.getSessionToken(this.TOKEN_USER);
    }

    async getSectionTitle(type) {
        if(type === "success") return "𝑆𝑢𝑐𝑐𝑒𝑠𝑠";

        else return "𝐹𝑎𝑖𝑙𝑢𝑟𝑒";
    }
    async resetEnv(){

        dotenv.config({ 
            override : true,
            path: env_files,
            quiet : true
        });
    }


    async getIdToken(email, password) {
        try {

            let apiKey = process.env.API_KEY;

            const res = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                {
                    email,
                    password,
                    returnSecureToken: true,
                }
            );
            return res.data.idToken;
        } catch (error) {
            console.error('Error getting token:', error.response?.data || error.message);
        }
    }

    async getSessionToken(token) {

        /// Call module handler
        let response = await auth_signin({
            body : { oauth_token : token }
        })

        /// Extract session token from cookie
        const match = response.cookies[0].match(/sessionToken=([^;]+)/);
        return match ? match[1] : null;
    }

    async getTokens() {
        return {
            auth : {
                root : this.TOKEN_ROOT,
                user : this.TOKEN_USER,
                unauthorized : this.TOKEN_UNAUTHORIZED
            },
            app : {
                root : this.APP_TOKEN_ROOT,
                user : this.APP_TOKEN_USER
            },
            dummy : {
                invalid : process.env.TOKEN_INVALID,
                expired : process.env.TOKEN_EXPIRED
            }
        }
    }


    async getSampleKeys() {

        /// Generate master key
        const master = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 4096,
                publicExponent: new Uint8Array([ 1, 0, 1 ]), // 65537
                hash: "SHA-256",
            },
            true,
            [ 'encrypt', 'decrypt' ]
        );
        
        /// Export master public key
        const master_public = Buffer.from(await crypto.subtle.exportKey("spki", master.publicKey)).toString("base64");

        /// Generate a random IV value
        const master_password_iv = crypto.getRandomValues(new Uint8Array(12));



        /// Generate random password
        const password = crypto.randomBytes(10).toString('hex'); 

        /// Generate random salt for password
        const password_salt = crypto.getRandomValues(new Uint8Array(16));

        /// Import password key material
        const password_km = await crypto.subtle.importKey(
            'raw',
            (new TextEncoder()).encode(password),
            { name : "PBKDF2"},
            false,
            [ 'deriveKey' ]
        );
        
        /// Derive wrapping key from password key
        const password_wk = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: password_salt,
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
        );


        /// Generate device secret
        const device_secret = await crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );

        /// Generate a random IV value
        const device_secret_iv = crypto.getRandomValues(new Uint8Array(12));


        /// Wrap master key using wrapping key derived from password key
        const master_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: master_password_iv },
            device_secret,   
            await crypto.subtle.exportKey("pkcs8", master.privateKey)
        )).toString("base64");

        /// Wrap device secret using derived password
        const device_secret_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: device_secret_iv },
            password_wk,   
            await crypto.subtle.exportKey("raw", device_secret)
        )).toString("base64");


        /// Generate recovery key
        const recovery = crypto.randomBytes(16).toString('hex'); 

        /// Generate random salt for password
        const recovery_salt = crypto.getRandomValues(new Uint8Array(16));
        
        /// Import recovery key material
        const recovery_km = await crypto.subtle.importKey(
            'raw',
            (new TextEncoder()).encode(recovery),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        /// Derive wrapping key from recovery key material
        const recovery_wk = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: recovery_salt,
                iterations: 100_000,
                hash: 'SHA-256',
            },
            recovery_km,
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            [ 'encrypt', 'decrypt' ]
        );

        /// Generate a random IV value
        const master_recovery_iv = crypto.getRandomValues(new Uint8Array(12));

        /// Wrap master key using wrapping key derived from recovery key
        const master_recovery_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: master_recovery_iv },
            recovery_wk,   
            await crypto.subtle.exportKey("pkcs8", master.privateKey)
        )).toString("base64");




        /** OTHER Device key */
        const device_ecdh = await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256", 
            },
            true, // extractable
            [ "deriveKey", "deriveBits" ]
        );
        /// Generate a random IV value
        const device_ecdh_iv = crypto.getRandomValues(new Uint8Array(12));

        /// Export device ecdh public key into base64 format
        const device_ecdh_public = Buffer.from(await crypto.subtle.exportKey("raw", device_ecdh.publicKey)).toString("base64");

        /// Wrap device ecnd private key using aes key derived from user password
        const device_ecdh_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: device_ecdh_iv },
            password_wk,   
            await crypto.subtle.exportKey("pkcs8", device_ecdh.privateKey)
        )).toString("base64");

        
        const device_ecdsa = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256", // Also valid: P-384, P-521
            },
            true,
            ["sign", "verify"]
        );

        /// Generate a random IV value
        const device_ecdsa_iv = crypto.getRandomValues(new Uint8Array(12));

        /// Export device ecdh public key into base64 format
        const device_ecdsa_public = Buffer.from(await crypto.subtle.exportKey("raw", device_ecdsa.publicKey)).toString("base64");


        /// Wrap device ecnd private key using aes key derived from user password
        const device_ecdsa_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: device_ecdsa_iv },
            password_wk,   
            await crypto.subtle.exportKey("pkcs8", device_ecdsa.privateKey)
        )).toString("base64");

        return {

            master_key : {
                info : {
                    type : "masterKey",
                    version : 1,
                    timestamp : Date.now()
                },
                keys : {
                    rsa : {
                        publicKey : {
                            algorithm : {
                                name : master.publicKey.algorithm.name,
                                modulusLength : master.publicKey.algorithm.modulusLength,
                                hash : master.publicKey.algorithm.hash
                            },
                            usages : master.publicKey.usages,
                            value : master_public
                        },
                        privateKey : {
                            algorithm : {
                                name : master.publicKey.algorithm.name,
                                modulusLength : master.publicKey.algorithm.modulusLength,
                                hash : master.publicKey.algorithm.hash
                            },
                            usages : master.privateKey.usages,
                            value : master_wrapped,
                            iv : Buffer.from(master_password_iv).toString("base64"),
                            wrapper : "root.deviceKey.aes"
                        }
                    }
                }
            },

            recovery_key : {
                info : {
                    type : "recoveryKey",
                    version : 1,
                    timestamp : Date.now()
                },
                keys : {
                    aes : {
                        value : master_recovery_wrapped,
                        iv : Buffer.from(master_recovery_iv).toString("base64"),
                        wrapper : "this.recoveryKey.pbkdf2"
                    },
                    pbkdf2 : {
                        algorithm : {
                            name: 'PBKDF2',
                            salt : Buffer.from(recovery_salt).toString("base64"),
                            iterations: 100_000,
                            hash: 'SHA-256'
                        },
                        derivedAlgorithm : {
                            name : recovery_wk.algorithm.name,
                            length : recovery_wk.algorithm.length
                        },
                        usages : recovery_wk.usages,
                    }
                }
            },
            
            root_key : {
                info : {
                    type : "userKey",
                    version : 1,
                    timestamp : Date.now()
                },
                keys : {
                    aes : {
                        value : device_secret_wrapped,
                        iv : Buffer.from(device_secret_iv).toString("base64"),
                        wrapper : "this.userKey.pbkdf2"
                    },
                    ecdh : {
                        publicKey : {
                            algorithm : {
                                name : device_ecdh.publicKey.algorithm.name,
                                namedCurve : device_ecdh.publicKey.algorithm.namedCurve
                            },
                            usages : device_ecdh.publicKey.usages,
                            value : device_ecdh_public
                        },
                        privateKey : {
                            algorithm : {
                                name : device_ecdh.privateKey.algorithm.name,
                                namedCurve : device_ecdh.privateKey.algorithm.namedCurve
                            },
                            usages : device_ecdh.privateKey.usages,
                            value : device_ecdh_private_wrapped,
                            iv : Buffer.from(device_ecdh_iv).toString("base64"),
                            wrapper : "this.userKey.pbkdf2"
                        }
                    },
                    ecdsa : {
                        publicKey : {
                            algorithm : {
                                name : device_ecdsa.publicKey.algorithm.name,
                                namedCurve : device_ecdsa.publicKey.algorithm.namedCurve
                            },
                            usages : device_ecdsa.publicKey.usages,
                            value : device_ecdsa_public
                        },
                        privateKey : {
                            algorithm : {
                                name : device_ecdsa.privateKey.algorithm.name,
                                namedCurve : device_ecdsa.privateKey.algorithm.namedCurve
                            },
                            usages : device_ecdsa.privateKey.usages,
                            value : device_ecdsa_private_wrapped,
                            iv : Buffer.from(device_ecdsa_iv).toString("base64"),
                            wrapper : "this.userKey.pbkdf2"
                        }

                    },
                    pbkdf2 : {
                        algorithm : {
                            name: 'PBKDF2',
                            salt : Buffer.from(password_salt).toString("base64"),
                            iterations: 100_000,
                            hash: 'SHA-256'
                        },
                        derivedAlgorithm : {
                            name : recovery_wk.algorithm.name,
                            length : recovery_wk.algorithm.length
                        },
                        usages : recovery_wk.usages
                    }
                }
            }
        }
    }
}