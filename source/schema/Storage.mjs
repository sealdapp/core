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

            this.exists = exists;
        }
    }
    
    static GetObject = class extends Storage.Base {

        constructor({ data = null, exists = false }) {
            super({ ...arguments[0] });

            this.data = data;
            this.exists = exists;
        }
    }

    static PutObject = class extends Storage.Base {

        constructor({ updated = false }){
            super({ ...arguments[0] });
            
            this.updated = updated;
        }
    }
}