"use strict";

/// Import required libraries
import { expect } from "chai";
import crypto from "crypto";
import Setup from "../lib/setup.mjs";
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/// Import application module to test
import { handler as activate_main } from "../../source/activate_main.mjs";

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

    /// Generate keys
    try {
        keys = await setup.getSampleKeys();
    }
    catch(e) {
        console.log(`Failed to get sample keys. ${ e.stack }`)
    }

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

}

/// Initialize setup
before(async function() { await setup.init(); })

describe.only("activate_main", async function() {

    describe(sectionTitle.success, async function() {

        before(resetKeys)

        it("Should be able to activate main application.", async function(){

            const response = await activate_main({
                cookies : [ `sessionToken=${ (await setup.getTokens()).auth.root };` ],
                body : { 
                    oauth_token : (await setup.getTokens()).auth.root,
                    keys
                }
            })

            console.log(response)
            expect(response.statusCode).to.equals(200);
        })
        
        after(async function(){ 

            /// Resets setting to default
            await setup.resetEnv(); 
        })
    })
})