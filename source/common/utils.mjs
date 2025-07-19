"use strict";

/// Module scoped variables
let schema;
let logger;
let validate;

export default class Utilities {


    constructor(__schema, __logger, __validate) {
        
        schema = __schema;
        logger = __logger;
        validate = __validate;

        logger.debug("Instantiated utils module");
    }

    Parser = class {

        static async cookies(list) {

            try {
                logger.debug(`Parsing cookie list.`);
        
                /// Ensure list is in array type
                if(validate.Type.isArray(list).result == false) throw new Error(`Data provided is not of list format.`);
        
                const parsed = {};
                for (const cookie of list) {
                    const [key, ...val] = cookie.split('=');
        
                    /// Join back the values, remove trailing spaces and semicolons
                    parsed[key.trim()] = val.join('=').trim().replace(/;$/, ''); // handles '=' in value
                }
            
                logger.debug("Successfully parsed cookie.")
        
                return new schema.Operation({
                    success : true,
                    data : { parsed }
                })
            }
            catch(e) {
        
                logger.error(`Failed to parse cookie. ${ e.stack }`);
        
                return new schema.Operation({
                    error : new Error(e.message)
                })
            }
        }
    }

}