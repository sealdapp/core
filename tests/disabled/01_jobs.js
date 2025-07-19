"use strict";

/// Import required libraries
import { expect } from "chai";

/// Import application module to test
import { handler as job_session_rotate } from "../../source/job_keys_rotate_session.mjs";

describe("✅ Jobs - Session Rotate", async function() {

    before(async function() {
    })

    it("Should be able to rotate session keys", async function() {

        /// Call module handler
        let response = await job_session_rotate({})

        expect(response.statusCode).to.equal(200);

    })
})

