
const username = sessionStorage.getItem('username')
const roomname = sessionStorage.getItem('roomname')

const socketURL = `ws://${window.location.host}/ws/messages/${roomname}/`;
console.log("Establishing Socket Connection... ", socketURL)
const socket = new WebSocket(socketURL)

socket.onerror = function (err) {
  console.log('socket-connection-error:', err)
  socket.readyState==1 && socket.close()
}

socket.onopen = function (e) {
  console.log("Successfully connected to the WebSocket.");
  const publicKey = sessionStorage.getItem('publicKey')
  const {dhSharedKeyName} = getDHKeysName()
  sessionStorage.removeItem(dhSharedKeyName)
  socket.send(
    JSON.stringify({
      message: publicKey,
      room_name: roomname,
      sender: username,
      type: 'publickey'
    })
  );
}


// Send Message to the backend
const message_form = document.getElementById("msg-form")
message_form.addEventListener("submit", async function (event) {
  event.preventDefault();
  const {dhSharedKeyName} = getDHKeysName()
  const message_sent = document.getElementById("message").value;
  const roomname = sessionStorage.getItem('roomname')
  const dhSharedKey = sessionStorage.getItem(dhSharedKeyName)
  const privateKey = sessionStorage.getItem('privateKey')
  const partner = sessionStorage.getItem('partner')
  if(!dhSharedKey){
    console.log(`Partner, '${partner}' not online`)
    return logMsgOnPage(`Partner, '${partner}' not online`)
  }
  const signedMessage = await digitalSignMessage(message_sent, privateKey)
  let encryptedMsg = await encryptAES(message_sent, dhSharedKey, crypto_iv)
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


// Recieve Message from the backend
socket.addEventListener("message", async (e) => {
  const data = JSON.parse(e.data)["message"]
  console.log('message-from-server', data);
  await handshake(socket, data)
  await dhKeyExchange(socket, data)
  await showMessage(socket, data)
  scrollToBottom();
});
