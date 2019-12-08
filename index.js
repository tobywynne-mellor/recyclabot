const Messenger = require('messenger-node');
var request = require('request');

require('dotenv').config();

console.log("Recycle-Bot starting...");

// console.log(process.env.PORT);
// console.log(process.env.APP_SECRET);
// console.log(process.env.VERIFY_TOKEN);
// console.log(process.env.PAGE_ACCESS_TOKEN);
// console.log(process.env.APP_ID);

let webhook_config = {
    'port': process.env.PORT,//(optional - defualts to process.env.PORT)
    'endpoint': "webhook",
    'app_secret': process.env.APP_SECRET, //(optional - required for validating signed webview requests using Webhook.validateSignedRequest())
    'verify_token': process.env.VERIFY_TOKEN
}

const Webhook = new Messenger.Webhook(webhook_config);

let client_options = {
    'page_token': process.env.PAGE_ACCESS_TOKEN,
    'app_token': process.env.APP_ID
    // optional api_version': 'v2.9'
}

const Client = new Messenger.Client(client_options);

let questionNumber = 1;


// let userConversations = {}

// function addNewUserConversation(userId){
//     userConversations[userId] = {"questions":[], "answers":[]};
// }

// function addQuestionToConversation(userId, question){
//     userConversations[userId]["questions"].push(question);
// }

// function addAnswerToConversation(userId, answer){
//     userConversations[userId]["answers"].push(answer);
// }

// function removeUserConversation(userId){
//     delete userConversations[userId];
// }

// function getPrevQuestion(userId){
//     return userConversations[userId]["questions"][userConversations[userId]["questions"]].length()-1
// }

// function getPrevAnswer(userId){
//     return userConversations[userId]["answers"][userConversations[userId]["answers"]].length()-1
// }

// function getQuestionNumber(userId, question){
//     return userConversations[userId]["questions"].indexOf(question)+1
// }

// function getAnswerNumber(userId, answer){
//     return userConversations[userId]["answers"].indexOf(answer)+1
// }

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

// when user first opens
Webhook.on('messaging_postbacks', (event_type, sender_info, webhook_event) => {
    // do something 
    console.log("postback");
    let userId = sender_info.value;
    //addNewUserConversation(userId);
    beginConversation(userId);
});

// Webhook.on('messaging_postbacks', (event_type, sender_info, webhook_event) => {
//     // TODO: handle when postback button, get started button or persistent menu is tapped
//     // Webhook.emit('messaging_postbacks', event_type, sender_info, webhook_event);
//     let userId = sender_info.value;
//     //sendYesNoQuestion(userId, "Is your container dirty?");
//     handleMessageEvent(userId, webhook_event);
// });

Webhook.on('messages', (event_type, sender_info, webhook_event) => {
    //console.log("message event");
    // TODO: handle when messages sent to page
    // Webhook.emit('messages', event_type, sender_info, webhook_event);
    //console.log("got a message");
    handleMessageEvent(sender_info.value, webhook_event, event_type.type);
});

// usefull for testing
// Webhook.emit('messaging_postbacks', event_type, sender_info, webhook_event);
// Webhook.emit('messages', event_type, sender_info, webhook_event);
// Webhook.emit('message_deliveries', event_type, sender_info, webhook_event);



function handleMessageEvent(userId, webhookEvent, type){
    console.log("handleMessageEvent");
    console.log(JSON.stringify(webhookEvent));
    console.log("type: " + type);
    if (type == "messages") {
        if (webhookEvent.message) {
            if (webhookEvent.message.text){
                let userMessage = webhookEvent.message.text;
                console.log(userMessage + " recieved");
                handleResponseMessage(userId, userMessage);
            }
            if (webhookEvent.message.attachments != undefined) {
                let attachment = webhookEvent.message.attachments[0];
                if (attachment.type == "image"){
                    console.log(attachment.payload.url);
                    //TODO: Send image to model
                    if (attachment.payload) {
                        if (attachment.payload.url) {
                            handleImage(userId, attachment.payload.url);
                        } else {
                            console.log("url not found");
                        }
                    } else {
                        console.log("payload not found");
                    }
                }
            }
        } else {
            console.log("webhook.message is not true");
        }
    } else if (type == "messaging_postbacks") {
        console.log("messageing_post backs - doing nothing");
    } else {
        console.log("unknown event type");
    }


    //sendMessage(userId, message + " received");
}

function handleImage(userId, url) {
    //console.log("handleImage for user id: " + userId);
    sendMessage(userId, "I'm looking at your image...");
    prediction = getPrediction(url);
    console.log("prediction" + prediction);
    if (prediction == "plastic") {
        //sendMessage(userId, "OOh plastic hmmm...");
    }
}


function getPrediction(url) {
    var options = {
        uri: 'http://d3e6d0bd.ngrok.io/send_image',
        method: 'POST',
        json: {  
            "url": url,
        },
        headers : {  
            "content-type": "application/json",
        }
    };
      
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("request response: " + body); 
            return body
        }
    });
}


function handleResponseMessage(userId, message) {
    switch(questionNumber) {
        case 1:
            if (message.toLowerCase().includes("yes")) {
                console.log("message includes yes")
                questionNumber = 2;
                askQuestion(userId, questionNumber)
            } else {
                console.log("message does not include yes")
                questionNumber = 3;
            }
            break;
        case 2:
            if (message.toLowerCase().includes("yes")) {
                console.log("message includes yes")
                questionNumber = 3;
                askQuestion(userId, questionNumber)
            } else {
                console.log("message does not include yes")
                sendNotRecyclable(userId);
            }
            break;
        case 3:
            questionNumber = 4;
            askQuestion(userId, questionNumber);
    }
    askQuestion(userId, questionNumber);
}

function sendNotRecyclable(userId) {
    sendMessage(userId, "Unfortunately, you can't recycle that.");
}

function askQuestion(userId, questionNumber){
    switch(questionNumber) {
        case 1:
            beginConversation(userId);
            break;
        case 2:
            askQuestion2(userId);
            break;
        case 3:
            askQuestion3(userId);
            break;
        case 4:
            askQuestion4(userId);
            break;
        default:
            // removeUserConversation(userId);
            beginConversation(userId);
            break;
    }
}

function beginConversation(userId){
    sendMessage(userId, "Hi, Let me help you with waste sorting!");
    setTimeout(function(){
        question = "First, please tell me if there is any food or liquid left in/on your waste?"
        sendYesNoQuestion(userId, question);
    }, 1000);
    
}

function askQuestion2(userId) {
    question = "Are you able to clean it?"
    sendYesNoQuestion(userId, question);
}

function askQuestion3(userId) {
    message = "Please clean it. If you don't clean it, it will not be recyclable"
    sendMessage(message)
    setTimeout(function(){
        question = "Please take a picture of your waste, so I know how you should sort it."
        sendMessage(userId, question);
    }, 1000);
}

function askQuestion4(userId) {
    
}

function sendMessage(recipientId, text) {
    let recipient = {
        'id': recipientId
    };
    // send the text message
    Client.sendText(recipient, text)
    .then(res => {
        // log the api response
        console.log(text + " sent");
    })
    .catch(e => {
        console.error(e);
    });
}

function getUserInfo(psid){
    let fields = ['id', 'first_name', 'last_name', 'profile_pic']

    Client.getUserProfile(psid, fields)
      .then(res => {
        return res;
      }).catch( e => {
        console.log(e);
      });
}

function sendYesNoQuestion(recipientId, text) {
    // addQuestionToConversation(recipientId, text);
    let recipient = {'id': recipientId};
    let quick_replies = [{ 'content_type': 'text', "title" : "Yes", 'payload':'quick_reply_payload' }, { 'content_type': 'text', "title" : "No" , 'payload':'quick_reply_payload' }];

    Client.sendQuickReplies(recipient, quick_replies, text)
    .then(res => {
        console.log("yes or no Q sent")
        // {
        //   "recipient_id": "1008372609250235", 
        //   "message_id": "mid.1456970487936:c34767dfe57ee6e339"
        // }
    }).catch( e => {
        console.log(e);
    });
}


let fields = {
  'greeting': [
    {
      'locale':'default',
      'text': 'Informing Londoners on how to sort their waste sustainably',
    }
  ],
  'get_started' : {
      'payload' : 'callback_payload'
  }
};

Client.setMessengerProfile(fields)
  .then(res => {
    if (res.result == "success"){
        console.log("setMessengerProfile successful");
    } else {
        console.log("setMessengerProfile unsuccessful");
    }
  });

//Check if attachment is image
 if (event.message && ) {
    let attachment = event.message.attachments[0] //Get attachment
    if (attachment.type === "image") { //check whether it is an image
        console.log(attachment.payload.url)
    } 
  }

