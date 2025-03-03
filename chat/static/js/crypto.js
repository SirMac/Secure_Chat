async function encryptAES(plainText, key, iv) {
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
        "raw",
        encoder.encode(key),
        { name: "AES-CBC", },
        false,
        ["encrypt", "decrypt"]
    );

    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-CBC", iv: encoder.encode(iv) },
        keyData,
        encoder.encode(plainText)
    );

    return Array.from(new Uint8Array(encryptedData))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}


async function decryptAES(cipherText, key, iv) {
    console.log('cipherText.length:', cipherText.length)
    if(cipherText.length < 9) return cipherText
    const decoder = new TextDecoder();
    const keyData = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(key),
        { name: "AES-CBC", },
        false,
        ["encrypt", "decrypt"]
    );

    const encryptedBytes = new Uint8Array(cipherText.match(/../g).map(hex => parseInt(hex, 16)));
    const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv: new TextEncoder().encode(iv) },
        keyData,
        encryptedBytes
    );
    return decoder.decode(decryptedData);
}