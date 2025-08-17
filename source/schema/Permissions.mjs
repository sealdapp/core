"use strict";

import Helper from "./Helper.mjs";

export default class Permissions {

    constructor({ vault = {}, system = {} }){
        this.vault = new Permissions.Vault(vault);
        this.system = new Permissions.System(system);
    }
    
    static Vault = class {

        constructor({ settings = {}, gallery = {}, files = {} }){

            this.settings = new Permissions.Vault.Settings(settings);
            this.gallery = new Permissions.Vault.Gallery(gallery);
            this.files = new Permissions.Vault.Files(files);
        }

        static Settings = class {
            constructor({ update = false, list = false }){
                
                this.update = Helper.validate(update, "boolean");
                this.list = Helper.validate(list, "boolean");
            }
        }

        static Gallery = class {
            
            constructor({ add = false, update = false, remove = false, list = false }){
                
                this.add = Helper.validate(add, "boolean");
                this.update = Helper.validate(update, "boolean");
                this.remove = Helper.validate(remove, "boolean");
                this.list = Helper.validate(list, "boolean");
            }
        }

        static Files = class {
            constructor({ add = false, update = false, remove = false, list = false }){
                
                this.add = Helper.validate(add, "boolean");
                this.update = Helper.validate(update, "boolean");
                this.remove = Helper.validate(remove, "boolean");
                this.list = Helper.validate(list, "boolean");
            }
        }
    }

    static System = class {
        
        constructor({ keys = {}, users = {} }){

            this.keys = new Permissions.System.Keys(keys);
            this.users = new Permissions.System.Users(users);
        }

        static Keys = class {
            
            constructor({ init = false, recover = false }){
                
                this.init = Helper.validate(init, "boolean");
                this.recover = Helper.validate(recover, "boolean");
            }
        }

        static Users = class {
            
            constructor({ add = false, update = false, remove = false, list = false }){
                
                this.add = Helper.validate(add, "boolean");
                this.update = Helper.validate(update, "boolean");
                this.remove = Helper.validate(remove, "boolean");
                this.list = Helper.validate(list, "boolean");
            }
        }
    }
}