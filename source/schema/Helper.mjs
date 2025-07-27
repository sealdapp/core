"use strict";

export default class Helper {
    static validate(value, type) { 

        const kind = Object.prototype.toString.call(value).slice(8, -1);

        if(kind.toLowerCase() != type){
            throw new TypeError(`Incorrect data type [${ kind.toLowerCase() }]. Value must be of [${ type }] type.`); 
        }
        else{
            return value;
        } 
    }

    static validateStringExist(value, name) {

        const kind = Object.prototype.toString.call(value).slice(8, -1);

        /// Ensure value is string
        if(kind.toLowerCase() != "string"){
            throw new TypeError(`Incorrect data type [${ kind.toLowerCase() }] for [${ name }]. Value must be of string type.`); 
        }

        /// Ensure value is set
        if(value.length == 0) {
            throw new Error(`${ name } value cannot be empty.`)
        }

        return value;
    }
    static setError(success, error) {

        if(success) return null;

        else return Helper.validate(error, "error");
    }
}
