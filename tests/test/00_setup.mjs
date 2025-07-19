"use strict";

import dotenv from 'dotenv';

dotenv.config({ path: [ 
    '../dev/.env.common',
    '../dev/.env.tests',
    '../dev/.env.creds.aws'
] }); // load specific dotenv file