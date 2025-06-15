"use strict";

/// AWS libraries
const { S3Client } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

/// App libraries
const env = require('./common/utils')(__filename);
const logger = require('./common/logger')(env);
const validation = require('./common/validation')();
const crypto = require('./common/crypto')(logger);

/// Instantiate buckets
const buckets = {

    b2_private_uploads : require(`./common/bucket`)(
        new S3Client({
            endpoint: env.B2_ENDPOINT_UPLOADS,
            region : env.B2_REGION_UPLOADS,
            credentials: {
                accessKeyId: env.B2_ACCESS_KEY_UPLOADS,
                secretAccessKey: env.B2_SECRET_KEY_UPLOADS
            }
        })
    )
}

/// Instantiate databases
const database = require(`./common/dynamodb`)(
    new DynamoDBClient({ 
        region: env.AWS_REGION,
        credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY
        }
    })
)


async function handler(){

}