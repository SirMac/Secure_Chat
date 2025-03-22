// async function makeAPIcall(options) {
//   const { url, method, headers } = options
//   if (!url || !method || !headers) {
//     console.log('makeAPIcall: api call options incomplete')
//     return { error: { message: 'An error occured. Try again later' } }
//   }

//   try {
//     let response = await fetch(url, {
//       method,
//       headers
//     })

//     const responseData = await response.json()
//     // responseData.status = response.status
//     // console.log('makeAPIcall:', responseData)
//     return responseData
//   }

//   catch (err) {
//     console.log('form-submit-error: ', err.message)
//     return { error: { message: 'An error occured. Try again later' } }
//   }

// }


function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}




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

function logMsgOnPage(message = '') {
  const errorMsgField = document.getElementById('message-log')
  if (!errorMsgField) return
  errorMsgField.innerHTML = message
}


function logWithDelay(msg, time = 100) {
  setTimeout(() => {
    console.log(msg)
  }, time)
}


function getDHKeysName() {
  const roomname = sessionStorage.getItem('roomname')
  return {
    dhGName: `dhG@${roomname}`,
    dhPName: `dhP@${roomname}`,
    dhSharedKeyName: `dhSharedKey@${roomname}`
  }
}


function clearMessageRequest() {
  const roomname = sessionStorage.getItem('roomname')
  if(!roomname) return
  const csrftoken = getCookie('csrftoken');
  console.log('csrftoken:', csrftoken)
  var data = new FormData();
  data.append('csrfmiddlewaretoken', csrftoken);
  this.navigator.sendBeacon(`/chat/${roomname}/clear/`, data)
}



async function showMessage(socket, data) {
  // const whitelist = [
  //   'publickey', 'publickey-reply', 'publickeyBSigned',
  //   'publickeyBSigned-reply', 'dhkeypass', 'dhkeypass-reply'
  // ]

  let sender = data["sender"]
  let message = data["message"]
  let type = data["type"]
  let digitalSignature = data["digitalSignature"]
  let username = sessionStorage.getItem('username')

  if (!username || !sender || !message || !type) return

  // for (const item of whitelist) {
  //   if (type == item) return
  // }
  if(type !== 'message') return

  let plainText = message
  const { dhSharedKeyName } = getDHKeysName()
  const chats_div = document.getElementById("chats-container")
  const roomname = sessionStorage.getItem('roomname')
  const dhSharedKey = sessionStorage.getItem(dhSharedKeyName)
  const publicKeyB = sessionStorage.getItem('publicKeyB')

  // if (type == 'message') {
    plainText = await decryptAES(message, dhSharedKey, crypto_iv)
    if (!plainText) {
      logMsgOnPage(`AES key expired. Message decryption failed`)
      clearMessageRequest()
      return socket.readyState == 1 && socket.close()
    }
  // }

  if (digitalSignature && digitalSignature.length > 10 && sender !== username) {
    const isHashVerified = await verifySignature(publicKeyB, digitalSignature, plainText)
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
      const publicKeyBSigned = await digitalSignMessage(content, privateKey)
      socket.send(
        JSON.stringify(getMessageDetail(publicKeyBSigned, 'publickeyBSigned'))
      );
    }
  }

  if (type == 'publickeyBSigned') {
    if (sender !== username) {
      sessionStorage.setItem(`publickeyBSigned`, content)
      const isSignatureVerified = await verifySignature(publicKeyB, content, publicKey)
      if (!isSignatureVerified) {
        console.log('isSignatureVerified: ', isSignatureVerified, ' -> hash verification failed')
        logMsgOnPage(`Partner, '${sender}' authenticaion failed.`)
        return socket.readyState == 1 && socket.close()
      }

      console.log(`Signature verified. Authentication successful for ${sender}`)

      const publicKeyBSigned = await digitalSignMessage(publicKeyB, privateKey)
      socket.send(
        JSON.stringify(getMessageDetail(publicKeyBSigned, 'publickeyBSigned-reply'))
      );
    }
  }

  if (type == 'publickeyBSigned-reply') {
    if (sender !== username) {
      sessionStorage.setItem(`publickeyBSigned`, content)
      const isSignatureVerified = await verifySignature(publicKeyB, content, publicKey)
      if (!isSignatureVerified) {
        console.log('isSignatureVerified: ', isSignatureVerified, `-> hash verification failed for ${sender}`)
        logMsgOnPage(`Partner, '${sender}' authenticaion failed.`)
        return socket.readyState == 1 && socket.close()
      }
      console.log(`Signature verified. Authentication successful for ${sender}`)
    }
  }
}




async function dhKeyExchange(socket, data) {
  let sender = data["sender"]
  let content = data["message"]
  let type = data["type"]
  const username = sessionStorage.getItem('username')
  const privateKeyDH = sessionStorage.getItem('privateKeyDH')
  const { dhPName, dhGName, dhSharedKeyName } = getDHKeysName()

  if (!sender || !content || !type) return

  if (type == 'publickeyBSigned' && sender !== username) {
    let dhP = sessionStorage.getItem(dhPName)
    let dhG = sessionStorage.getItem(dhGName)
    if (!dhP || !dhG) {
      dhG = generateRandomNumber(2, 8)
      dhP = getRandomPrime(23, 61)
      sessionStorage.setItem(dhGName, dhG)
      sessionStorage.setItem(dhPName, dhP)
      console.log(`DH public keys generated by '${username}': p=${dhP}, g=${dhG}`)
    }
    const { dhPublicKey } = diffieHellman(dhP, dhG, privateKeyDH)
    let messageDetail = getMessageDetail(dhPublicKey, 'dhkeypass')
    messageDetail[dhPName] = dhP
    messageDetail[dhGName] = dhG
    socket.send(
      JSON.stringify(messageDetail)
    );
  }

  if (type == 'dhkeypass' && sender !== username) {
    dhG = data[dhGName]
    dhP = data[dhPName]
    if (!dhP || !dhG) {
      return console.log('dhKeyExchange: dhkeypass - dhG & dhP not found')
    }
    sessionStorage.setItem(dhGName, dhG)
    sessionStorage.setItem(dhPName, dhP)
    const { dhPublicKey, dhGenerateSecret } = diffieHellman(dhP, dhG, privateKeyDH)
    const dhSharedKey = (await hashMessage(dhGenerateSecret(content))).hashHex
    sessionStorage.setItem(dhSharedKeyName, dhSharedKey)
    socket.send(
      JSON.stringify(getMessageDetail(dhPublicKey, 'dhkeypass-reply'))
    );
    logWithDelay(`DH shared key generated by ${username.toUpperCase()}: ${dhSharedKey}`)
  }

  if (type == 'dhkeypass-reply' && sender !== username) {
    const dhG = sessionStorage.getItem(dhGName)
    const dhP = sessionStorage.getItem(dhPName)
    if (!dhP || !dhG) {
      return console.log('dhKeyExchange: dhkeypass-reply - dhG & dhP not found')
    }
    const { dhGenerateSecret } = diffieHellman(dhP, dhG, privateKeyDH)
    const dhSharedKey = (await hashMessage(dhGenerateSecret(content))).hashHex
    sessionStorage.setItem(dhSharedKeyName, dhSharedKey)
    console.log(
      `DH shared key generated by ${username.toUpperCase()}: ${dhSharedKey}`
    )
  }
}

// window.addEventListener('beforeunload', async function (e) {
//   const username = sessionStorage.getItem('username')
//   const csrftoken = getCookie('csrftoken');
//   console.log('csrftoken:', csrftoken)
//   // var data = new FormData();
//   // data.append('csrfmiddlewaretoken', csrftoken);
//   // this.navigator.sendBeacon(`/user/${username}/`, data)
// })


function saveKeysOnload() {
  const publickey = sessionStorage.getItem('publicKey')
  const privatekey = sessionStorage.getItem('privateKey')
  const privatekeyDH = sessionStorage.getItem('privateKeyDH')

  if (publickey && privatekey && privatekeyDH) return

  document.addEventListener('DOMContentLoaded', async function () {
    const { publicKey, privateKey, privateKeyDH } = await generateKeys()
    sessionStorage.setItem('publicKey', publicKey)
    sessionStorage.setItem('privateKey', privateKey)
    sessionStorage.setItem('privateKeyDH', privateKeyDH)
    console.log(`New RSA publicKey generated: ...`, publicKey.slice(publicKey.length - 35))
    console.log(`New RSA privateKey generated: ...`, privateKey.slice(privateKey.length - 35))
    console.log(`New DH privateKey generated:`, privateKeyDH)
  })

}