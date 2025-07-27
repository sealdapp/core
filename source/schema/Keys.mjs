"use strict";

import Helper from "./Helper.mjs";

export default class Keys {

    static Master = class {

        constructor({ info, metadata, keys }){

            this.keys = {};

            this.info = new Templates.Info(info);
            this.metadata = new Templates.Metadata(metadata);
            this.keys.rsa = new Templates.Keys.RSA(keys.rsa);
        }

    }

    static Recovery = class {

        constructor({ info, metadata, keys }){

            this.keys = {};

            this.info = new Templates.Info(info);
            this.metadata = new Templates.Metadata(metadata);
            this.keys.aes = new Templates.Keys.AES(keys.aes);
            this.keys.pbkdf2 = new Templates.Keys.PBKDF2(keys.pbkdf2);
        }
    }

    static User = class {

        constructor({ info, metadata, keys }){

            this.keys = {};

            this.info = new Templates.Info(info);
            this.metadata = new Templates.Metadata(metadata);
            this.keys.aes = new Templates.Keys.AES(keys.aes);
            this.keys.pbkdf2 = new Templates.Keys.PBKDF2(keys.pbkdf2);
            this.keys.ecdh = new Templates.Keys.ECDH(keys.ecdh);
            this.keys.ecdsa = new Templates.Keys.ECDSA(keys.ecdsa);
        }
    }

    static Folder = class {

        constructor({ info, metadata, keys }){

            this.keys = {};
            
            this.info = new Templates.Info(info);
            this.metadata = new Templates.Metadata(metadata);
            this.keys.aes = new Templates.Keys.AES(keys.aes);
        }
    }

    static File = class {

        constructor({ info, metadata, keys }){

            this.keys = {};
            
            this.info = new Templates.Info(info);
            this.metadata = new Templates.Metadata(metadata);
            this.keys.aes = new Templates.Keys.AES(keys.aes);
        }
    }


}

class Templates {

    static Info = class {

        constructor({ type, version, timestamp }){
            this.type = Helper.validateStringExist(type, "Type");
            this.version = Helper.validate(version, "number");
            this.timestamp = Helper.validate(timestamp, "number");
        }
    }

    static Metadata = class {
        constructor({ issuer, issuedFor, root }) {
            this.issuer = Helper.validateStringExist(issuer, "Metadata issuer");
            this.issuedFor = Helper.validateStringExist(issuedFor, "Metadata issued for");
            this.root = Helper.validate(root, "boolean");
        }
    }

    static Keys = class {

        static AES = class {
            constructor({ value, iv, wrapper }) {
                this.value = Helper.validateStringExist(value, "AES");
                this.iv = Helper.validateStringExist(iv, "AES iv");
                this.wrapper = Helper.validateStringExist(wrapper, "AES wrapper");
            }
        }

        static RSA = class {

            constructor({ publicKey, privateKey }){  
                this.publicKey = new Templates.Keys.KeyPairs.RSAPublic(publicKey);
                this.privateKey = new Templates.Keys.KeyPairs.RSAPrivate(privateKey);
            }
        }

        static PBKDF2 = class {
            constructor({ algorithm, derivedAlgorithm, usages }) {
                this.algorithm = new Templates.Keys.Algorithm.PBKDF2Algorithm(algorithm);
                this.derivedAlgorithm = new Templates.Keys.Algorithm.PBKDF2DerivedAlgorithm(derivedAlgorithm);
                this.usages = Helper.validate(usages, "array");
            }
        }

        static ECDH = class {

            constructor({ publicKey, privateKey }){  
                this.publicKey = new Templates.Keys.KeyPairs.ECDHPublic(publicKey);
                this.privateKey = new Templates.Keys.KeyPairs.ECDHPrivate(privateKey);
            }
        }

        static ECDSA = class {

            constructor({ publicKey, privateKey }){  
                this.publicKey = new Templates.Keys.KeyPairs.ECDSAPublic(publicKey);
                this.privateKey = new Templates.Keys.KeyPairs.ECDSAPrivate(privateKey);
            }
        }

        static Algorithm = class {

            static RSAAlgorithm = class {

                name = "RSA-OAEP";
                modulusLength = 4096;

                constructor({ name, modulusLength, hash }){  

                    /// Notify requester that the supplied values is not suppported
                    if(name != this.name) throw new Error("Unsupported rsa algorithm name");

                    if(modulusLength != this.modulusLength) throw new Error("Unsupported rsa algorithm modulus length");

                    this.hash = new Templates.Keys.Algorithm.Hash(hash);
                }
            }

            static PBKDF2Algorithm = class {

                name = "PBKDF2";
                iterations = 100_000;
                hash = "SHA-256";

                constructor({ name, salt, iterations, hash }){
                    
                    /// Notify requester that the supplied values is not suppported
                    if(name != this.name) throw new Error("Unsupported PBKDF2 algorithm name");

                    if(iterations != this.iterations) throw new Error("Unsupported PBKDF2 algorithm iterations");

                    if(hash != this.hash) throw new Error("Unsupported PBKDF2 algorithm hash name");

                    this.salt = Helper.validateStringExist(salt, "PBKDF2 salt");
                    
                }
            }

            static PBKDF2DerivedAlgorithm = class {

                name = "AES-GCM";
                length = "256";

                constructor({ name, length }){

                    /// Notify requester that the supplied values is not suppported
                    if(name != this.name) throw new Error("Unsupported PBKDF2 derivation algorithm name");

                    if(length != this.length) throw new Error("Unsupported PBKDF2 derivation algorithm length")
                }
            }

            static ECDHAlgorithm = class {

                name = "ECDH";
                namedCurve = "P-256";

                constructor({ name, namedCurve }){  

                    /// Notify requester that the supplied values is not suppported
                    if(name != this.name) throw new Error("Unsupported ECDH derivation algorithm name");

                    if(namedCurve != this.namedCurve) throw new Error("Unsupported ECDH derivation algorithm namedCurve")
                }
            }

            static ECDSAAlgorithm = class {

                name = "ECDSA";
                namedCurve = "P-256";

                constructor({ name, namedCurve }){  

                    /// Notify requester that the supplied values is not suppported
                    if(name != this.name) throw new Error("Unsupported ECDSA derivation algorithm name");

                    if(namedCurve != this.namedCurve) throw new Error("Unsupported ECDSA derivation algorithm namedCurve")
                }
            }

            static Hash = class {

                name = "SHA-256";

                constructor({ name }){

                    /// Notify requester that the supplied values is not suppported
                    if(name != this.name) throw new Error("Unsupported Algorithm hash");
                }
            }
        }
        static KeyPairs = class {

            static RSAPublic = class {
                constructor({ algorithm, usages, value }){  

                    this.algorithm = new Templates.Keys.Algorithm.RSAAlgorithm(algorithm);
                    this.usages = Helper.validate(usages, "array");
                    this.value = Helper.validateStringExist(value, "RSA Public key");
                }
            }

            static RSAPrivate = class {
                constructor({ algorithm, usages, value, iv, wrapper }){  

                    this.algorithm = new Templates.Keys.Algorithm.RSAAlgorithm(algorithm);
                    this.usages = Helper.validate(usages, "array");
                    this.value = Helper.validateStringExist(value, "RSA Private key");
                    this.iv = Helper.validateStringExist(iv, "RSA Private key iv");
                    this.wrapper = Helper.validateStringExist(wrapper, "RSA Private key wrapper");
                }
            }

            static ECDHPublic = class {
                constructor({ algorithm, usages, value }){  

                    this.algorithm = new Templates.Keys.Algorithm.ECDHAlgorithm(algorithm);
                    this.usages = Helper.validate(usages, "array");
                    this.value = Helper.validateStringExist(value, "ECDH Public key");
                }
            }

            static ECDHPrivate = class {
                constructor({ algorithm, usages, value, iv, wrapper }){  

                    this.algorithm = new Templates.Keys.Algorithm.ECDHAlgorithm(algorithm);
                    this.usages = Helper.validate(usages, "array");
                    this.value = Helper.validateStringExist(value, "ECDH Private key");
                    this.iv = Helper.validateStringExist(iv, "ECDH Private key iv");
                    this.wrapper = Helper.validateStringExist(wrapper, "ECDH Private key wrapper");
                }
            }

            static ECDSAPublic = class {
                constructor({ algorithm, usages, value }){  

                    this.algorithm = new Templates.Keys.Algorithm.ECDSAAlgorithm(algorithm);
                    this.usages = Helper.validate(usages, "array");
                    this.value = Helper.validateStringExist(value, "ECDSA Public key");
                }
            }

            static ECDSAPrivate = class {
                constructor({ algorithm, usages, value, iv, wrapper }){  

                    this.algorithm = new Templates.Keys.Algorithm.ECDSAAlgorithm(algorithm);
                    this.usages = Helper.validate(usages, "array");
                    this.value = Helper.validateStringExist(value, "ECDSA Private key");
                    this.iv = Helper.validateStringExist(iv, "ECDSA Private key iv");
                    this.wrapper = Helper.validateStringExist(wrapper, "ECDSA Private key wrapper");
                }
            }
            
        }

    }
}