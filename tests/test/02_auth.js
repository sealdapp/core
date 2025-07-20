"use strict";

/// Import required libraries
import { expect } from "chai";
import Setup from "../lib/setup.mjs";

/// Import application module to test
import { handler as auth_signin } from "../../source/auth_signin.mjs";
import { handler as auth_verify } from "../../source/auth_verify.mjs";

let setup = new Setup();

/// Initialize setup
before(async function() { await setup.init(); })

describe("✅ Authentication - Signin", async function() {

    it("Should be able to authenticate using root user", async function() {

        /// Call module handler
        let response = await auth_signin({
            body : { oauth_token : (await setup.getTokens()).auth.root }
        })

        expect(response.statusCode).to.equal(200);
        expect(response).to.have.property("cookies");
        expect(response.cookies[0]).to.include("sessionToken");

    })

    it("Should be able to authenticate using normal user", async function() {

        /// Call module handler
        let response = await auth_signin({
            body : { oauth_token : (await setup.getTokens()).auth.user }
        })

        expect(response.statusCode).to.equal(200);
        expect(response).to.have.property("cookies");
        expect(response.cookies[0]).to.include("sessionToken");
    })

})


describe("✅ Authentication - Verify", async function() {

    it("Should be able to verify a valid root token", async function() {

        /// Call module handler
        let response = await auth_verify({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.root };` ]
        })

        expect(response.isAuthorized).to.equal(true);
    })

    it("Should be able to verify a valid user token", async function() {

        /// Call module handler
        let response = await auth_verify({
            cookies : [ `sessionToken=${ (await setup.getTokens()).app.user };` ]
        })

        expect(response.isAuthorized).to.equal(true);
    })
})

describe("❌ Authentication - Signin", async function() {

    it("Should fail if body is not supplied", async function() {
        let response = await auth_signin({})

        expect(response.statusCode).to.equal(400)
    })

    it("Should fail if oauth_token is not supplied", async function() {
        let response = await auth_signin({
            body : {}
        })

        expect(response.statusCode).to.equal(500)
        expect(JSON.parse(response.body).message).to.equal("Missing oauth_token.")
    })

    it("Should fail if oauth_token is empty", async function() {
        let response = await auth_signin({
            body : { oauth_token : "" }
        })

        expect(response.statusCode).to.equal(500)
        expect(JSON.parse(response.body).message).to.equal("Invalid oauth_token.")
    })

    it("Should fail if oauth_token is invalid", async function() {
        let response = await auth_signin({
            body : { oauth_token : (await setup.getTokens()).dummy.invalid }
        })

        expect(response.statusCode).to.equal(500)
        expect(JSON.parse(response.body).message).to.equal("Invalid token structure")
    })

    it("Should fail if token supplied is already expired", async function() {
        let response = await auth_signin({
            body : { oauth_token : (await setup.getTokens()).dummy.expired }
        })

        expect(response.statusCode).to.equal(401)
        expect(JSON.parse(response.body).message).to.equal("Failed to authenticate user.")

    })

    it("Should fail if user is not authorized", async function() {
        let response = await auth_signin({
            body : { oauth_token : (await setup.getTokens()).auth.unauthorized }
        })

        expect(response.statusCode).to.equal(403)
        expect(JSON.parse(response.body).message).to.equal("You are not authorized.")

    })

    it("Should fail if email is not verified", async function() {
        /// Temporarily change environment to prod
        process.env.NODE_ENV="prod";

        let response = await auth_signin({
            body : { oauth_token : (await setup.getTokens()).auth.unauthorized }
        })

        /// Revert back to dev environment
        process.env.NODE_ENV="dev";

        expect(response.statusCode).to.equal(500)
        expect(JSON.parse(response.body).message).to.equal("Email is not verified.")

    })
})

describe("❌ Authentication - Verify", async function() {

    it("Should fail if cookies is not defined", async function() {

        let response = await auth_verify({})

        expect(response.isAuthorized).to.equal(false)
        expect(response.context.message).to.equal("Cookie not found.");
    })

    it("Should fail if cookies is invalid", async function() {

        let response = await auth_verify({
            cookies : ""
        })

        expect(response.isAuthorized).to.equal(false)
        expect(response.context.message).to.equal("Invalid cookie.");
    })

    it("Should fail if session token is missing", async function() {

        let response = await auth_verify({
            cookies : [ "test=123;" ]
        })

        expect(response.isAuthorized).to.equal(false)
        expect(response.context.message).to.equal("Missing session token.");
    })

    it("Should fail if token is empty", async function() {

        let response = await auth_verify({
            cookies : [ "sessionToken=;" ]
        })

        expect(response.isAuthorized).to.equal(false)
        expect(response.context.message).to.equal("Token cannot be empty.");
    })

    it("Should fail if token is invalid", async function() {

        let response = await auth_verify({
            cookies : [ `sessionToken=${ (await setup.getTokens()).dummy.invalid };` ]
        })

        expect(response.isAuthorized).to.equal(false)
        expect(response.context.message).to.equal("Malformed token.");
    })

    it("Should fail if token is expired", async function() {

        /// Decrease session timeout configuration
        process.env.APP_JWT_TOKEN_EXPIRY = "0s"
        
        let APP_TOKEN_USER = await setup.getSessionToken((await setup.getTokens()).auth.user);

        let verified = await auth_verify({
            cookies : [ `sessionToken=${ APP_TOKEN_USER };` ]
        })

        expect(verified.isAuthorized).to.equal(false)
        expect(verified.context.message).to.equal("Session token expired.");

        /// Rever to original settings
        await setup.resetEnv();
    })

    it("Should fail if token is signed by different issuer", async function() {

        /// Decrease session timeout configuration
        process.env.APP_JWT_ISSUER = "wrong-issuer"
        
        let APP_TOKEN_USER = await setup.getSessionToken((await setup.getTokens()).auth.user);;

        /// Revert to original settings
        await setup.resetEnv();

        let verified = await auth_verify({
            cookies : [ `sessionToken=${ APP_TOKEN_USER };` ]
        })

        expect(verified.isAuthorized).to.equal(false)
        expect(verified.context.message).to.equal("Invalid token.");

    })
})