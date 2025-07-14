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

    Initializer = class {

        static async initialize(response){

            /// Ensure secret initialization is successful
            if(response.success == false) throw response.error;

        }
    }


    
}