"use strict";

export default class Schema {
    constructor(){
        this.Validation = Validation;
        this.Authentication = Authentication;
        this.Response = Response;
    }
}


function validate(value, type) { 
    if(typeof value != type){
        throw new TypeError(`Incorrect data type. Value must be a ${ type }. ${ value }`); 
    }
    else{
        return value;
    } 
}

class Validation {

    constructor({ success = false, valid = false, message = "" }) {

        this.success = validate(success, "boolean");
        this.valid = validate(valid, "boolean");
        this.message = validate(message, "string");
    }
}

class Authentication {

    static Info = class {

        constructor({ username = "" }) {
            
            this.username = validate(username, "string");
        }
    }
}
class Response {

    static Base = class {

        constructor({ success = true, code = 200, body = {}, message = "" }){

            this.success = success;
            this.code = code;
            this.message = message;
            this.body = body;
        }
    }

    static Keys = class {

        static Get = class extends Response.Base {

            constructor({ keys = [], root = false }) {
                super({ ...arguments[0] });

                this.body = JSON.stringify({ 
                    keys : keys,
                    count : keys.length,
                    root : root
                });
            }
        }
    }
}