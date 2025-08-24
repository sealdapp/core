"use strict";

/// 3rd party modules
import dotenv from "dotenv";
import axios from "axios";
import crypto, { pbkdf2 } from "crypto";
import Common from "./common.mjs";

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

    /// Test application user's id
    APP_ID_ROOT;
    APP_ID_USER;

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
        const root = await this.getSessionToken(this.TOKEN_ROOT);
        this.APP_TOKEN_ROOT = root.token;
        this.APP_ID_ROOT = root.id;

        const user = await this.getSessionToken(this.TOKEN_USER);
        this.APP_TOKEN_USER = user.token;
        this.APP_ID_USER = user.id;
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

        const data = JSON.parse(response.body);

        /// Extract session token from cookie
        const match = response.cookies[0].match(/sessionToken=([^;]+)/);
        return {
            token : match ? match[1] : null,
            id : data.user_id
        }
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

    async createFolder({ name, description, type }){

        /// Generate folder wrapping secret
        const folder_key = await crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );

        /// Generate folder wrapping secret iv
        const folder_iv = crypto.getRandomValues(new Uint8Array(12));
        

        /// Generage folder key
        const folder_rsa = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 4096,
                publicExponent: new Uint8Array([ 1, 0, 1 ]), // 65537
                hash: "SHA-256",
            },
            true,
            [ 'encrypt', 'decrypt' ]
        );

        /// Export folder key public key
        const folder_rsa_public = Buffer.from(await crypto.subtle.exportKey("spki", folder_rsa.publicKey)).toString("base64");

        /// Wrap folder key private key using folder wrapping secret
        const folder_rsa_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: folder_iv },
            folder_key,   
            await crypto.subtle.exportKey("pkcs8", folder_rsa.privateKey)
        )).toString("base64");

        /// Generate folder signing key
        const folder_ecdsa = await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256", // Also valid: P-384, P-521
            },
            true,
            ["sign", "verify"]
        );

        /// Export device ecdh public key into base64 format
        const folder_ecdsa_public = Buffer.from(await crypto.subtle.exportKey("raw", folder_ecdsa.publicKey)).toString("base64");

        /// Wrap device ecnd private key using aes key derived from user password
        const folder_ecdsa_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: folder_iv },
            folder_key,   
            await crypto.subtle.exportKey("pkcs8", folder_ecdsa.privateKey)
        )).toString("base64");

        /// Get folder name
        const folder_name = await encrypt(name)

        /// Generate properties file
        const properties = {
            name : folder_name,
            description : await encrypt(description),
            type : type
        }

        async function encrypt(data){
            return Buffer.from(await crypto.subtle.encrypt(
                { name : folder_key.algorithm.name, iv : folder_iv },
                folder_key,
                new TextEncoder().encode(data)
            )).toString("base64")
        }

        async function getWrappedKey(key) {

            /// Parse builtin master public key
            let buffer_master = Buffer.from(key.value, "base64");
            buffer_master = buffer_master.buffer.slice(buffer_master.byteOffset, buffer_master.byteOffset + buffer_master.byteLength);

            /// Import builtin master public key material
            const public_km = await crypto.subtle.importKey(
                "spki",
                buffer_master,
                key.algorithm,
                false,
                key.usages
            )

            /// Encrypt new folder key with master key
            return Buffer.from(await crypto.subtle.encrypt(
                { name : key.algorithm.name },
                public_km,
                await crypto.subtle.exportKey("raw", folder_key)
            )).toString("base64");
        }

        const folder_master_wrapped = await getWrappedKey(builtin_keys.master);
        const folder_root_wrapped = await getWrappedKey(builtin_keys.root);
        
        return {
            
            /// Folder wrapped with master key
            folderKey : {
                info : {
                    type : "folderKey",
                    version : 1,
                    timestamp : Date.now()
                },
                keys : {
                    rsa : {
                        publicKey : {
                            algorithm : {
                                name : folder_rsa.publicKey.algorithm.name,
                                modulusLength : folder_rsa.publicKey.algorithm.modulusLength,
                                hash : folder_rsa.publicKey.algorithm.hash
                            },
                            usages : folder_rsa.publicKey.usages,
                            value : folder_rsa_public
                        },
                        privateKey : {
                            algorithm : {
                                name : folder_rsa.publicKey.algorithm.name,
                                modulusLength : folder_rsa.publicKey.algorithm.modulusLength,
                                hash : folder_rsa.publicKey.algorithm.hash
                            },
                            usages : folder_rsa.privateKey.usages,
                            value : folder_rsa_private_wrapped,
                            iv : Buffer.from(folder_iv).toString("base64"),
                            wrapper : `this.folderKey.secret`
                        }
                    },
                    ecdsa : {
                        publicKey : {
                            algorithm : {
                                name : folder_ecdsa.publicKey.algorithm.name,
                                namedCurve : folder_ecdsa.publicKey.algorithm.namedCurve
                            },
                            usages : folder_ecdsa.publicKey.usages,
                            value : folder_ecdsa_public
                        },
                        privateKey : {
                            algorithm : {
                                name : folder_ecdsa.privateKey.algorithm.name,
                                namedCurve : folder_ecdsa.privateKey.algorithm.namedCurve
                            },
                            usages : folder_ecdsa.privateKey.usages,
                            value : folder_ecdsa_private_wrapped,
                            iv : Buffer.from(folder_iv).toString("base64"),
                            wrapper : `this.folderKey.secret`
                        }

                    },
                    secret : {
                        value : folder_master_wrapped,
                        iv : Buffer.from(folder_iv).toString("base64"),
                        wrapper : "masterKey.rsa.public"
                    },
                }
            },

            /// Folder wrapped with root key
            authorized_keys : [
                {
                    info : {
                        type : "folderKey",
                        version : 1,
                        timestamp : Date.now()
                    },
                    keys : {
                        secret : {
                            value : folder_root_wrapped,
                            iv : Buffer.from(folder_iv).toString("base64"),
                            wrapper : `root.userKey.rsa.public`
                        },
                    }
                }
            ]
        }
    }


    async getSampleKeys() {

        /**
         * PASSWORD AND RECOVERY PHRASE
         */
        /// Generate random password
        const password_value = await Common.Keys.GenerateRandomHex(10);

        /// Generate random salt for password
        const password_salt = await Common.Keys.GenerateRandomBytes(16);

        /// Generate key material from password value and salt
        const password = await Common.Keys.CreatePasswordKey(password_value, password_salt)

        /// Generate random recovery phrase
        const passphrase_value = await Common.Keys.GenerateRandomHex(32);

        /// Generate random salt for recovery phrase
        const passphrase_salt = await Common.Keys.GenerateRandomBytes(16);

        /// Generate key material from recovery phrase and salt
        const passphrase = await Common.Keys.CreatePasswordKey(passphrase_value, passphrase_salt)



        /**
         * USER KEY
         */
        /// Generate user key encryption key
        const user_kek = await Common.Keys.CreateWrappingKey(password.key);

        /// Generate user secret
        const user_secret = await Common.Keys.CreateWrappedAES(user_kek.key);

        /// Generate user rsa keys
        const user_rsa = await Common.Keys.CreateWrappedRSA(user_kek.key);

        /// Generate user ecdh keys
        const user_ecdh = await Common.Keys.CreateWrappedECDH(user_kek.key);

        /// Generate user ecdsa keys
        const user_ecdsa = await Common.Keys.CreateWrappedECDSA(user_kek.key);

        /**
         * RECOVERY KEY
         */
        /// Generate recovery key key encryption key
        const recovery_kek = await Common.Keys.CreateWrappingKey(passphrase.key);

        /// Generate recovery secret
        const recovery_secret = await Common.Keys.CreateWrappedAES(recovery_kek.key);

        /// Generate recovery rsa keys
        const recovery_rsa = await Common.Keys.CreateWrappedRSA(recovery_kek.key);

        /// Generate recovery ecdh keys
        const recovery_ecdh = await Common.Keys.CreateWrappedECDH(recovery_kek.key);

        /// Generate recovery ecdsa keys
        const recovery_ecdsa = await Common.Keys.CreateWrappedECDSA(recovery_kek.key);



        /**
         * KEYCHAINS
         */
        /// Recovery keychain
        const recovery_key = {
            info : {
                type : "recoveryKey",
                version : 1,
                timestamp : Date.now()
            },
            keys : {
                cipher: {
                    publicKey : {
                        algorithm : {
                            name : recovery_rsa.key.publicKey.algorithm.name,
                            modulusLength : recovery_rsa.key.publicKey.algorithm.modulusLength,
                            hash : recovery_rsa.key.publicKey.algorithm.hash
                        },
                        usages : recovery_rsa.key.publicKey.usages,
                        value : recovery_rsa.rsa_public
                    },
                    privateKey : {
                        algorithm : {
                            name : recovery_rsa.key.publicKey.algorithm.name,
                            modulusLength : recovery_rsa.key.publicKey.algorithm.modulusLength,
                            hash : recovery_rsa.key.publicKey.algorithm.hash
                        },
                        usages : recovery_rsa.key.privateKey.usages,
                        value : recovery_rsa.rsa_private_wrapped,
                        iv : Buffer.from(recovery_rsa.iv).toString("base64"),
                        wrapper : `root.recoveryKey.kek`
                    }
                },

                signing : {
                    publicKey : {
                        algorithm : {
                            name : recovery_ecdsa.key.publicKey.algorithm.name,
                            namedCurve : recovery_ecdsa.key.publicKey.algorithm.namedCurve
                        },
                        usages : recovery_ecdsa.key.publicKey.usages,
                        value : recovery_ecdsa.ecdsa_public
                    },
                    privateKey : {
                        algorithm : {
                            name : recovery_ecdsa.key.privateKey.algorithm.name,
                            namedCurve : recovery_ecdsa.key.privateKey.algorithm.namedCurve
                        },
                        usages : recovery_ecdsa.key.privateKey.usages,
                        value : recovery_ecdsa.ecdsa_private_wrapped,
                        iv : Buffer.from(recovery_ecdsa.iv).toString("base64"),
                        wrapper : `root.recoveryKey.kek`
                    }
                },

                exchange : {
                    publicKey : {
                        algorithm : {
                            name : recovery_ecdh.key.publicKey.algorithm.name,
                            namedCurve : recovery_ecdh.key.publicKey.algorithm.namedCurve
                        },
                        usages : recovery_ecdh.key.publicKey.usages,
                        value : recovery_ecdh.ecdh_public
                    },
                    privateKey : {
                        algorithm : {
                            name : recovery_ecdh.key.privateKey.algorithm.name,
                            namedCurve : recovery_ecdh.key.privateKey.algorithm.namedCurve
                        },
                        usages : recovery_ecdh.key.privateKey.usages,
                        value : recovery_ecdh.ecdh_private_wrapped,
                        iv : Buffer.from(recovery_ecdh.iv).toString("base64"),
                        wrapper : `root.recoveryKey.kek`
                    }

                },

                secret : {
                    value : recovery_secret.wrapped,
                    iv : Buffer.from(recovery_secret.iv).toString("base64"),
                    wrapper : `root.recoveryKey.kek`
                },

                kek : {
                    value : recovery_kek.wrapped,
                    iv : Buffer.from(recovery_kek.iv).toString("base64"),
                    wrapper : `root.recoveryKey.passphrase`
                },

                passphrase : {
                    algorithm : {
                        name: 'PBKDF2',
                        salt : Buffer.from(passphrase_salt).toString("base64"),
                        iterations: 100_000,
                        hash: 'SHA-256'
                    },
                    derivedAlgorithm : {
                        name : passphrase.key.algorithm.name,
                        length : passphrase.key.algorithm.length
                    },
                    usages : passphrase.key.usages,
                }
            }
        }

        /// User keychain
        const user_key = {
            info : {
                type : "userKey",
                version : 1,
                timestamp : Date.now()
            },
            keys : {
                cipher: {
                    publicKey : {
                        algorithm : {
                            name : user_rsa.key.publicKey.algorithm.name,
                            modulusLength : user_rsa.key.publicKey.algorithm.modulusLength,
                            hash : user_rsa.key.publicKey.algorithm.hash
                        },
                        usages : user_rsa.key.publicKey.usages,
                        value : user_rsa.rsa_public
                    },
                    privateKey : {
                        algorithm : {
                            name : user_rsa.key.publicKey.algorithm.name,
                            modulusLength : user_rsa.key.publicKey.algorithm.modulusLength,
                            hash : user_rsa.key.publicKey.algorithm.hash
                        },
                        usages : user_rsa.key.privateKey.usages,
                        value : user_rsa.rsa_private_wrapped,
                        iv : Buffer.from(user_rsa.iv).toString("base64"),
                        wrapper : `${ this.APP_ID_ROOT }.userKey.kek`
                    }
                },

                signing : {
                    publicKey : {
                        algorithm : {
                            name : user_ecdsa.key.publicKey.algorithm.name,
                            namedCurve : user_ecdsa.key.publicKey.algorithm.namedCurve
                        },
                        usages : user_ecdsa.key.publicKey.usages,
                        value : user_ecdsa.ecdsa_public
                    },
                    privateKey : {
                        algorithm : {
                            name : user_ecdsa.key.privateKey.algorithm.name,
                            namedCurve : user_ecdsa.key.privateKey.algorithm.namedCurve
                        },
                        usages : user_ecdsa.key.privateKey.usages,
                        value : user_ecdsa.ecdsa_private_wrapped,
                        iv : Buffer.from(user_ecdsa.iv).toString("base64"),
                        wrapper : `${ this.APP_ID_ROOT }.userKey.kek`
                    }
                },

                exchange : {
                    publicKey : {
                        algorithm : {
                            name : user_ecdh.key.publicKey.algorithm.name,
                            namedCurve : user_ecdh.key.publicKey.algorithm.namedCurve
                        },
                        usages : user_ecdh.key.publicKey.usages,
                        value : user_ecdh.ecdh_public
                    },
                    privateKey : {
                        algorithm : {
                            name : user_ecdh.key.privateKey.algorithm.name,
                            namedCurve : user_ecdh.key.privateKey.algorithm.namedCurve
                        },
                        usages : user_ecdh.key.privateKey.usages,
                        value : user_ecdh.ecdh_private_wrapped,
                        iv : Buffer.from(user_ecdh.iv).toString("base64"),
                        wrapper : `${ this.APP_ID_ROOT }.userKey.kek`
                    }

                },

                secret : {
                    value : user_secret.wrapped,
                    iv : Buffer.from(user_secret.iv).toString("base64"),
                    wrapper : `${ this.APP_ID_ROOT }.userKey.kek`
                },

                kek : {
                    value : user_kek.wrapped,
                    iv : Buffer.from(user_kek.iv).toString("base64"),
                    wrapper : `${ this.APP_ID_ROOT }.userKey.password`
                },

                password : {
                    algorithm : {
                        name: 'PBKDF2',
                        salt : Buffer.from(password_salt).toString("base64"),
                        iterations: 100_000,
                        hash: 'SHA-256'
                    },
                    derivedAlgorithm : {
                        name : password.key.algorithm.name,
                        length : password.key.algorithm.length
                    },
                    usages : password.key.usages,
                }
            },
            properties : {
                payload : {
                    authorization: {
                        roles : [ "root" ]
                    }
                },
                signature : ""
            }
        }
        
        /**
         * FOLDER KEYS
         */
        /// Generate folder_usrmgr key key encryption key
        const folder_usrmgr_kek = await Common.Keys.CreateFolderWrappingKey(user_key.keys.cipher.publicKey);

        /// Generate folder_usrmgr secret
        const folder_usrmgr_secret = await Common.Keys.CreateWrappedAES(folder_usrmgr_kek.key);

        /// Generate folder_usrmgr rsa keys
        const folder_usrmgr_rsa = await Common.Keys.CreateWrappedRSA(folder_usrmgr_kek.key);

        /// Generate folder_usrmgr ecdh keys
        const folder_usrmgr_ecdh = await Common.Keys.CreateWrappedECDH(folder_usrmgr_kek.key);

        /// Generate folder_usrmgr ecdsa keys
        const folder_usrmgr_ecdsa = await Common.Keys.CreateWrappedECDSA(folder_usrmgr_kek.key);

        /// Folder keychain
        const folder_usrmsgr_key = {
            info : {
                type : "folderKey",
                version : 1,
                timestamp : Date.now()
            },
            keys : {
                cipher: {
                    publicKey : {
                        algorithm : {
                            name : folder_usrmgr_rsa.key.publicKey.algorithm.name,
                            modulusLength : folder_usrmgr_rsa.key.publicKey.algorithm.modulusLength,
                            hash : folder_usrmgr_rsa.key.publicKey.algorithm.hash
                        },
                        usages : folder_usrmgr_rsa.key.publicKey.usages,
                        value : folder_usrmgr_rsa.rsa_public
                    },
                    privateKey : {
                        algorithm : {
                            name : folder_usrmgr_rsa.key.publicKey.algorithm.name,
                            modulusLength : folder_usrmgr_rsa.key.publicKey.algorithm.modulusLength,
                            hash : folder_usrmgr_rsa.key.publicKey.algorithm.hash
                        },
                        usages : folder_usrmgr_rsa.key.privateKey.usages,
                        value : folder_usrmgr_rsa.rsa_private_wrapped,
                        iv : Buffer.from(folder_usrmgr_rsa.iv).toString("base64"),
                        wrapper : `this.folderKey.kek`
                    }
                },

                signing : {
                    publicKey : {
                        algorithm : {
                            name : folder_usrmgr_ecdsa.key.publicKey.algorithm.name,
                            namedCurve : folder_usrmgr_ecdsa.key.publicKey.algorithm.namedCurve
                        },
                        usages : folder_usrmgr_ecdsa.key.publicKey.usages,
                        value : folder_usrmgr_ecdsa.ecdsa_public
                    },
                    privateKey : {
                        algorithm : {
                            name : folder_usrmgr_ecdsa.key.privateKey.algorithm.name,
                            namedCurve : folder_usrmgr_ecdsa.key.privateKey.algorithm.namedCurve
                        },
                        usages : folder_usrmgr_ecdsa.key.privateKey.usages,
                        value : folder_usrmgr_ecdsa.ecdsa_private_wrapped,
                        iv : Buffer.from(folder_usrmgr_ecdsa.iv).toString("base64"),
                        wrapper : `this.folderKey.kek`
                    }
                },

                exchange : {
                    publicKey : {
                        algorithm : {
                            name : folder_usrmgr_ecdh.key.publicKey.algorithm.name,
                            namedCurve : folder_usrmgr_ecdh.key.publicKey.algorithm.namedCurve
                        },
                        usages : folder_usrmgr_ecdh.key.publicKey.usages,
                        value : folder_usrmgr_ecdh.ecdh_public
                    },
                    privateKey : {
                        algorithm : {
                            name : folder_usrmgr_ecdh.key.privateKey.algorithm.name,
                            namedCurve : folder_usrmgr_ecdh.key.privateKey.algorithm.namedCurve
                        },
                        usages : folder_usrmgr_ecdh.key.privateKey.usages,
                        value : folder_usrmgr_ecdh.ecdh_private_wrapped,
                        iv : Buffer.from(folder_usrmgr_ecdh.iv).toString("base64"),
                        wrapper : `this.folderKey.kek`
                    }

                },

                secret : {
                    value : folder_usrmgr_secret.wrapped,
                    iv : Buffer.from(folder_usrmgr_secret.iv).toString("base64"),
                    wrapper : `this.folderKey.kek`
                },

                kek : {
                    value : folder_usrmgr_kek.wrapped,
                    iv : Buffer.from(folder_usrmgr_kek.iv).toString("base64"),
                    wrapper : `${ this.APP_ID_ROOT }.userKey.cipher.public`
                }
            }
        }

        /**
         * USER MANAGER FILES
         */
        /// Generate file key key encryption key
        const authorizer_kek = await Common.Keys.CreateFileWrappingKey(folder_usrmsgr_key.keys.cipher.publicKey);


        /// Generate file for system authorizer key
        const authorizer = await crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256'
            },
            true, // extractable
            ['sign', 'verify']
        );

        /// Sign role using system authorizer key
        const signature = Buffer.from(await crypto.subtle.sign(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' }
            },
            authorizer.privateKey,
            Buffer.from(JSON.stringify(user_key.properties.payload), 'utf-8')
        )).toString("base64")

        /// Inject signature to user key
        user_key.properties.signature = signature;
            
        /// Export device ecdh public key into base64 format
        const authorizer_public = Buffer.from(await crypto.subtle.exportKey("raw", authorizer.publicKey)).toString("base64");

        /// Wrap authorizer private key
        const authorizer_private_wrapped = Buffer.from(await crypto.subtle.encrypt(
            { name : "AES-GCM", iv: authorizer_kek.iv },
            authorizer_kek.key,   
            await crypto.subtle.exportKey("pkcs8", authorizer.privateKey)
        )).toString("base64");

        console.log(authorizer_public);
        console.log(authorizer_private_wrapped);

        return { user_key, recovery_key }
    }
}