const crypto_key = '000102030405060708090a0b0c0d0e0f'; // test 16 bytes key
const crypto_iv = '18191a1b1c1d1e1f'; // test 16 bytes
const p = 23; // A large prime number
const g = 5;  // A primitive root modulo p


async function generateRSAKeys() {
    let keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
    );
    return keyPair
}

async function exportKey(key, format) {
    const exported = await window.crypto.subtle.exportKey(
      format, // "spki" (public key) or "pkcs8" (private key)
      key
    );
    const exportedAsString = String.fromCharCode(...new Uint8Array(exported));
    const exportedAsBase64 = btoa(exportedAsString);
    const pemHeader = format === "spki" ? "-----BEGIN PUBLIC KEY-----" : "-----BEGIN PRIVATE KEY-----";
    const pemFooter = format === "spki" ? "-----END PUBLIC KEY-----" : "-----END PRIVATE KEY-----";
    const pemExported = pemHeader + "\n" + exportedAsBase64 + "\n" + pemFooter;
  
    return pemExported;
  }


async function encodeKey(key) {
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
        "raw",
        encoder.encode(key),
        { name: "AES-CBC", },
        false,
        ["encrypt", "decrypt"]
    );
    return keyData
}

function getCryptoOption(iv) {
    return {
        name: "AES-CBC",
        iv: new TextEncoder().encode(iv)
    }
}

async function encryptAES(plainText, key, iv) {
    console.log('encryptAES: ', key, iv)
    const encoder = new TextEncoder();
    const keyData = await encodeKey(key)

    const encryptedData = await crypto.subtle.encrypt(
        getCryptoOption(iv),
        keyData,
        encoder.encode(plainText)
    );

    return Array.from(new Uint8Array(encryptedData))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}


async function decryptAES(cipherText, key, iv) {

    if (cipherText.length < 9) return cipherText

    const decoder = new TextDecoder();
    const keyData = await encodeKey(key)

    const encryptedBytes = new Uint8Array(cipherText.match(/../g)
        .map(hex => parseInt(hex, 16)));
    const decryptedData = await crypto.subtle.decrypt(
        getCryptoOption(iv),
        keyData,
        encryptedBytes
    );
    return decoder.decode(decryptedData);
}



async function hashMessage(text) {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hashHex;
}



// Function to calculate (base^exp) % mod
function power(base, exp, mod) {
    if (exp === 1) return base % mod;
    let res = 1;
    base = base % mod;
    while (exp > 0) {
        if (exp % 2 === 1) res = (res * base) % mod;
        base = (base * base) % mod;
        exp = Math.floor(exp / 2);
    }
    return res;
}

// Function to perform Diffie-Hellman key exchange
function diffieHellman(p, g, privateKey) {
    // Generate public key
    const publicKey = power(g, privateKey, p);

    return {
        publicKey: publicKey,
        generateSecret: function (otherPublicKey) {
            return power(otherPublicKey, privateKey, p);
        },
    };
}

// Example Usage


// Alice's Key Exchange
const alice = diffieHellman(p, g, 6); // Alice's private key is 6
// Bob's Key Exchange
const bob = diffieHellman(p, g, 15);   // Bob's private key is 15

// Exchange public keys (insecure channel)
const alicePublicKey = alice.publicKey;
const bobPublicKey = bob.publicKey;

// Generate shared secrets
const aliceSecret = hashMessage(alice.generateSecret(bobPublicKey)).then((hash) => {
    console.log("Alice's Secret Key:", hash);
});
const bobSecret = hashMessage(bob.generateSecret(alicePublicKey)).then((hash) => {
    console.log("Bob's Secret Key:", hash);
});


// console.log("Shared secrets are equal:", aliceSecret === bobSecret);
