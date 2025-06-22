"use strict";

/// Module-scoped variables
let schema;
let logger;
let helper;

export default class Validator {

    constructor(__schema, __logger) {
        /// Set module variables
        schema = __schema;
        logger = __logger;

        /// Set module methods
        helper = new this.#Helpers();

        /// Public variables
        this.property = new this.Property();
        this.types = new this.Types();
        
        logger.debug("Validator module instantiated.")
    }
    
    Property = class {

        isExistsKey(property, key) {

            try {

                /// Failure scenarios
                if(!property) throw new Error("Invalid property");

                if(!property.hasOwnProperty(key)) throw new Error(`Key [${ key }] doesn't exists.`)

                /// Success scenarios
                if(property[key]) return new schema.Validation({ success : true, valid : true });

                /// Unknown scenarios
                else throw new Error(`Unknown error during validation of property.`);
            }
            catch(e) { return helper.catcher(e); }
        }
    }

    Types = class {

        isString(value) {
            try {
                /// Failure scenarios
                if(typeof value != "string") throw new Error("Data is not of string type.");

                /// Success scenarios
                else return new schema.Validation({ success: true, valid : true });
            }
            catch(e) { return helper.catcher(e); }
        }
    }

    #Helpers = class {

        catcher(e) {
            let message = `Exception occured during validation. ${ e.stack }`;
            logger.error(message);

            return new schema.Validation({ message });
        }
    }
}