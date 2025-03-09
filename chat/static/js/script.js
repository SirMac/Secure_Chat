
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


function generateRandomNumber() {
  const maxLimit = 60
  const minLimit = 2
  return Math.floor(Math.random() * maxLimit) + minLimit
}


function logMessage(message) {
  const errorMsgField = document.getElementById('message-log')
  errorMsgField && (errorMsgField.innerHTML = message)
}

async function showMessage(socket, data) {
  const whitelist = [
    'publickey', 'publickey-reply', 'publickeyBHash',
    'publickeyBHash-reply', 'dhkeypass', 'dhkeypass-reply'
  ]

  let sender = data["sender"]
  let message = data["message"]
  let type = data["type"]
  let hash = data["hash"]
  let username = sessionStorage.getItem('username')

  if (!username || !sender || !message || !type) return

  for (const item of whitelist) {
    if (type == item) return
  }

  let plainText = message
  const chats_div = document.getElementById("chats-container")
  const dhSharedKey = sessionStorage.getItem('dhSharedKey')
  const publicKeyB = sessionStorage.getItem('publicKeyB')

  if (type == 'message') {
    plainText = await decryptAES(message, dhSharedKey, crypto_iv)
    if (!plainText) {
      logMessage(`AES key expired. Message decryption failed`)
      return socket.close()
    }
  }

  if (hash && hash.length > 10 && sender !== username) {
    const isHashVerified = await verifySignature(publicKeyB, hash, plainText)
    if (!isHashVerified) {
      console.log('isHashVerified: ', ' -> message signature verification failed')
      logMessage(`Message signature from '${sender}' verification failed.`)
      return socket.close()
    }
    console.log(`Message signature from '${sender}' verification successful.`)
  }

  chats_div.innerHTML += `<div class="single-message ${sender == username && 'sent'}">
    <div class="msg-body">${plainText}</div>
    <p class="sender">${sender == username ? 'Me' : sender}</p>
  </div>`;

}



function getMessageDetail(message, type) {
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
  const publicKey = sessionStorage.getItem('publicKey')
  const privateKey = sessionStorage.getItem('privateKey')
  const publicKeyB = sessionStorage.getItem('publicKeyB')

  if (!sender || !content || !type) return

  if (type == 'publickey') {
    if (sender !== username) {
      sessionStorage.setItem(`publicKeyB`, content)
      socket.send(
        JSON.stringify(getMessageDetail(publicKey, 'publickey-reply'))
      );
    }
  }

  if (type == 'publickey-reply') {
    if (sender !== username) {
      sessionStorage.setItem(`publicKeyB`, content)
      const publicKeyBHash = await digitalSignMessage(content, privateKey)
      socket.send(
        JSON.stringify(getMessageDetail(publicKeyBHash, 'publickeyBHash'))
      );
    }
  }

  if (type == 'publickeyBHash') {
    if (sender !== username) {
      sessionStorage.setItem(`publickeyBHash`, content)
      const isHashVerified = await verifySignature(publicKeyB, content, publicKey)
      if (!isHashVerified) {
        console.log('isHashVerified: ', isHashVerified, ' -> hash verification failed')
        logMessage(`Partner, '${sender}' authenticaion failed.`)
        return socket.close()
      }
      console.log(`Hash verified. Authentication successful for ${sender}`)

      const publicKeyBHash = await digitalSignMessage(publicKeyB, privateKey)
      socket.send(
        JSON.stringify(getMessageDetail(publicKeyBHash, 'publickeyBHash-reply'))
      );
    }
  }

  if (type == 'publickeyBHash-reply') {
    if (sender !== username) {
      sessionStorage.setItem(`publickeyBHash`, content)
      const isHashVerified = await verifySignature(publicKeyB, content, publicKey)
      if (!isHashVerified) {
        console.log('isHashVerified: ', isHashVerified, `-> hash verification failed for ${sender}`)
        logMessage(`Partner, '${sender}' authenticaion failed.`)
        return socket.close()
      }
      console.log(`Hash verified. Authentication successful for ${sender}`)
    }
  }
}




async function dhKeyExchange(socket, data) {
  let sender = data["sender"]
  let content = data["message"]
  let type = data["type"]
  const username = sessionStorage.getItem('username')
  const privateKeyDH = sessionStorage.getItem('privateKeyDH')

  if (!sender || !content || !type) return

  if (type == 'publickeyBHash') {
    if (sender !== username) {
      const { dhPublicKey } = diffieHellman(p, g, privateKeyDH)
      socket.send(
        JSON.stringify(getMessageDetail(dhPublicKey, 'dhkeypass'))
      );
    }
  }

  if (type == 'dhkeypass') {
    if (sender !== username) {
      const { dhPublicKey, dhGenerateSecret } = diffieHellman(p, g, privateKeyDH)
      const dhSharedKey = (await hashMessage(dhGenerateSecret(content))).hashHex
      sessionStorage.setItem('dhSharedKey', dhSharedKey)
      socket.send(
        JSON.stringify(getMessageDetail(dhPublicKey, 'dhkeypass-reply'))
      );
    }
  }

  if (type == 'dhkeypass-reply') {
    if (sender !== username) {
      const { dhGenerateSecret } = diffieHellman(p, g, privateKeyDH)
      const dhSharedKey = (await hashMessage(dhGenerateSecret(content))).hashHex
      sessionStorage.setItem('dhSharedKey', dhSharedKey)
    }
  }
}