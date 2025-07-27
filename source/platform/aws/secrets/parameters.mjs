"use strict";

import Secrets from './interface.mjs';

/// Import 3rd party libraries
import { SSMClient, PutParameterCommand, GetParameterCommand } from "@aws-sdk/client-ssm";

/// Module-scoped variables
let schema;
let logger;
let validate;

export default class Secret extends Secrets {

    #client;

    constructor(__schema, __logger, __validate){
        super()

        schema = __schema;
        logger = __logger;
        validate = __validate;

        logger.debug("Instantiating plugin [ssm]")

        this.#client = new SSMClient({ region : process.env.AWS_REGION });

        logger.debug("SSM plugin instantiated.")
    }

    async init(){

        try {
            logger.debug("Initializing plugin [ssm]")

            logger.debug("SSM plugin successfully initialized");

            return new schema.Operation({ 
                success : true 
            });
        }
        catch(e){

        }
    }
    async get({ name = "" } = {}){
        try {

            /// Ensure name parameter name is not empty
            if(validate.String.isEmpty(name).result) throw new Error("Parameter name cannot be empty.");

            logger.debug(`Getting secret value of [${ name }]`);

            const command = new GetParameterCommand({
                Name: name, 
                WithDecryption: true
            });
            
            /// Execute get command
            const response = await this.#client.send(command);

            /// Create a new secret instance
            const secret = new schema.Secret({
                name : name,
                value : response.Parameter.Value,
                exists : true,
                lastModified : response.Parameter.LastModifiedDate.getTime()
            })

            return new schema.Operation({
                success : true,
                data : { secret }
            })

        } 
        catch (e) {

            logger.error(`Failed to get parameter. ${ e.name } - ${ e.stack }`)
            
            /// Handle different type of errors
            switch(e.name) {

                /// On an event the operation was successful but the parameter could not be found
                case "ParameterNotFound" : return new schema.Operation({
                    success : true,
                    data : { secret : new schema.Secret({}) },
                    error : new Error(`${ e.name } - ${ e.message }`)
                })

                /// On an event that an unexpected error occurred
                default: return new schema.Operation({
                    error : new Error(`${ e.name } - ${ e.message }`)
                })
            }
        }
    }

    async set({ name = "", value = "" } = {}){
        try {

            /// Ensure name parameter name is not empty
            if(validate.String.isEmpty(name).result) throw new Error("Parameter name cannot be empty.");

            /// Ensure name parameter value is not empty
            if(validate.String.isEmpty(value).result) throw new Error("Parameter value cannot be empty.");
            
            logger.debug(`Checking if secret [${ name }] exists before doing an update.`)
            /// Get current value of the secret
            const exists = await this.get({ 
                name : name
             });
             
            /// Ensure that the secret exists
            if(exists.success == false) throw new Error(`Failed to update the secret. ${ exists.error.message }`);

            logger.debug(`Updating parameter value of [${ name }]`)

            const command = new PutParameterCommand({
                Name: name,
                Value: value,
                Type: 'SecureString',
                Overwrite: true,
            });
            
            const response = await this.#client.send(command);

            logger.debug(`Secret successfully updated.`);
            
            return new schema.Operation({
                success : true
            })
        }
        catch (e) {
            
            logger.error(`Failed to set parameter. ${ e.name } - ${ e.stack }`)

            return new schema.Operation({
                error : new Error(`${ e.name } - ${ e.message }`)
            })
        }
    }

}