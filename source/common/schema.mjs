"use strict";

export default class Schema {
    constructor(){
        this.Validation = Validation;
    }
}

class Validation {

    constructor({ success = false, valid = false, message = "" }) {

        this.success = this.#validate(success, "boolean");
        this.valid = this.#validate(valid, "boolean");
        this.message = this.#validate(message, "string");
    }

    #validate(value, type) { 
        if(typeof value != type){
            throw new TypeError(`Incorrect data type. Value must be a ${ type }. ${ value }`); 
        }
        else{
            return value;
        } 
    }
}

class Operation {}