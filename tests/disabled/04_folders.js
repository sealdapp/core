"use strict";

/// Import required libraries
import { expect } from "chai";
import Setup from "../lib/setup.mjs";
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/// Import application module to test
import { handler as keys_init } from "../../source/activate_main.mjs";
import { handler as keys_builtin } from "../../source/keys_builtin.mjs";
import { handler as folders_create } from "../../source/folders_create.mjs";
import { handler as folders_activate } from "../../source/folders_activate.mjs";

const setup = new Setup();

const sectionTitle = {
    success : await setup.getSectionTitle("success"),
    failure : await setup.getSectionTitle("failure")
}

/// Initialize s3 client
const storage = new S3Client({ region: process.env.STORAGE_REGION });
let keys;
let builtin_keys;


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

async function createFolder(){

    const name = "testing_folder";
    const description = "This is a testing folder";
    const type = "gallery";

    /// Generate new folder key
    const folder_key = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true, // extractable
        ["encrypt", "decrypt"]
    );
    const folder_iv = crypto.getRandomValues(new Uint8Array(12));

    const folder_id_buffer = await crypto.subtle.encrypt(
        { name : folder_key.algorithm.name, iv : folder_iv },
        folder_key,
        new TextEncoder().encode(name)
    )

    const folder_id = Buffer.from(await crypto.subtle.digest("SHA-256",folder_id_buffer)).toString("hex");

    const properties = Buffer.from(await crypto.subtle.encrypt(
        { name : folder_key.algorithm.name, iv : folder_iv },
        folder_key,
        new TextEncoder().encode(JSON.stringify({ name, description, type }))
    )).toString("base64")

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
        id : folder_id,
        properties : properties,
        /// Folder wrapped with master key
        folderKey : {
            info : {
                type : "folderKey",
                version : 1,
                timestamp : Date.now()
            },
            keys : {
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
                        wrapper : "root.userKey.rsa.public"
                    },
                }
            }
        ]
    }
}

/// Initialize setup
before(async function() { 
    await setup.init(); 

    await resetKeys();

    await keys_init({
        cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
        body : { keys }
    })
})

describe("folders_activate", async function(){

    before(async function(){

        /// Get folder builtin keys
        const response = await keys_builtin({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
            body : { 
                type : "gallery"
            }
        })

        expect(response.statusCode).to.equals(200);

        builtin_keys = JSON.parse(response.body)
    })

    describe(sectionTitle.success, async function() {

        it.only("Should be able to activate vault gallery", async function(){

            const { id, properties, folderKey, authorized_keys } = await createFolder();

            const response = await folders_activate({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    type : "gallery",
                    id,
                    properties, 
                    folderKey,
                    authorized_keys
                }
            })
        })
    })
})


describe("folders_create", async function() {

    before(async function(){

        /// Get folder builtin keys
        const response = await keys_builtin({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
            body : { 
                type : "gallery"
            }
        })

        expect(response.statusCode).to.equals(200);

        builtin_keys = JSON.parse(response.body)
    })

    describe(sectionTitle.success, async function() {

        it("Should be able to create folder", async function(){

            const { id, properties, folderKey, authorized_keys } = await createFolder();

            const response = await folders_create({
                cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ],
                body : { 
                    type : "gallery",
                    id,
                    properties, 
                    folderKey,
                    authorized_keys
                }
            })

            console.log((await setup.getTokens()).app.root)
            console.log(response);

            expect(response.statusCode).to.equals(201)
        })
    })

})