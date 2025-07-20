"use strict";

import Helper from "./Helper.mjs";

export default class Keys {

    static Device = class {

        constructor({ key = {}, exists = false }){

            this.key = Helper.validate(key, "object");
            this.exists = Helper.validate(exists, "boolean");
        }
    }

    static Master = class {

        constructor({ key = {}, exists = false }){

            this.key = Helper.validate(key, "object");
            this.exists = Helper.validate(exists, "boolean");
        }

    }

    static Folder = class {

        constructor({ key = {} }){
            
        }

    }

}