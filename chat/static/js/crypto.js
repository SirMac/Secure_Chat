const crypto_key = '000102030405060708090a0b0c0d0e0f'; // test 16 bytes key
const crypto_iv = '18191a1b1c1d1e1f'; // test 16 bytes
const p = 23; // A large prime number
const g = 5;  // A primitive root modulo p
const rsapss_salt_len = 16
const rsa_publickey_format = 'spki'
const rsa_privatekey_format = 'pkcs8'
const rsa_algorithm = 'RSA-PSS'
const hash_algorithm = 'SHA-256'


async function generateRSAKeys() {
    let keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: hash_algorithm,
        },
        true,
        ["encrypt", "decrypt"],
    );
    return keyPair
}


function stringToArrayBuffer(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}


function base64ToBuffer(base64){
    const base64Binary = window.atob(base64);
    return stringToArrayBuffer(base64Binary)
}


function rsaKeyToBuffer(pem, format=rsa_privatekey_format){
    if(!pem) return ''

    let pemHeader = "-----BEGIN PUBLIC KEY-----";
    let pemFooter = "-----END PUBLIC KEY-----";
    if (format == rsa_privatekey_format) {
        pemHeader = "-----BEGIN PRIVATE KEY-----";
        pemFooter = "-----END PRIVATE KEY-----";
    }
    const pemContents = pem.substring(
        pemHeader.length,
        pem.length - pemFooter.length - 1,
    );
    return base64ToBuffer(pemContents);
}


async function importRSAKey(pem, usage='sign', format=rsa_privatekey_format) {
    if(!pem) return ''
    const binaryDer = rsaKeyToBuffer(pem, format)
    const importedKey = await window.crypto.subtle.importKey(
        format,
        binaryDer,
        {
            name: rsa_algorithm,
            hash: hash_algorithm,
        },
        true,
        [usage],
    );
    return importedKey
}



async function exportRSAKey(key, format) {
    const exported = await window.crypto.subtle.exportKey(
        format, 
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
    try {
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
    } catch (error) {
        console.log('encryptAES-error:', error.message)
        return ''
    }
}


async function decryptAES(cipherText, key, iv) {

    if (cipherText.length < 9 || !key || !iv) return ''

    try {
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
    } catch (error) {
        console.log('decryptAES-error:', error.message)
        return ''
    }
}



async function hashMessage(text) {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest(hash_algorithm, msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("").substring(0,32);

    return {
        hashHex,
        hashBuffer
    }
}



async function digitalSignMessage(message, privateKey) {
    const { hashBuffer } = await hashMessage(message)

    const key = await importRSAKey(privateKey)
    const signatureBuffer = await crypto.subtle.sign(
        {
            name: rsa_algorithm,
            saltLength: rsapss_salt_len
        },
        key,
        hashBuffer
    );
    const exportedAsString = String.fromCharCode(...new Uint8Array(signatureBuffer));
    const exportedAsBase64 = btoa(exportedAsString);
    return exportedAsBase64
}


async function verifySignature(publicKey, signature, data) {
    const signatureBuffer = base64ToBuffer(signature)
    let importedKey = await importRSAKey(publicKey, 'verify', rsa_publickey_format)
    const { hashBuffer } = await hashMessage(data)

    return await window.crypto.subtle.verify(
        {
            name: rsa_algorithm,
            saltLength: rsapss_salt_len,
        },
        importedKey,
        signatureBuffer,
        hashBuffer,
    );
}

// ....Diffie-Hellman key exchange....

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


function diffieHellman(p, g, privateKey) {
    return {
        dhPublicKey: power(g, privateKey, p),
        dhGenerateSecret: function (otherPublicKey) {
            return power(otherPublicKey, privateKey, p);
        },
    };
}



async function generateKeys(){
    const keyPair = await generateRSAKeys()
    if(!keyPair) return {}
    const publicKey = await exportRSAKey(keyPair.publicKey, 'spki')
    const privateKey = await exportRSAKey(keyPair.privateKey, 'pkcs8')
    const privateKeyDH = generateRandomNumber()
    return {
        publicKey,
        privateKey,
        privateKeyDH
    }
}