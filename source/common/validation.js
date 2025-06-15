"use strict";

module.exports = function(){

    let validation = {};

    validation.exists = async function(value) {
        
        /// Ensure that the value is not undefined
        if(!value) return false;

        return true;
    }

    validation.isString = async function(value) {

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        return true;
    }

    validation.isBoolean = async function(value) {

        /// Ensure that the value is a string
        if(typeof value != "boolean") return false;

        return true;
    }

    validation.isNumber = async function(value) {

        /// Ensure that the value is a string
        if(typeof value != "number") return false;

        return true;
    }

    validation.isArray = async function(value) {

        /// Ensure that the value is an array
        if(!Array.isArray(value)) return false;

        return true;
    }

    validation.isFileTitle = async function(value) {

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure that the title is in valid format
        if(!(/^\S+/.test(value))) return false;

        return true;
    }

    validation.isFileName = async function(value) {

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure that the file name is in valid format
        if(!(/^[a-fA-F0-9]{32}_\d+$/.test(value))) return false;

        return true;
    }

    validation.isFolderName = async function(value) {

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure name is not empty
        if(value.trim() === "") return false;

        /// Ensure that the folder name is in valid format
        /// All folder names will be sha256 hashed
        if(!(/^[a-fA-F0-9]{64}$/.test(value))) return false;

        return true;
    }

    validation.isSignature = async function(value){
        
        /// Ensure taht value is not empty
        if(!value) return false;

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure that the value is hex encoded signature of ECDSA
        if(!(/^[a-fA-F0-9]{192}$/.test(value))) return false;

        return true;
    }

    validation.isTimestamp = async function(value){
        
        /// Ensure that value is not empty
        if(!value) return false;

        /// Ensure that the value is a number
        if(typeof value != "number") return false;

        /// Ensure that value supplied is timestamp in unix format
        if(!(/^\d{13}$/.test(value))) return false;
        
        return true
    }

    validation.isNonce = async function(value) {
        
        /// Ensure that value is not empty
        if(!value) return false;

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure that nonce value is digits
        if(!(/^[a-fA-F0-9]{64}$/.test(value))) return false;

        return true;
    }

    validation.isSha256 = async function(value) {
        
        /// Ensure that value is not empty
        if(!value) return false;

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure that nonce value is digits
        if(!(/^[a-fA-F0-9]{64}$/.test(value))) return false;

        return true;
    }

    validation.isUserId = async function(value) {
        
        /// Ensure that value is not empty
        if(!value) return false;

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure that userId value is sha256
        if(!(/^[a-fA-F0-9]{64}$/.test(value))) return false;

        /// Ensure that value is valid uuid
        //if(!(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value))) return false;

        return true;
    }

    validation.isVersionId = async function(value) {
        
        /// Ensure that value is not empty
        if(!value) return false;

        /// Ensure that the value is a string
        if(typeof value != "string") return false;

        /// Ensure that userId value is sha256
        if(!(/^[a-fA-F0-9]{64}$/.test(value))) return false;

        /// Ensure that value is valid uuid
        //if(!(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value))) return false;

        return true;
    }

    validation.isBase64 = async function(value) {
        
        /// Ensure that value provided exists
        if(!value) return false;

        /// Ensure that value only contains base64 supported characters
        if(!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;

        return true;
    }

    validation.isSessionCookieExists = async function(value) {
        
        /// Ensure that request contains cookies
        if(!value) return false;

        /// Ensure cookie contains auth key
        if(!value.auth) return false;

        return true;
    }

    validation.isRequestBodyExists = async function(value) {

        /// Ensure that the body exists
        if(!value.body) return false;

        return true;
    }

    return validation;

    
}