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





async function showMessage(sender, username, message) {
    const chats_div = document.getElementById("chats-container")
    const plainText = await decryptAES(message, 'abcdfegnqoie1234', 'initializationve')
    if (sender == username) {
        chats_div.innerHTML += `<div class="single-message sent">
          <div class="msg-body">${message}</div>
          <p class="sender">Me</p>
        </div>`;
    } else {
        chats_div.innerHTML += `<div class="single-message">
          <div class="msg-body">${message}</div>
          <p class="sender">${sender}</p>
        </div>`;
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
