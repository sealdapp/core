"use strict";

/// Import required libraries
import { expect } from "chai";
import crypto from "crypto";
import Setup from "../lib/setup.mjs";
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/// Import application module to test
import { handler as keys_init } from "../../source/keys_init.mjs";
import { handler as keys_get_user } from "../../source/keys_get_user.mjs";
import { handler as keys_get_master } from "../../source/keys_get_master.mjs";
import { handler as keys_get_recovery } from "../../source/keys_get_recovery.mjs";
import { handler as keys_recover } from "../../source/keys_recover.mjs";
import { handler as keys_builtin } from "../../source/keys_builtin.mjs";

const setup = new Setup();

const sectionTitle = {
    success : await setup.getSectionTitle("success"),
    failure : await setup.getSectionTitle("failure")
}

/// Initialize s3 client
const storage = new S3Client({ region: process.env.STORAGE_REGION });
let keys;

async function resetKeys() {

    /// Override KEY_LOCK_RETENTION to 0.1 seconds
    process.env.KEYS_LOCK_DURATION = 0.000001;

    /// Delete master key
    await storage.send(new DeleteObjectCommand({
        Bucket : process.env.STORAGE_BUCKET_PRIVATE,
        Key : `system/keys/master-key.json`
    }));

    /// Delete recovery key
    await storage.send(new DeleteObjectCommand({
        Bucket : process.env.STORAGE_BUCKET_PRIVATE,
        Key : `system/keys/recovery-key.json`
    }));

    /// Delete recovery key
    await storage.send(new DeleteObjectCommand({
        Bucket : process.env.STORAGE_BUCKET_PRIVATE,
        Key : `system/users/registered/root/user-key.json`
    }));

    /// Generate keys
    try {
        keys = await setup.getSampleKeys();
    }
    catch(e) {
        console.log(`Failed to get sample keys. ${ e.stack }`)
    }

}

/// Initialize setup
before(async function() { await setup.init(); })

describe("keys_init", async function() {

    describe(sectionTitle.success, async function() {

        before(resetKeys)

        it("Should be able to initialize keys.", async function(){

            let response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            expect(response.statusCode).to.equals(200);
        })
        
        after(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })

    describe(sectionTitle.failure, async function() {

        before(resetKeys)

        it("Should fail if user is not root", async function(){
            
            let response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.user };` ],
                body : { keys }
            })

            expect(response.statusCode).to.equals(401);
            expect(JSON.parse(response.body).message).to.equals("You are not authorized.");
        });

        it("Should fail if there are no request body supplied", async function(){
            
            let response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ]
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.equals("Bad request.");

        })

        it("Should fail if master_key is not supplied or is missing mandatory parameter", async function(){
            
            let response;

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {}
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.equals("Missing keys.");

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : {},
                        "recovery_key" : {},
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : {
                            "info" : {},
                            "keys" : {}
                        },
                        "recovery_key" : {},
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : {
                            "info" : {
                                "type" : ""
                            },
                            "keys" : {}
                        },
                        "recovery_key" : {},
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

        });

        it("Should fail if recovery_key is not supplied or is in wrong type", async function() {
            
            let response;

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {
                    keys : {
                        "master_key" : keys.master_key
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : keys.master_key,
                        "recovery_key" : {},
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");
        });

        it("Should fail if root_key is not supplied or is in wrong type", async function(){
            
            let response;

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {
                    keys : {
                        "master_key" : keys.master_key,
                        "recovery_key" : keys.recovery_key
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

            response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : keys.master_key,
                        "recovery_key" : keys.recovery_key,
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

        });

        it("Should fail if master key already exists", async function(){
            
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            const response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            expect(response.statusCode).to.equals(409);
            expect(JSON.parse(response.body).message).to.contains("Keys already initialized.");

            await resetKeys();
        });

        it("Should fail if key is missing information property", async function(){
            
            let tmp = keys;

            delete tmp.master_key.info;

            let response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys : tmp }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

        });

        it("Should fail if key is missing keys property", async function(){
            
            let tmp = keys;

            delete tmp.master_key.keys;

            let response = await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys : tmp }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");
        })

        after(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })

    })
})

describe("keys_get_user", async function() {

    describe(sectionTitle.success, async function() {

        before(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })
        })

        it("Should be able to get key for root user", async function() {

            /// Call module handler
            let response = await keys_get_user({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {}
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(200);
            expect(data.key.info.type).to.equals("userKey");
        })

        it("Should be able to get key for user")
    })

    describe(sectionTitle.failure, async function() {

        beforeEach(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })
        })

        it("Should fail to get user key if not yet initialized", async function() {

            /// Delete recovery key
            await storage.send(new DeleteObjectCommand({
                Bucket : process.env.STORAGE_BUCKET_PRIVATE,
                Key : `system/users/registered/root/user-key.json`
            }));
            
            /// Call module handler
            let response = await keys_get_user({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(404);
            expect(data.message).to.contains("Key not found.");
        })

        afterEach(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })

})

describe("keys_get_master", async function() {

    describe(sectionTitle.success, async function() {

        before(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })
        })

        it("Should be able to get master key", async function() {

            /// Call module handler
            let response = await keys_get_master({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {}
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(200);
            expect(data.key.info.type).to.equals("masterKey");
        })


        after(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })
    

    describe(sectionTitle.failure, async function() {

        beforeEach(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })
        })

        it("Should fail to get master key if not yet initialized", async function(){

            /// Delete recovery key
            await storage.send(new DeleteObjectCommand({
                Bucket : process.env.STORAGE_BUCKET_PRIVATE,
                Key : `system/keys/master-key.json`
            }));
            
            /// Call module handler
            let response = await keys_get_master({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(404);
            expect(data.message).to.contains("Key not found.");
        })

        it("Should fail to get master key if user is not root", async function(){
            
            /// Call module handler
            let response = await keys_get_master({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.user };` ],
                body : { keys }
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(401);
            expect(data.message).to.contains("You are not authorized.");
        });

        afterEach(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })
})

describe("keys_get_recovery", async function() {

    describe(sectionTitle.success, async function() {

        before(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })
        })

        it("Should be able to get recovery key", async function() {

            /// Call module handler
            let response = await keys_get_recovery({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {}
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(200);
            expect(data.key.info.type).to.equals("recoveryKey");
        })


        after(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })
    

    describe(sectionTitle.failure, async function() {

        beforeEach(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })
        })

        it("Should fail to get recovery key if not yet initialized", async function(){

            /// Delete recovery key
            await storage.send(new DeleteObjectCommand({
                Bucket : process.env.STORAGE_BUCKET_PRIVATE,
                Key : `system/keys/recovery-key.json`
            }));
            
            /// Call module handler
            let response = await keys_get_recovery({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(404);
            expect(data.message).to.contains("Key not found.");
        })

        it("Should fail to get recovery key if user is not root", async function(){
            
            /// Call module handler
            let response = await keys_get_recovery({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.user };` ],
                body : { keys }
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(401);
            expect(data.message).to.contains("You are not authorized.");
        });

        afterEach(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })
})



describe("keys_recover", async function() {

    describe(sectionTitle.success, async function() {

        before(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            // await new Promise(r => setTimeout(r, 3000));

            /// Delete master key
            await storage.send(new DeleteObjectCommand({
                Bucket : process.env.STORAGE_BUCKET_PRIVATE,
                Key : `system/keys/master-key.json`
            }));

            /// Delete recovery key
            await storage.send(new DeleteObjectCommand({
                Bucket : process.env.STORAGE_BUCKET_PRIVATE,
                Key : `system/users/registered/root/user-key.json`
            }));

            // await new Promise(r => setTimeout(r, 3000));
        })

        it("Should be able to recover root user key", async function() {

            let response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            expect(response.statusCode).to.equals(200);

        })

        after(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })

    describe(sectionTitle.failure, async function() {

        beforeEach(async function(){
            
            /// Reset all keys
            await resetKeys()

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })
        })

        it("Should fail if recovery key is not found", async function() {

            /// Delete recovery key
            await storage.send(new DeleteObjectCommand({
                Bucket : process.env.STORAGE_BUCKET_PRIVATE,
                Key : `system/keys/recovery-key.json`
            }));

            let response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            let data = JSON.parse(response.body)

            expect(response.statusCode).to.equals(400);
            expect(data.message).to.contains("Keys not yet initialized.");

        })

        it("Should fail if master_key is not supplied or is missing mandatory parameter", async function(){
            
            let response;

            /// Initialize keys
            await keys_init({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { keys }
            })

            response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {}
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.equals("Missing keys.");

            response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : {},
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

            response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : {
                            "info" : {},
                            "keys" : {}
                        },
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

            response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : {
                            "info" : {
                                "type" : ""
                            },
                            "keys" : {}
                        },
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

        });

        it("Should fail if root_key is not supplied or is in wrong type", async function(){
            
            let response;

            response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : {
                    keys : {
                        "master_key" : keys.master_key,
                        "recovery_key" : keys.recovery_key
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

            response = await keys_recover({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    keys : {
                        "master_key" : keys.master_key,
                        "recovery_key" : keys.recovery_key,
                        "root_key" : {}
                    }
                }
            })

            expect(response.statusCode).to.equals(400);
            expect(JSON.parse(response.body).message).to.contains("Malformed request.");

        });

        after(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })

    })
    
})

describe.only("keys_builtin", async function() {

    describe(sectionTitle.success, async function() {

        it("Should be able to get build keys for creating a new folder", async function(){

            const response = await keys_builtin({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    type : "gallery"
                }
            })

            expect(response.statusCode).to.equals(200);
        })
    })

    describe(sectionTitle.failure, async function() {

    })
})