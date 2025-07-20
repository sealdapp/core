"use strict";

/// 3rd party modules
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";

let env_files = [ 
    '../dev/.env.common',
    '../dev/.env.tests',
    '../dev/.env.creds.aws'
]

dotenv.config({ path: env_files }); // load specific dotenv file

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
    async resetEnv(){

        dotenv.config({ 
            override : true,
            path: env_files
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

        /// Generate random password
        const password = crypto.randomBytes(8).toString('hex'); 

        /// Generate random salt for password
        const password_salt = crypto.getRandomValues(new Uint8Array(16));

        /// Generate recovery key
        const recovery = crypto.randomBytes(16).toString('hex'); 

        /// Generate random salt for password
        const recovery_salt = crypto.getRandomValues(new Uint8Array(16));

        /// Generate master key
        const master = await crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt']
        );

        /// Import password key material
        const password_km = await crypto.subtle.importKey(
            'raw',
            (new TextEncoder()).encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
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
                name: 'AES-KW',
                length: 256,
            },
            true,
            ['wrapKey', 'unwrapKey']
        );

        /// Wrap master key using wrapping key derived from password key
        const master_password_wrapped = Buffer.from(await crypto.subtle.wrapKey(
            'jwk',         // format of key to wrap
            master,     // key to be wrapped
            password_wk,   // wrapping key
            'AES-KW'       // wrapping algorithm
        )).toString("base64");

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
                name: 'AES-KW',
                length: 256,
            },
            true,
            ['wrapKey', 'unwrapKey']
        );

        /// Wrap master key using wrapping key derived from recovery key
        const master_recovery_wrapped = Buffer.from(await crypto.subtle.wrapKey(
            'jwk',         // format of key to wrap
            master,     // key to be wrapped
            recovery_wk,   // wrapping key
            'AES-KW'       // wrapping algorithm
        )).toString("base64");

        return {
            master_key : {
                type : "wrappedJWK",
                wrappedKey : master_password_wrapped,
                algorithm : "AES-KW"
            },
            recovery_key : {
                type : "wrappedJWK",
                wrappedKey : master_recovery_wrapped,
                algorithm : "AES-KW"
            },
            root_key : {
                type : "deviceKey",
                salt : Buffer.from(password_salt).toString("base64"),
                iterations : 100_000,
                hash : 'SHA-256',
                algorithm : "AES-KW",
                length : 256
            }
        }
    }
}