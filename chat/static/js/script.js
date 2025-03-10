
function generateRandomNumber(min = 8, max = 60) {
  const maxLimit = max
  const minLimit = min
  return Math.floor(Math.random() * maxLimit) + minLimit
}

function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

function getRandomPrime(min, max) {
  while (true) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    if (isPrime(randomNum)) {
      return randomNum;
    }
  }
}

function logMsgOnPage(message) {
  const errorMsgField = document.getElementById('message-log')
  errorMsgField && (errorMsgField.innerHTML = message)
}


function logWithDelay(msg, time = 100) {
  setTimeout(() => {
    console.log(msg)
  }, time)
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
      logMsgOnPage(`AES key expired. Message decryption failed`)
      return socket.readyState == 1 && socket.close()
    }
  }

  if (hash && hash.length > 10 && sender !== username) {
    const isHashVerified = await verifySignature(publicKeyB, hash, plainText)
    if (!isHashVerified) {
      console.log('isHashVerified: ', ' -> message signature verification failed')
      logMsgOnPage(`Message signature from '${sender}' verification failed.`)
      return socket.readyState == 1 && socket.close()
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
        logMsgOnPage(`Partner, '${sender}' authenticaion failed.`)
        return socket.readyState == 1 && socket.close()
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
        logMsgOnPage(`Partner, '${sender}' authenticaion failed.`)
        return socket.readyState == 1 && socket.close()
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

  if (type == 'publickeyBHash' && sender !== username) {
    let dhP = sessionStorage.getItem('dhP')
    let dhG = sessionStorage.getItem('dhG')
    if(!dhP || !dhG){
      dhG = generateRandomNumber(2, 8)
      dhP = getRandomPrime(23, 61)
      sessionStorage.setItem('dhG', dhG)
      sessionStorage.setItem('dhP', dhP)
      console.log(`DH public keys generated by '${username}': p=${dhP}, g=${dhG}`)
    }
    const { dhPublicKey } = diffieHellman(dhP, dhG, privateKeyDH)
    let messageDetail = getMessageDetail(dhPublicKey, 'dhkeypass')
    messageDetail.dhP = dhP
    messageDetail.dhG = dhG
    socket.send(
      JSON.stringify(messageDetail)
    );
  }

  if (type == 'dhkeypass' && sender !== username) {
    const dhG = data['dhG']
    const dhP = data['dhP']
    sessionStorage.setItem('dhG', dhG)
    sessionStorage.setItem('dhP', dhP)
    const { dhPublicKey, dhGenerateSecret } = diffieHellman(dhP, dhG, privateKeyDH)
    const dhSharedKey = (await hashMessage(dhGenerateSecret(content))).hashHex
    sessionStorage.setItem('dhSharedKey', dhSharedKey)
    socket.send(
      JSON.stringify(getMessageDetail(dhPublicKey, 'dhkeypass-reply'))
    );
    logWithDelay(`DH shared key generated by ${username.toUpperCase()}: ${dhSharedKey}`)
  }

  if (type == 'dhkeypass-reply' && sender !== username) {
    const dhG = sessionStorage.getItem('dhG')
    const dhP = sessionStorage.getItem('dhP')
    const { dhGenerateSecret } = diffieHellman(dhP, dhG, privateKeyDH)
    const dhSharedKey = (await hashMessage(dhGenerateSecret(content))).hashHex
    sessionStorage.setItem('dhSharedKey', dhSharedKey)
    console.log(
      `DH shared key generated by ${username.toUpperCase()}: ${dhSharedKey}`
    )
  }
}