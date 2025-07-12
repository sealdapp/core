"use strict";

export default class Helper {
    static validate(value, type) { 

        let kind = Object.prototype.toString.call(value).slice(8, -1);

        if(kind.toLowerCase() != type){
            throw new TypeError(`Incorrect data type [${ kind.toLowerCase() }]. Value must be of [${ type }] type.`); 
        }
        else{
            return value;
        } 
    }

    static setError(success, error) {

        if(success) return null;

        else return Helper.validate(error, "error");
    }
}
