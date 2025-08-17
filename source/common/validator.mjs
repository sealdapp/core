"use strict";

/// Import external dependencies
import Schema from "../schema/Schema.mjs";

/// Module-scoped variables
let schema;

export default class Validator {

    constructor() {
        schema = new Schema();
     }
    
    Property = class {

        static isExistsKey(property, key) {

            try {

                /// Failure scenarios
                if(!property) throw new Error("Invalid property");

                if(!property.hasOwnProperty(key)) throw new Error(`Key [${ key }] doesn't exists.`)

                return new schema.Validation({ 
                    success : true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }

        static async isExistsKeys(property, keys) {

            try {
                /// Failure scenarios
                if(!property) throw new Error("Invalid property");

                for(const key of keys) {

                    if(!property.hasOwnProperty(key)) throw new Error(`Key [${ key }] doesn't exists.`);

                }
                return new schema.Validation({ 
                    success : true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }
    }

    Type = class {

        static isString(value) {
            try {
                const kind = Helper.getKind(value);

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
                const kind = Helper.getKind(value);

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

        static isNumber(value) {
            try {
                const kind = Helper.getKind(value);

                /// Failure scenarios
                if(kind != "number") throw new Error("Data is not of number type.");

                /// Success scenarios
                else return new schema.Validation({ 
                    success: true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }

        static isObject(value) {
            try {
                const kind = Helper.getKind(value);

                /// Failure scenarios
                if(kind != "object") throw new Error("Data is not of object type.");

                /// Success scenarios
                else return new schema.Validation({ 
                    success: true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }

        static isArray(value) {
            try {
                const kind = Helper.getKind(value);

                /// Failure scenarios
                if(kind != "array") throw new Error("Data is not of array type.");

                /// Success scenarios
                else return new schema.Validation({ 
                    success: true, 
                    result : true 
                });
            }
            catch(e) { return Helper.catcher(e); }
        }

        static isArrayBuffer(value) {
            try {
                const kind = Helper.getKind(value);
                
                /// Failure scenarios
                if(kind != "uint8array") throw new Error("Data is not of uint8array type.");

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
                const kind = Helper.getKind(value);

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
                const kind = Helper.getKind(value);

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
                const kind = Helper.getKind(value);

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

        static includes(value, list) {
            try {

                /// Ensure data type is string
                if(Helper.getKind(value) != "string") throw new Error("Value parameter is not of string type.");

                /// Ensure data type is string
                if(Helper.getKind(list) != "array") throw new Error("Pattern parameter is not of array type.");

                if(list.includes(value)) return new schema.Validation({
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

                const now = Date.now();
                const days_ms = days * 24 * 60 * 60 * 1000;

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

    List = class {

        static isStringInside(list, data) {
            try {
                
                /// Ensure list to check is a list type
                if(Helper.getKind(list) != "array") throw new Error("Data provided is not of array type.");

                /// Ensure data to find inside list is in string format
                if(Helper.getKind(data) != "string") throw new Error("Data to find is not of string type.");

                if(list.includes(data)) return new schema.Validation({
                    success : true,
                    result : true
                })

                else return new schema.Validation({
                    success : true
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