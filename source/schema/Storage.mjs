"use strict";

import Helper from "./Helper.mjs";

export default class Storage {

    static Base = class {

        constructor({ success = false, error = null }){
        
            this.success = Helper.validate(success, "boolean");
            this.error = Helper.setError(success, error);
        }
    }
    
    static HeadObject = class extends Storage.Base {

        constructor({ exists = false }) {
            super({ ...arguments[0] });

            this.exists = Helper.validate(exists, "boolean");
        }
    }
    
    static GetObject = class extends Storage.Base {

        constructor({ data = null, exists = false }) {
            super({ ...arguments[0] });

            this.exists = Helper.validate(exists, "boolean");

            if(this.exists) this.data = Helper.validate(data, "uint8array");

            else this.data = data;

        }
    }

    static PutObject = class extends Storage.Base {

        constructor({ updated = false }){
            super({ ...arguments[0] });
            
            this.updated = updated;
        }
    }
}