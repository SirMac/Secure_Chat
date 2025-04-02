
const username = sessionStorage.getItem('username')
const roomname = sessionStorage.getItem('roomname')

const socketURL = `ws://${window.location.host}/ws/messages/${roomname}/`;
console.log("Establishing Socket Connection... ", socketURL)
const socket = new WebSocket(socketURL)

socket.onerror = function (err) {
  console.log('socket-connection-error:', err)
  socket.readyState == 1 && socket.close()
}

socket.onopen = function (e) {
  console.log("Successfully connected to the WebSocket.");
  const { dhSharedKeyName } = getDHKeysName()
  sessionStorage.removeItem(dhSharedKeyName)
  synchronize(socket)
}

// socket.onclose = function(e){
//   const partner = sessionStorage.getItem('partner')
//   return logMsgOnPage(`Partner, '${partner}' not online`)
// }


// Send Message
const message_form = document.getElementById("msg-form")
message_form.addEventListener("submit", async function (event) {
  event.preventDefault();
  const { dhSharedKeyName } = getDHKeysName()
  const message_sent = document.getElementById("message").value;
  const roomname = sessionStorage.getItem('roomname')
  const dhSharedKey = sessionStorage.getItem(dhSharedKeyName)
  const privateKey = sessionStorage.getItem('privateKey')
  const partner = sessionStorage.getItem('partner')

  if (!dhSharedKey) {
    console.log(`Partner, '${partner}' not online`)
    return logMsgOnPage(`Partner, '${partner}' not online`)
  }

  if(socket.readyState !== 1){
    return logMsgOnPage('Connection disconnected')
  }

  const signedMessage = await digitalSignMessage(message_sent, privateKey)
  if (!signedMessage) {
    return logMsgOnPage(`Failed to sign message with ${username}'s private key`)
  }

  let encryptedMsg = await encryptAES(message_sent, dhSharedKey, crypto_iv)
  if (!encryptedMsg) {
    return logMsgOnPage(`Message encryption by '${username}' failed`)
  }
  
  console.log("Sending message... ", encryptedMsg);
  logMsgOnPage()
  socket.send(
    JSON.stringify({
      message: encryptedMsg,
      room_name: roomname,
      sender: username,
      partner,
      type: "message",
      digitalSignature: signedMessage
    })
  );
  document.getElementById('message').value = ''
});


// Scroll to bottom
const scrollToBottom = () => {
  const chats_div = document.getElementById("chats-container")
  chats_div && (chats_div.scrollTop = chats_div.scrollHeight);
}


function handleDisconnect(data){
  let type = data['type']
  if(type !== 'handleDisconnect') return
  return socket.readyState == 1 && socket.close()
}


// Handle sent messages
socket.addEventListener("message", async (e) => {
  const data = JSON.parse(e.data)["message"]
  const sender = data['sender']
  const type = data['type']
  console.log(`${type}-from-${sender || 'server'}`, data);
  handleDisconnect(data)
  await handshake(socket, data)
  await dhKeyExchange(socket, data)
  await showMessage(socket, data)
  scrollToBottom();
});
