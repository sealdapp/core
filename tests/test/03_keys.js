"use strict";

/// Import required libraries
import { expect } from "chai";
import axios from "axios";

/// Import application module to test
import { handler as auth_signin } from "../../source/auth_signin.mjs";
import { handler as keys_get } from "../../source/keys_get.mjs";

let TOKEN_ROOT;
let TOKEN_USER;
let TOKEN_UNAUTHORIZED;

let APP_TOKEN;

describe("✅ Keys - Setup", async function() {

})

describe("✅ Keys - Get", async function() {

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

    it("Should be able to get key for root user", async function() {

        /// Call module handler
        let response = await keys_get({
            cookies : [ `sessionToken=${ APP_TOKEN };` ]
        })

        console.log(response)
        expect(response.statusCode).to.equals(200);
    })
})