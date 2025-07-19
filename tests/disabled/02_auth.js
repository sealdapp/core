"use strict";

/// Import required libraries
import { expect } from "chai";
import axios from "axios";

/// Import application module to test
import { handler as auth_signin } from "../../source/auth_signin.mjs";
import { handler as auth_verify } from "../../source/auth_verify.mjs";

let TOKEN_ROOT;
let TOKEN_USER;
let TOKEN_UNAUTHORIZED;

let APP_TOKEN;

describe("✅ Authentication - Signin", async function() {

    /// Get jwt token from firebase
    before(async function() {

        let apiKey = process.env.API_KEY;

        async function getIdToken(email, password) {
            try {
                const res = await axios.post(
                    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                    {
                        email,
                        password,
                        returnSecureToken: true,
                    }
                );
                return res.data.idToken;
            } catch (error) {
                console.error('Error getting token:', error.response?.data || error.message);
            }
        }

        TOKEN_ROOT = await getIdToken(process.env.EMAIL1, process.env.PASSW1);
        TOKEN_USER = await getIdToken(process.env.EMAIL2, process.env.PASSW2);
        TOKEN_UNAUTHORIZED = await getIdToken(process.env.EMAIL3, process.env.PASSW3);
        
    })

    it("Should be able to authenticate using root user", async function() {

        /// Call module handler
        let response = await auth_signin({
            body : { oauth_token : TOKEN_ROOT }
        })

        expect(response.statusCode).to.equal(200);
        expect(response).to.have.property("cookies");
        expect(response.cookies[0]).to.include("sessionToken");

    })

    it("Should be able to authenticate using normal user", async function() {

        /// Call module handler
        let response = await auth_signin({
            body : { oauth_token : TOKEN_USER }
        })

        expect(response.statusCode).to.equal(200);
        expect(response).to.have.property("cookies");
        expect(response.cookies[0]).to.include("sessionToken");
    })

})


describe("✅ Authentication - Verify", async function() {

    /// Get jwt token from firebase
    before(async function() {

        let apiKey = process.env.API_KEY;

        async function getIdToken(email, password) {
            try {
                const res = await axios.post(
                    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                    {
                        email,
                        password,
                        returnSecureToken: true,
                    }
                );
                return res.data.idToken;
            } catch (error) {
                console.error('Error getting token:', error.response?.data || error.message);
            }
        }

        TOKEN_USER = await getIdToken(process.env.EMAIL2, process.env.PASSW2);

        /// Call module handler
        let response = await auth_signin({
            body : { oauth_token : TOKEN_USER }
        })

        /// Extract session token from cookie
        const match = response.cookies[0].match(/sessionToken=([^;]+)/);
        const sessionToken = match ? match[1] : null;
        
        APP_TOKEN = sessionToken;
        
    })

    it("Should be able to verify a valid token", async function() {

        /// Call module handler
        let response = await auth_verify({
            cookies : [ `sessionToken=${ APP_TOKEN };` ]
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
            body : { oauth_token : process.env.TOKEN_INVALID }
        })

        expect(response.statusCode).to.equal(500)
        expect(JSON.parse(response.body).message).to.equal("Invalid token structure")
    })

    it("Should fail if token supplied is already expired", async function() {
        let response = await auth_signin({
            body : { oauth_token : process.env.TOKEN_EXPIRED }
        })

        expect(response.statusCode).to.equal(401)
        expect(JSON.parse(response.body).message).to.equal("Failed to authenticate user.")

    })

    it("Should fail if user is not authorized", async function() {
        let response = await auth_signin({
            body : { oauth_token : TOKEN_UNAUTHORIZED }
        })

        expect(response.statusCode).to.equal(403)
        expect(JSON.parse(response.body).message).to.equal("You are not authorized.")

    })

    it("Should fail if email is not verified", async function() {
        /// Temporarily change environment to prod
        process.env.NODE_ENV="prod";

        let response = await auth_signin({
            body : { oauth_token : TOKEN_UNAUTHORIZED }
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
            cookies : [ `sessionToken=${ process.env.TOKEN_INVALID };` ]
        })

        expect(response.isAuthorized).to.equal(false)
        expect(response.context.message).to.equal("Invalid session token.");
    })

    it("Should fail if token is expired", async function() {

        let response = await auth_verify({
            cookies : [ `sessionToken=${ process.env.TOKEN_EXPIRED };` ]
        })

        expect(response.isAuthorized).to.equal(false)
        expect(response.context.message).to.equal("Invalid session token.");
    })


})