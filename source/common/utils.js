"use strict";

const winston = require('winston');
const dotenv = require("dotenv");

module.exports = function(caller){

    /// Get the base file name of the caller
    const serviceName = caller.split(/[/\\]/).pop().split(/\./)[0];

    let env = {};

    /// Load common environment variables
    dotenv.config({ path : `${ __dirname }/../../dev/.env.${ process.env.NODE_ENV }.common`, processEnv: env });

    /// Load module environment variables
    dotenv.config({ path : `${ __dirname }/../../dev/.env.${ process.env.NODE_ENV }.${ serviceName }`, processEnv: env });

    return env;
}