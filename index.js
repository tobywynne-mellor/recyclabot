const Messenger = require('messenger-node');
console.log("Recycle-Bot starting...");


let webhook_config = {
    // port (optional - defualts to process.env.PORT)
    // endpoint (optional - deffaults to webhook)
    // app_secret (optional - required for validating signed webview requests using Webhook.validateSignedRequest())
    'verify_token':'MY_VERIFY_TOKEN'
}

const Webhook = new Messenger.Webhook(webhook_config);

let client_options = {
    'page_token': '<PAGE TOKEN>'
    // optional 'app_token': '<APP TOKEN>',
    // optional api_version': 'v2.9'
}

const Client = new Messenger.Client(client_options);


/*
  Webhook Events that we're interested in
  - message_postbacks -> when postback button, get started button or persistent menu is tapped
  - messages -> when messages sent to page
  - message_deliveries -> when message from page has been delivered
  - (maybe) message_reads -> when message has been read by user
  - (maybe) message_echo -> when message sent by page
  - (maybe) message_reactions -> when user reacts to message
  - (maybe) mesaging_account_linking -> when Link account or Unlick Account have been tapped

  see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/

  Callback Arguments
   - event_type -> name of webhook event (can include sub-events)
   - sender_info -> contains 'value' and 'type' which contain ID and ID Type e.g. 38462826483, PSID
   - webhook_event -> the complete event from the 'messaging' array in the POST request

*/


Webhook.on('messaging_postbacks', (event_type, sender_info, webhook_event) => {
    // TODO: handle when postback button, get started button or persistent menu is tapped
  });

Webhook.on('messages', (event_type, sender_info, webhook_event) => {
    // TODO: handle when messages sent to page
    
  });

Webhook.on('message_deliveries', (event_type, sender_info, webhook_event) => {
    // TODO: handle when message from page has been delivered
});

// usefull for testing
Webhook.emit('messaging_postbacks', event_type, sender_info, webhook_event);
Webhook.emit('messages', event_type, sender_info, webhook_event);
Webhook.emit('message_deliveries', event_type, sender_info, webhook_event);


function sendMessage(recipientId, text) {
    let recipient = {
        'id': recipientId //parse to string?
    };
    
    // send the text message
    Client.sendText(recipient, text)
    .then(res => {
        // log the api response
        console.log(res);
    })
    .catch(e => {
        console.error(e);
    });
}
