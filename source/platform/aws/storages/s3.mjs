"use strict";

/// Import 3rd part libraries
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

        /// Validate if s3 region is defined
        if(validate.Property.isExistsKey(process.env, "STORAGE_REGION").result == false) throw new Error("STORAGE_REGION is not defined.");

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

            const response = await this.#client.send(command);

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

                    return new schema.Storage.HeadObject({
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

            const response = await this.#client.send(command);

            /// Set an empty container for output
            const output = new Uint8Array(0);

            /// Extract output if file has content
            if(response.ContentLength > 0) {

                logger.debug(`Downloading content...`);

                /// Get output from stream
                const download = await this.#readableStreamToOutput(response.Body);

                /// Ensure download is successful
                if(download.success == false) throw download.error;

                output = download.data.buffer;
            }

            console.log(output)

            return new schema.Storage.GetObject({
                success : true,
                exists : true,
                data : output
            })

        }
        catch(e) {
            
            switch (e.name) {

                /// Handle invalid token
                case "NoSuchKey" : {
                    logger.error(`[${ this.#bucket }] Key [${ key }] not found.`);

                    return new schema.Storage.GetObject({
                        success : true,
                        exists : false
                    })
                }

                /// Unhandled exceptions
                default : {
                    logger.error(`[${ this.#bucket }] Failed to get object. ${ e.stack }`);

                    return new schema.Storage.GetObject({
                        error : new Error(e.message)
                    })
                }
            }
        }
    }

    async putObject(key, body, options) {
        
        try{
            /// Ensure key exists
            if(validate.String.isNotEmpty(key).result == false) throw new Error(`Key is not defined.`);

            /// Ensure body exists
            if(validate.Type.isString(body).result == false) throw new Error(`Body is not in string format`);

            logger.debug(`[${ this.#bucket }] Putting object with key [${ key }]`)

            const command = new PutObjectCommand({
                Bucket : this.#bucket,
                Key : key,
                Body : body,
                ...options
            });

            const response = await this.#client.send(command);

            return new schema.Storage.PutObject({
                success : true,
                updated : true
            })
        }
        catch(e) {
            logger.error(`[${ this.#bucket }] Failed to put object to bucket. ${ e.stack }`);

            return new schema.Storage.PutObject({
                error : new Error(e.message)
            })
        }
    }

    #readableStreamToOutput(stream) {
        return new Promise(resolve => {
            try {

                logger.debug(`Converting readable stream to string.`);

                const chunks = [];

                stream.on('data', chunk => chunks.push(chunk));

                stream.on('error', (e)=> { throw e });

                stream.on('end', () => {

                    /// Always return content in raw buffer format
                    resolve(new schema.Operation({
                        success : true,
                        data : {
                            buffer : Buffer.concat(chunks)
                        }
                    }))
                });
            } 
            catch (e) {

                logger.error(`Failed to convert stream to string. ${ e.stack }}`);
                
                resolve(new schema.Operation({
                    error : new Error(e.message)
                }))
            }
        })
    }
}