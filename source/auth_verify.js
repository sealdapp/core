"use strict";

/// Import 3rd party libraries

/// Import application libraries
const logger = require("./common/logger")();
const auth = require("./plugins/authenticators/oauth2_google")(logger);

/// Initializations


auth.test()