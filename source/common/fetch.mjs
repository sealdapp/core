"use strict";

/// Import 3rd party libraries
import nodefetch from 'node-fetch';

/// Module scoped variables
let schema;
let logger;

export default class Fetch {

    constructor(__schema, __logger) {
        
        schema = __schema;
        logger = __logger;

        logger.debug("Instantiated fetch module");
    }

    // GET request
    async get({ url = "", headers = {} } = {}) {
        
        try {
            logger.debug(`Invoking GET request to ${ url }`);

            const response = await nodefetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json', ...headers },
            });

            if (response.ok != true) {
                const message = await response.text();

                logger.error(`Failed to invoke get request to ${ url }. ${ message }`)

                return new schema.Fetch.Get({
                    code : response.status,
                    message : message,
                    data : response
                })
            }
            else{
                logger.debug(`Successfully invoked GET request to ${ url }`);

                return new schema.Fetch.Get({
                    success : true,
                    code : response.status,
                    data : response
                })
            }
        }
        catch(e) {

            logger.error(`Failed to invoke get request to ${ url }. ${ e.stack  }`)

            return new schema.Fetch.Get({
                error : new Error(e.message)
            })
        }
        
    }

    // POST request with JSON body
    static async post(url, headers = {}, body = {}) {
    }
}