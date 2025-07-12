"use strict";

/// Module-scoped variables
let schema;
let logger;

export default class Validator {

    constructor(__schema, __logger) {
        /// Set module variables
        schema = __schema;
        logger = __logger;
        
        logger.debug("Validator module instantiated.")
    }
    
    Property = class {

        static isExistsKey(property, key) {

            try {

                /// Failure scenarios
                if(!property) throw new Error("Invalid property");

                if(!property.hasOwnProperty(key)) throw new Error(`Key [${ key }] doesn't exists.`)

                /// Success scenarios
                if(property[key]) return new schema.Validation({ 
                    success : true, 
                    result : true 
                });

                /// Unknown scenarios
                else throw new Error(`Unknown error during validation of property.`);
            }
            catch(e) { return Helper.catcher(e); }
        }
    }

    Type = class {

        static isString(value) {
            try {
                let kind = Helper.getKind(value);

                /// Failure scenarios
                if(kind != "string") throw new Error("Data is not of string type.");

                /// Success scenarios
                else return new schema.Validation({ 
                    success: true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }

        static isBoolean(value) {
            try {
                let kind = Helper.getKind(value);

                /// Failure scenarios
                if(kind != "boolean") throw new Error("Data is not of boolean type.");

                /// Success scenarios
                else return new schema.Validation({ 
                    success: true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }

        static isNull(value) {
            try {
                let kind = Helper.getKind(value);

                /// Failure scenarios
                if(kind != "null") throw new Error("Data is not of null type.");

                /// Success scenarios
                else return new schema.Validation({ 
                    success: true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }
    }

    String = class {

        static isEmpty(value) {
            try {
                let kind = Helper.getKind(value);

                /// Ensure data type is string
                if(kind != "string") throw new Error("Data is not of string type.");

                /// Check if data is empty
                if(value.length == 0) return new schema.Validation({ 
                    success : true, 
                    result: true 
                })

                /// Else, return not epty
                else return new schema.Validation({ 
                    success : true, 
                    result : false 
                })
            }
            catch(e) { return Helper.catcher(e); }
        }

        static isNotEmpty(value) {
            try {
                let kind = Helper.getKind(value);

                /// Ensure data type is string
                if(kind != "string") throw new Error("Data is not of string type.");

                /// Check if data is empty
                if(value.length > 0) return new schema.Validation({ 
                    success : true, 
                    result: true 
                })

                /// Else, return not empty
                else return new schema.Validation({ 
                    success : true, 
                    result : false 
                })
            }
            catch(e) { return Helper.catcher(e); }
        }

        static contains(value, pattern) {
            try {

                /// Ensure data type is string
                if(Helper.getKind(value) != "string") throw new Error("Value parameter is not of string type.");

                /// Ensure data type is string
                if(Helper.getKind(pattern) != "string") throw new Error("Pattern parameter is not of string type.");

                if(value.includes(pattern)) return new schema.Validation({
                    success : true,
                    result : true
                })

                else return new schema.Validation({
                    success : true,
                    result : false
                })
            }
            catch(e) { return Helper.catcher(e); }
        }
    }

    Number = class {

        static isGreaterThan({ left = null, right = null } = {}) {
            try {

                /// Ensure data type is number
                if(Helper.getKind(left) != "number") throw new Error("First number is not of number type.");

                /// Ensure data type is number
                if(Helper.getKind(right) != "number") throw new Error("Second number is not of number type.");

                if(left > right) return new schema.Validation({
                    success : true,
                    results : true
                })
            }
            catch(e) { return Helper.catcher(e); }
        }
    }

    Date = class {

        static isNewerThanDays({ timestamp = null, days = null } = {}) {
            try {

                /// Ensure data type is number
                if(Helper.getKind(timestamp) != "number") throw new Error("Timestamp is not of number type.");

                /// Ensure data type is number
                if(Helper.getKind(days) != "number") throw new Error("Days is not of number type.");

                let now = Date.now();
                let days_ms = days * 24 * 60 * 60 * 1000;

                if((now - timestamp) < days_ms) return new schema.Validation({
                    success : true,
                    result : true
                })

                else return new schema.Validation({
                    success : true,
                 })
            }
            catch(e) { return Helper.catcher(e); }
        }
    }
}

class Helper {

    static catcher(e) {
        /// Let invoker handle logging
        /// logger.error(`Exception occured during validation. ${ e.stack }`);

        return new schema.Validation({ 
            error : new Error(e.message) 
        });
    }

    static getKind(value) {
        return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
    }
}