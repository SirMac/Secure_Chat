
async function makeAPIcall(options) {
    const { url, method, body, headers } = options
    if (!url || !method || !headers) {
        console.log('makeAPIcall: api call options incomplete')
        return { error: { message: 'An error occured. Try again later' } }
    }

    const option = {
        method,
        body: typeof body == 'object' ? JSON.stringify(body) : body,
        headers
    }

    if (!body) delete option.body
    console.log('option:', option)

    try {
        let response = await fetch(url, option)

        const responseData = await response.json()
        responseData.status = response.status
        // console.log('makeAPIcall:', responseData)
        return responseData
    }

    catch (err) {
        console.log('form-submit-error: ', err.message)
        return { error: { message: 'An error occured. Try again later' } }
    }

}


function logMessage(message){
    const errorMsgField = document.getElementById('message-log')
    errorMsgField && (errorMsgField.innerHTML = message)
}

async function showMessage(type, sender, username, message) {
    const whitelist = ['publickey', 'publickey-reply', 'publickeyBHash', 'publickeyBHash-reply']
    for (const item of whitelist) {
        if (type == item) return
    }

    const chats_div = document.getElementById("chats-container")
    let plainText = message
    if (type == 'message') {
        plainText = await decryptAES(message, crypto_key, crypto_iv)
    }
    if (sender == username) {
        chats_div.innerHTML += `<div class="single-message sent">
          <div class="msg-body">${plainText}</div>
          <p class="sender">Me</p>
        </div>`;
    } else {
        chats_div.innerHTML += `<div class="single-message">
          <div class="msg-body">${plainText}</div>
          <p class="sender">${sender}</p>
        </div>`;
    }
}



function getMessageDetail(message, type){
    const username = sessionStorage.getItem('username')
    const roomname = sessionStorage.getItem('roomname')
    return {
        message,
        room_name: roomname,
        sender: username,
        type
    }
}


async function handshake(socket, data) {
    let sender = data["sender"]
    let content = data["message"]
    let type = data["type"]
    const username = sessionStorage.getItem('username')
    const roomname = sessionStorage.getItem('roomname')

    if (type == 'publickey') {
        if (sender !== username) {
            sessionStorage.setItem(`publicKeyB`, content)
            const publicKey = sessionStorage.getItem('publicKey')
            socket.send(
                JSON.stringify(getMessageDetail(publicKey, 'publickey-reply'))
            );
        }
    }

    if (type == 'publickey-reply') {
        if (sender !== username) {
            sessionStorage.setItem(`publicKeyB`, content)
            const privateKey = sessionStorage.getItem('privateKey')
            const publicKeyBHash = await digitalSignMessage(content, privateKey)
            socket.send(
                JSON.stringify(getMessageDetail(publicKeyBHash, 'publickeyBHash'))
            );
        }
    }

    if (type == 'publickeyBHash') {
        if (sender !== username) {
            sessionStorage.setItem(`publickeyBHash`, content)
            const publicKey = sessionStorage.getItem('publicKey')
            const privateKey = sessionStorage.getItem('privateKey')
            const publicKeyB = sessionStorage.getItem('publicKeyB')
            
            const isHashVerified = await verifySignature(publicKey, content, publicKey)
            if(!isHashVerified){
                console.log('isHashVerified: ', isHashVerified, ' -> hash verification failed')
                logMessage(`Partner, '${sender}' authenticaion failed.`)
                return socket.close()
            }

            const publicKeyBHash = await digitalSignMessage(publicKeyB, privateKey)
            socket.send(
                JSON.stringify(getMessageDetail(publicKeyBHash, 'publickeyBHash-reply'))
            );
        }
    }

    if (type == 'publickeyBHash-reply') {
        if (sender !== username) {
            sessionStorage.setItem(`publickeyBHash`, content)
        }
    }
}










// display chat on reload
//   document.addEventListener('DOMContentLoaded', async function () {
//     const options = {
//       url: 'http://localhost:8000/chats/gab_dan/',
//       method: 'get',
//       headers: {
//         'Content-Type': 'application/json',
//       }
//     }
//     let response = await makeAPIcall(options)
//     console.log('Page reloaded:', response);
//     const chats_div = document.getElementById("chats-container")

//     response.forEach(chat => {
//       if (chat.fields.sender == "{{#username#}}") {
//         chats_div.innerHTML += `<div class="single-message sent">
//           <div class="msg-body">${chat.fields.message}</div>
//           <p class="sender">Me</p>
//         </div>`;
//       } else {
//         chats_div.innerHTML += `<div class="single-message">
//           <div class="msg-body">${chat.fields.message}</div>
//           <p class="sender">${sender}</p>
//         </div>`;
//       }
//     });

//   });
