"use strict";

/// Import required libraries
import { expect } from "chai";
import Setup from "../lib/setup.mjs";

/// Import application module to test
import { handler as job_keys_rotate_session } from "../../source/job_keys_rotate_session.mjs";

let setup = new Setup();

/// Initialize setup
before(async function() { await setup.init(); })

describe("✅ Jobs - Session Rotate", async function() {

    it("Should be able to rotate session keys", async function() {

        /// Call module handler
        let response = await job_keys_rotate_session({})

        expect(response.statusCode).to.equal(200);

    })
})

