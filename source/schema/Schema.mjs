"use strict";

/// Import all Schema classes
import Operation from "./Operation.mjs";
import Validation from "./Validation.mjs";
import Request from "./Request.mjs";
import Response from "./Response.mjs";
import Fetch from "./Fetch.mjs";
import Crypto from "./Crypto.mjs";
import Secret from "./Secret.mjs";
import Authentication from "./Authentication.mjs";
import Storage from "./Storage.mjs";

import Keys from "./Keys.mjs";

export default class Schema {

    constructor(){
        this.Operation = Operation;
        this.Validation = Validation;
        this.Request = Request;
        this.Response = Response;
        this.Fetch = Fetch;
        this.Crypto = Crypto;
        this.Secret = Secret;
        this.Authentication = Authentication;
        this.Storage = Storage;

        this.Keys = Keys;
    }
}