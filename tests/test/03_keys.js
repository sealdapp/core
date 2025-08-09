"use strict";

/// Import required libraries
import { expect } from "chai";
import crypto from "crypto";
import Setup from "../lib/setup.mjs";
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/// Import application module to test
import { handler as keys_init } from "../../source/keys_init.mjs";
import { handler as keys_get } from "../../source/keys_get.mjs";

const setup = new Setup();

let storage;
let keys;


async function resetKeys() {

    /// Override KEY_LOCK_RETENTION to 0.1 seconds
    process.env.KEYS_LOCK_DURATION = 0.000001;

    /// Initialize s3 client
    storage = new S3Client({ region: process.env.STORAGE_REGION });

    /// Delete master key
    storage.send(new DeleteObjectCommand({
        Bucket : process.env.STORAGE_BUCKET_PRIVATE,
        Key : `root/master-key.json`
    }));

    /// Delete recovery key
    storage.send(new DeleteObjectCommand({
        Bucket : process.env.STORAGE_BUCKET_PRIVATE,
        Key : `root/recovery-key.json`
    }));

    /// Delete recovery key
    storage.send(new DeleteObjectCommand({
        Bucket : process.env.STORAGE_BUCKET_PRIVATE,
        Key : `root/user-key.json`
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

describe("✅ Keys - Init", async function() {

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

describe("❌ Keys - Init", async function() {

    before(resetKeys)

    it("Should fail if user is not root", async function(){
        
        let response = await keys_init({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.user };` ]
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
        expect(JSON.parse(response.body).message).to.contains("Master key already exists.");

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
describe("✅ Keys - Get", async function() {

    before(async function(){
        
        /// Reset all keys
        await resetKeys()

        /// Initialize keys
        await keys_init({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
            body : { keys }
        })
    })
    it.only("Should be able to get key for root user", async function() {

        /// Call module handler
        let response = await keys_get({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ]
        })

        let data = JSON.parse(response.body)

        expect(response.statusCode).to.equals(200);
        expect(data.root).to.equals(true);
    })

    after(async function(){ 

        /// Resets setting to default
        await setup.resetEnv(); 
    })
})