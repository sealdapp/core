"use strict";

/// Import 3rd part libraries
import { S3Client } from '@aws-sdk/client-s3';

/// Import application libraries
import Storages from './interface.mjs';

/// Module-scoped variables
let schema;
let logger;
let validate;

export default class Storage extends Storages {

    #client;

    constructor(__schema, __logger, __validate) {
        super()

        /// Set module varaibles
        schema = __schema;
        logger = __logger;
        validate = __validate;

        logger.debug("Initializing plugin [s3]")

        /// Validate if s3 bucket is defined
        if(!validate.property.isExistsKey(process.env, "STORAGE_BUCKET").valid) throw new Error("STORAGE_BUCKET is not defined.");

        /// Validate if s3 region is defined
        if(!validate.property.isExistsKey(process.env, "STORAGE_REGION").valid) throw new Error("STORAGE_REGION is not defined.");

        /// Initialize s3 client
        this.#client = new S3Client({ region : process.env["STORAGE_REGION"] })

        logger.debug("s3 plugin instantiated.")
    }

    get(bucket, key) {
        logger.debug("Getting object")
    }
}