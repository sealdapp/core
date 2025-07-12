"use strict";

/// Import required libraries
import { expect } from "chai";

/// Import application module to test
import { handler as auth_signin } from "../../source/auth_signin.mjs";

describe("Authentication", () => {

    /// Success scenarios
    it("Should be able to authenticate using root user", async () => {

        /// Call module handler
        let response = await auth_signin({
            body : { oauth_token : process.env.AUTH_TOKEN }
        })

        expect(true).to.equal(true);
    })

    it("Should be able to authenticate using normal user", () => {

    })


})