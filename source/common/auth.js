"use strict";

module.exports = function(crypto){

    const message = "" +
        "In order to ensure a secure and reliable login process, we must verify your identity. " +
        "Your cooperation in this matter is essential for maintaining the integrity of our communication platform. " +
        "As part of the verification process, it is mandatory to use your Ethereum wallet to sign this message " +
        "which includes your address (%{address}), the current time and date (%{timestamp}), and a unique nonce (%{nonce}). " +
        "Your signature, along with these required details, is critical for strengthening our security protocols " +
        "and ensuring a seamless login experience. " +
        "We greatly appreciate your adherence to this verification requirement. " +
        "Thank you for your cooperation as we prioritize stringent identity verification measures to safeguard our platform.";
    
    let auth = {};

    auth.getMessage = async function(){
        return message;
    }

    auth.recoverAddress = async function(message, signature){ 
        
        try {
            return await ethers.verifyMessage(message, signature);
        }
        catch(e) {
            return ethers.ZeroAddress;
        }
    }

    auth.isSigner = async function(signature, pem, params) {
        
        /**
         * User message is no longer needed since we no longer using metamask for signing
         * Signing message will happen using ethers and is seamless to user
         */
        /// Retrieve message
        //let msg = await auth.getMessage();

        /// Inject data to message
        //msg = await msg.replace("%{timestamp}", new Date(timestamp).toUTCString());
        //msg = await msg.replace("%{nonce}", nonce);
        //msg = await msg.replace("%{address}", address);
        
        /// Get stringified json and recover address from signature
        /*const extracted = await auth.recoverAddress(msg, signature);

        /// Ensure that the requested address matches the extracted address from the signature
        if(extracted != address) return false;

        /// Return true if matched
        else return true;*/

        console.log(`Checking if user [${ params.userId }] signature is valid.`)

        /// Construct message
        let message = `` +
            `userId=${ params.userId }&` +
            `versionId=${ params.versionId }&` +
            `timestamp=${ params.timestamp }&` +
            `nonce=${ params.nonce }&`;

        /// Import public key as crypto key
        let pubkey = await crypto.import.ecdsa_p384_public("spki", pem, true, ["verify"])

        /// Ensure import of public key is successful
        if(!pubkey.success) throw `Failed to verify signature.`; else pubkey = pubkey.data;

        /// Verify signature using the public key
        let valid_signature = await crypto.ecdsa.verifyMessage(pubkey, message, signature, "base64");

        /// Ensure validation operation is successful
        if(!valid_signature.success) throw `Failed to validate signature of user id.`; else valid_signature = valid_signature.data;
        
        /// Return status of signature
        return valid_signature;

    }


    return auth;
}