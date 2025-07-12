"use strict";

/// Import 3rd part libraries
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

/// Import application libraries
import Storages from './interface.mjs';

/// Module-scoped variables
let schema;
let logger;
let validate;

export default class Storage extends Storages {

    #bucket;
    #client;

    constructor(__schema, __logger, __validate) {
        super()

        /// Set module varaibles
        schema = __schema;
        logger = __logger;
        validate = __validate;

        logger.debug("Initializing plugin [s3]")

        /// Validate if s3 bucket is defined
        if(validate.Property.isExistsKey(process.env, "STORAGE_BUCKET_PRIVATE").result == false) throw new Error("STORAGE_BUCKET_PRIVATE is not defined.");

        /// Validate if s3 region is defined
        if(validate.Property.isExistsKey(process.env, "STORAGE_REGION").result == false) throw new Error("STORAGE_REGION is not defined.");

        this.bucket = process.env.STORAGE_BUCKET_PRIVATE;

        /// Initialize s3 client
        this.#client = new S3Client({ region : process.env.STORAGE_REGION })

        logger.debug("s3 plugin instantiated.")
    }

    async init(bucket) {
        try {

            logger.debug(`Initializing s3 client.`);

            if(validate.String.isNotEmpty(bucket).result == false) throw new Error("Bucket name is not defined.");
            logger.debug(`Configuring this instance to use bucket [${ bucket }]`)

            this.#bucket = bucket;

            return new schema.Operation({
                success : true
            })
        }
        catch(e) {

            logger.error(`Failed to initialize s3 client. ${ e.stack }`);

            return new schema.Operation({
                error: new Error(e.message)
            })
        }
    }

    async headObject(key) {
        try {

            /// Ensure key exists
            if(validate.String.isNotEmpty(key).result == false) throw new Error(`key is not defined.`);

            logger.debug(`[${ this.#bucket }] Getting object with key [${ key }]`)

            const command = new HeadObjectCommand({
                Bucket : this.#bucket,
                Key : key
            })

            let response = await this.#client.send(command);

            console.log(response)

            return new schema.Storage.HeadObject({
                success : true,
                exists : true
            })
        }
        catch(e) {
            
            switch (e.name) {

                /// Handle invalid token
                case "NotFound" : {
                    logger.error(`[${ this.#bucket }] Key [${ key }] not found.`);

                    return new schema.Storage.HeadObject({
                        success : true,
                        exists : false
                    })
                }

                /// Unhandled exceptions
                default : {
                    logger.error(`[${ this.#bucket }] Failed to head object. ${ e.stack }`);

                    return new schema.Authentication.HeadObject({
                        error : new Error(e.message)
                    })
                }
            }
        }
    }

    async getObject(key) {
        try {

            /// Ensure key exists
            if(validate.String.isNotEmpty(key).result == false) throw new Error(`key is not defined.`);

            logger.debug(`[${ this.#bucket }] Getting object with key [${ key }]`)


            const command = new GetObjectCommand({
                Bucket : this.#bucket,
                Key : key
            })
        }
        catch(e) {

            logger.error(`Failed to get key. ${ e.stack }`);

            return new schema.Storage.Get({
                error : new Error(e.message)
            })
        }
    }
}