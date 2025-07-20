"use strict";

/// Import required libraries
import { expect } from "chai";
import crypto from "crypto";
import Setup from "../lib/setup.mjs";
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/// Import application module to test
import { handler as keys_setup } from "../../source/keys_init.mjs";
import { handler as keys_get } from "../../source/keys_get.mjs";

const setup = new Setup();

let storage;
let keys;

/// Initialize setup
before(async function() { await setup.init(); })

describe("✅ Keys - Init", async function() {

    beforeEach(async function() {

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
        keys = await setup.getSampleKeys();
    })

    it("Should be able to setup keys.", async function(){

        let response = await keys_setup({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
            body : keys
        })

        expect(response.statusCode).to.equals(200);
    })

    after(async function(){ 

        /// Resets setting to default
        await setup.resetEnv(); 
    })
})

describe("✅ Keys - Get", async function() {

    /*it("Should be able to get key for root user", async function() {

        /// Call module handler
        let response = await keys_get({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ]
        })

        console.log(response)

        let data = JSON.parse(response.body)
        console.log(data);

        expect(response.statusCode).to.equals(200);
        expect(data.root).to.equals(true);
        expect(data.keys.device.exists).to.equals(true);
        expect(data.keys.master.exists).to.equals(true);

    })*/
})