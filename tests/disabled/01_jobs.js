"use strict";

/// Import required libraries
import { expect } from "chai";
import Setup from "../lib/setup.mjs";

/// Import application module to test
import { handler as job_keys_rotate_session } from "../../source/job_keys_rotate_session.mjs";

let setup = new Setup();

const sectionTitle = {
    success : await setup.getSectionTitle("success"),
    failure : await setup.getSectionTitle("failure")
}

/// Initialize setup
before(async function() { await setup.init(); })

describe("job_keys_rotate_session", async function() {

    describe(sectionTitle.success, async function() {
        
        it("Should be able to rotate session keys", async function() {

            /// Call module handler
            let response = await job_keys_rotate_session({})

            expect(response.statusCode).to.equal(200);

        })
    })
})

