/*
*   NOTES
*   - handle convos that are too old - expire them send message to confirm this only if many users
*
*/

'use strict';
require('dotenv').config();
const BootBot = require('bootbot');
var rp = require('request-promise');

const bot = new BootBot({
    accessToken: process.env.PAGE_ACCESS_TOKEN,
    verifyToken: process.env.VERIFY_TOKEN,
    appSecret: process.env.APP_SECRET
});

let userCount = 0;

// Messenger Profile
bot.setGreetingText("Informing Londoners on how to sort their waste sustainably."); //can use these here: {{user_first_name}} {{user_last_name}} {{user_full_name}}
bot.setGetStartedButton("get_started");

// user clicks get started
bot.on('postback:get_started', (payload, chat) => {
    console.log("bot.on(postback:getting_started)");
    chat.conversation((convo) => {
        userCount++;
        console.log("User count: " + userCount);
        convo.getUserProfile().then((user) => {
            const name = user.first_name;
            convo.set("name", name);
            convo.say(`Hey ${name}! Let me help you with waste sorting!`, { typing: true }).then(() => {
                convo.say("Did you know that 2/3 homes in the UK put things in the recycling which can't be recycled.", {
                    typing: true,
                    notificationType: 'SILENT_PUSH'
                }).then(() => {
                    sendQuestionOne(convo);
                }).catch((err) => {
                    console.log(err);
                });
            });
        });
    });
});

// user sends message and is not in convo already
bot.on('message', (payload, chat) => {
    console.log("bot.on(message)");
    chat.conversation((convo) => {
        userCount++
        console.log("User count: " + userCount);
        convo.getUserProfile().then((user) => {
            const name = user.first_name;
            convo.set("name", name);
            convo.say(`Hey ${name}! Let me help you with waste sorting!`, { typing: true }).then(() => {
                sendQuestionOne(convo);
            });
        });
    })
});

bot.start(process.env.PORT);

function askAgain(convo, questionFunction) {
    console.log("askAgain");
    convo.say("I wasn't expecting that... Lets try again.").then(() => {
        questionFunction(convo);
    }).catch((error) => {
        console.log(error);
    });
}

function sendQuestionOne(convo) {
    console.log("sendQuestionOne");
    const question = {
        text: "Is your waste dirty or contaminated?",
        quickReplies: ['Yes', 'No']
    };

    const answer = (payload, convo, data) => {
        console.log("answer:QuestionOne");
        const text = payload.message.text;

        if (text.toLowerCase().includes("yes")) {
            sendQuestionTwo(convo);
        } else if (text.toLowerCase().includes("no")) {
            convo.say(`Brilliant! Even recyclable waste cannot be recycled if it is contamiated.`).then(() => {
                sendQuestionThree(convo);
            });
        } else {
            askAgain(convo, sendQuestionOne);
        }
    };

    const options = {
        typing: true // Send a typing indicator before asking the question
    };

    convo.ask(question, answer, [], options);
}

function sendQuestionTwo(convo) {
    console.log("sendQuestionTwo");
    const question = {
        text: "Are you able to clean it?",
        quickReplies: ['Yes', 'No']
    };

    const answer = (payload, convo, data) => {
        console.log("answer:QuestionTwo");
        const text = payload.message.text;
        if (text.toLowerCase().includes("no")) {
            convo.say("Unfortunately, you won't be able to recyle it if you cannot clean it.\nGoodbye!");
            userCount--;
            console.log("User count: " + userCount);
            convo.end();
        } else if (text.toLowerCase().includes("yes")) {
            sendQuestionThree(convo);
        } else {
            askAgain(convo, sendQuestionTwo);
        }
    };

    const options = {
        typing: true // Send a typing indicator before asking the question
    };

    convo.ask(question, answer, [], options);
}

function sendQuestionThree(convo) {
    console.log("sendQuestionThree");
    const question = "Please send a photo of your waste.";

    const answer = (payload, convo, data) => {
        console.log("answer:QuestionThree");
        try {
            if(payload.message) {
                if (payload.message.attachments) {
                    if (payload.message.attachments[0].payload) {
                        if (payload.message.attachments[0].payload.url){
                            const url = payload.message.attachments[0].payload.url;
                            console.log("url: " + url);
                            convo.say("I'm taking a look at your waste " + String.fromCodePoint(128269));
                            convo.sendTypingIndicator(20000);
                            getPrediction(url)
                                .then((prediction) => {
                                    console.log("prediction: " + prediction);
                                    convo.say("I can see your waste is " + prediction);
                                    handleMaterials(convo, prediction);
                                })
                                .catch((err) => {
                                    console.log(err)
                                });
                        } else {
                            console.log("payload has no url " + payload.message.attachments[0].payload)
                            askAgain(convo, sendQuestionThree);
                        } 
                    } else {
                        console.log("attachments[0] has no payload " + payload.message.attachments[0])
                        askAgain(convo, sendQuestionThree);
                    }
                } else {
                    console.log("no attachments in message " + payload.message);
                    askAgain(convo, sendQuestionThree);
                }
            } else {
                console.log("no message found " + payload);
            }
            
        } catch(error) {
            console.error(error);
            askAgain(convo, sendQuestionThree);
        }
    };

    const options = {
        typing: true // Send a typing indicator before asking the question
    };

    convo.ask(question, answer, [], options);
}

const getPrediction = async (url) => {
    var options = {
        uri: 'https://europe-west1-recylabot.cloudfunctions.net/recyclabot_function',
        method: 'POST',
        json: {
            "url": url,
        },
        headers : {
            "content-type": "application/json",
        }
    };

    return rp(options);
}

const handleMaterials = (convo, material) => {
    //https://londonrecycles.co.uk/what-can-i-recycle
    switch(material) {
        case "plastic":
            sendPlasticQuestion(convo);
            break;
        case "metal":
            sendMetalQuestion(convo);
            break;
        case "paper":
            sendPaperQuestion(convo);
            break;
        case "cardboard":
            sendPaperQuestion(convo);
            break;
        case "glass":
            sendGlassQuestion(convo);
            break;
        default:
            console.log("no switch case for " + material);
            break;
    }
}

// const sendPlasticQuestion = (convo) => {

//     // not recyclable
//     // Bottles which used to contain corrosive chemicals (like antifreeze)
//     // Sweet packets or wrappers
//     // Bubble Wrap
//     // Laminated pouches - such as for cat food and coffee
//     // Plastic toys
//     // Blister packs for medicines (like paracetamol)
//     // Toothpaste tubes
//     // Expanded Polystyrene (used in packaging to protect your products)

//     const question = (convo) => {
//         // create button for each sign type
//         const resin_button = createButton("postback", null, "Resin Code", "resin_code");
//         //const resin_default_action = createDefaultAction("postback", null, null, "FULL");
//         const resin_template = createGenericTemplate("Resin Code", "https://res.cloudinary.com/jerrick/image/upload/w_720/qw5afd3bdaxik9tyyyzt.png", null, null, [resin_button]);
        
//         const recycle_button = createButton("postback", null, "Recycle Now Icon", "recycle_now");
//         //const recycle_default_action = createDefaultAction("postback", null, null, "FULL");
//         const recycle_template = createGenericTemplate("Recycle Now", "https://pbs.twimg.com/profile_images/856425496745324544/tkZrmM3Z_400x400.jpg", null, null, [recycle_button]);
    
//         const none_button = createButton("postback", null, "Neither", "neither");
//         //const recycle_default_action = createDefaultAction("postback", null, null, "FULL");
//         const none_template = createGenericTemplate("Neither", null, null, null, [none_button]);
    
//         const elements = [resin_template, recycle_template, none_template];
//         const options = {
//             "typing" : true,
//         }

//         convo.say("Which of these symbols can you see on your waste?").then(() => {
//             convo.sendGenericTemplate(elements, [options]);
//         });
//     }

//     const answer = (payload, convo, data) => {
//         askAgain(convo, handlePlastic);
//     }

//     const callbacks = [
//         {
//             event: 'postback:resin_code',
//             callback: (payload, convo) => {
//                 sendResinCodeQuestion(convo);
//             }
//         },{
//             event: 'postback:recycle_now',
//             callback: (payload, convo) => {
//                 sendRecycleNowQuestion(convo);
//             }
//         },{
//             event: 'postback:neither',
//             callback: (payload, convo) => {
//                 sendPostCodeQuestion(convo);
//             }
//         }
//     ];

//     const options = {
//         "typing" : true
//     }

//     convo.ask(question, answer, callbacks, options);
// }

const createGenericTemplate = (title, imageUrl, subtitle, defaultAction, buttons) => {
    
    let template = {};

    if (title) {
        template["title"] = title;
    }

    if (imageUrl) {
        template["image_url"] = imageUrl;
    }

    if (subtitle) {
        template["subtitle"] = subtitle;
    }

    if (defaultAction) {
        template["default_action"] = defaultAction;
    }

    if (buttons) {
        template["buttons"] = buttons;
    }

    return template;
}

const createDefaultAction = (type, url, messenger_extensions, webviewHeight) => {
    
    let defaultAction = {};
    
    if (type) {
        defaultAction["type"] = type;
    }

    if (url) {
        defaultAction["url"] = url;
    }

    if (messenger_extensions) {
        defaultAction["messenger_extensions"] = messenger_extensions;
    }

    if (webviewHeight) {
        defaultAction["webview_height_ratio"] = webviewHeight;
    }

    return defaultAction;
}

const createButton = (type, url, title, payload) => {
    
    let button = {};
    
    if (type) {
        button["type"] = type;
    }

    if (url) {
        button["url"] = url;
    }

    if (title) {
        button["title"] = title;
    }

    if (payload) {
        button["payload"] = payload;
    }

    return button;
}

// const sendResinCodeQuestion = (convo) => {
//     const question = (convo) => {
//         console.log("sendResinQuestion");

//         let elements = ["one", "two", "three", "four", "five", "six", "seven"].map((num)=>{
//             const resin_button = createButton("postback", null, num, "resin_code_" + num);
//             //const resin_default_action = createDefaultAction("postback", null, null, "FULL");
//             return createGenericTemplate(num, "https://res.cloudinary.com/jerrick/image/upload/w_720/qw5afd3bdaxik9tyyyzt.png", null, null, [resin_button]);
//         });

//         const dont_know_button = createButton("postback", null, "I don't know", "dont_know");
//         //const recycle_default_action = createDefaultAction("postback", null, null, "FULL");
//         const none_template = createGenericTemplate("I don't know", null, null, null, [dont_know_button]);
        
//         elements.push(none_template);

//         const options = {
//             "typing" : true,
//         }

//         convo.say("Which resin code is it?").then(() => {
//             convo.sendGenericTemplate(elements, [options]);
//         });
//     }

//     const answer = (payload, convo, data) => {
//         console.log("answer:sendResinQuestion");
//         askAgain(convo, sendResinCodeQuestion);
//     }

//     const callbacks = [
//         {
//             event: 'postback:resin_code_one',
//             callback: (payload, convo) => {
//                 itIsRecyclable(convo);
//             }
//         },{
//             event: 'postback:resin_code_two',
//             callback: (payload, convo) => {
//                 sendResinCodeQuestion(convo);
//             }
//         },{
//             event: 'postback:resin_code_three',
//             callback: (payload, convo) => {
//                 sendResinCodeQuestion(convo);
//             }
//         },{
//             event: 'postback:resin_code_four',
//             callback: (payload, convo) => {
//                 isItNotRecyclable(convo);
//             }
//         },{
//             event: 'postback:resin_code_five',
//             callback: (payload, convo) => {
//                 sendResinCodeQuestion(convo);
//             }
//         },{
//             event: 'postback:resin_code_six',
//             callback: (payload, convo) => {
//                 sendResinCodeQuestion(convo);
//             }
//         },{
//             event: 'postback:resin_code_seven',
//             callback: (payload, convo) => {
//                 sendResinCodeQuestion(convo);
//             }
//         }
//     ];

//     const options = {
//         "typing" : true
//     }

//     convo.ask(question, answer, callbacks, options);
// }

// const sendRecycleNowQuestion = (convo) => {

// }

const sendPlasticQuestion = (convo) => {
    console.log("sendPlasticQuestion");
    
    const question = {
        text: "Is your waste any of the following?\n-Bottles which used to contain corrosive chemicals (like antifreeze)\n-Sweet packets or wrappers\n-Bubble Wrap\n-Laminated pouches\n-Plastic Toys\n-Blister packs for medicines (like paracetamol)\n-Toothpaste tubes\n-Expanded Polystyrene",
        quickReplies: ['Yes', 'No']
    }

    const answer = (payload, convo, data) => {
        console.log("answer:sendPlasticQuestion");
        const text = payload.message.text;

        if (text.toLowerCase().includes("yes")) {
            isItNotRecyclable(convo);
        } else if (text.toLowerCase().includes("no")) {
            itIsRecyclable(convo);
        } else {
            askAgain(convo, sendPlasticQuestion);
        }
    }

    const callbacks = [];

    const options = {
        typing : true
    }

    convo.ask(question, answer, callbacks, options);
}

const sendMetalQuestion = (convo) => {

    console.log("sendMetalQuestion");
    
    const question = {
        text: "Is your waste any of the following?\n-Crisp packets\n-Sweet wrappers\n-Laminated foil",
        quickReplies: ['Yes', 'No']
    }

    const answer = (payload, convo, data) => {
        console.log("answer:sendMetalQuestion");
        const text = payload.message.text;

        if (text.toLowerCase().includes("yes")) {
            isItNotRecyclable(convo);
        } else if (text.toLowerCase().includes("no")) {
            itIsRecyclable(convo);
        } else {
            askAgain(convo, sendMetalQuestion);
        }
    }

    const callbacks = [];

    const options = {
        typing : true
    }

    convo.ask(question, answer, callbacks, options);
}

const sendPaperQuestion = (convo) => {

    console.log("sendPaperQuestion");
    
    const question = {
        text: "Is your waste any of the following?\n-Tissues, wet wipes and used paper towels\n-Nappies and sanitary pads\n-Cotton wool and make up pads\n-Sticky paper\n-Shiny or glittery wrapping paper",
        quickReplies: ['Yes', 'No']
    }

    const answer = (payload, convo, data) => {
        console.log("answer:sendPaperQuestion");
        const text = payload.message.text;

        if (text.toLowerCase().includes("yes")) {
            isItNotRecyclable(convo);
        } else if (text.toLowerCase().includes("no")) {
            itIsRecyclable(convo);
        } else {
            askAgain(convo, sendPaperQuestion);
        }
    }

    const callbacks = [];

    const options = {
        typing : true
    }

    convo.ask(question, answer, callbacks, options);
}

const sendGlassQuestion = (convo) => {

    console.log("sendGlassQuestion");
    
    const question = {
        text: "Is your waste any of the following?\n-Glass cookware\n-Drinking glasses\n-Vases\n-Microwave plates\n-Nail varnish bottles",
        quickReplies: ['Yes', 'No']
    }

    const answer = (payload, convo, data) => {
        console.log("answer:sendGlassQuestion");
        const text = payload.message.text;

        if (text.toLowerCase().includes("yes")) {
            isItNotRecyclable(convo);
        } else if (text.toLowerCase().includes("no")) {
            itIsRecyclable(convo);
        } else {
            askAgain(convo, sendGlassQuestion);
        }
    }

    const callbacks = [];

    const options = {
        typing : true
    }

    convo.ask(question, answer, callbacks, options);
}

const itIsRecyclable = (convo) => {
    convo.say("Your waste is probably recyclable!").then(()=>{
        askLearnMore(convo);
    });
}

const isItNotRecyclable = (convo) => {
    convo.say("Your waste is not recyclable unfortunately.").then(() => {
        askLearnMore(convo);
    });
}

const goodbye = (convo) => {
    convo.say("Goodbye! Let me know if you have anymore waste!").then(()=>{
        convo.end();
    });
}

const askLearnMore = (convo) => {
    const question = {
        text: "Would you like to learn more?",
        quickReplies: ['Yes', 'No']
    };

    const answer = (payload, convo, data) => {
        const text = payload.message.text;

        if (text.toLowerCase().includes("yes")) {
            sendPostCodeQuestion(convo);
        } else if (text.toLowerCase().includes("no")) {
            goodbye(convo);
        } else {
            askAgain(convo, askLearnMore);
        }
    }

    convo.ask(question, answer, [], {"typing":true});
}

const sendPostCodeQuestion = (convo) => {
    //https://londonrecycles.co.uk/node/51/?postcode=
    const question = "Please tell me your postcode (or say 'no').";

    const answer = (payload, convo, data) => {
        const text = payload.message.text;
        const regex = "^((?:EC(?:[1234][AMNPRV]|[124]Y)|WC(?:[12][ABEHNR]|1[VX])|(?:E|SW)(?:[0-9]|1[0-9]|[12]0)|N(?:[1-9]|1[0-9]|2[0-2])|NW(?:[1-9]|1[01])|SE(?:[1-9]|1[0-9]|2[0-8])|W(?:[1-9]|1[0-4])|HA[0-9]|EN[1-8]|E1W) {0,}[0-9][ABD-HJLNP-UW-Z]{2})$";
        const postcode = text.trim().match(regex);

        if (postcode) {
            sendInfo(convo, postcode[0]);
        } else {
            sendInfo(convo, null);
        }
    }

    const callbacks = [];

    const options = {
        typing : true
    }

    convo.ask(question, answer, callbacks, options);
}

const sendInfo = (convo, postcode) => {
    
    let url = "https://londonrecycles.co.uk/node/51/";

    if (postcode) {
        url = "https://londonrecycles.co.uk/node/51/?postcode=" + postcode;
    }
    
    const default_action = createDefaultAction("web_url", url, null, "FULL");
    const template = createGenericTemplate("Learn More", "https://pbs.twimg.com/profile_images/1036546384537837569/ZILKbNZL_400x400.jpg", postcode, default_action, null);

    const elements = [template];        

    const options = {
        typing: true
    }

    convo.sendGenericTemplate(elements, [ options ]).then(()=>{
        goodbye(convo);
    })
}

// const Messenger = require('messenger-node');
// var request = require('request');


// console.log("Recycle-Bot starting...");

// let webhook_config = {
//     'port': process.env.PORT,//(optional - defualts to process.env.PORT)
//     'endpoint': "webhook",
//     'app_secret': process.env.APP_SECRET, //(optional - required for validating signed webview requests using Webhook.validateSignedRequest())
//     'verify_token': process.env.VERIFY_TOKEN
// }

// const Webhook = new Messenger.Webhook(webhook_config);

// let client_options = {
//     'page_token': process.env.PAGE_ACCESS_TOKEN,
//     'app_token': process.env.APP_ID
//     // optional api_version': 'v2.9'
// }

// const Client = new Messenger.Client(client_options);

// let questionNumber = 1;

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
// Webhook.on('messaging_postbacks', (event_type, sender_info, webhook_event) => {
//     // do something
//     console.log("postback");
//     let userId = sender_info.value;
//     //addNewUserConversation(userId);
//     beginConversation(userId);
// });

// Webhook.on('messaging_postbacks', (event_type, sender_info, webhook_event) => {
//     // TODO: handle when postback button, get started button or persistent menu is tapped
//     // Webhook.emit('messaging_postbacks', event_type, sender_info, webhook_event);
//     let userId = sender_info.value;
//     //sendYesNoQuestion(userId, "Is your container dirty?");
//     handleMessageEvent(userId, webhook_event);
// });

// Webhook.on('messages', (event_type, sender_info, webhook_event) => {
//     //console.log("message event");
//     // TODO: handle when messages sent to page
//     // Webhook.emit('messages', event_type, sender_info, webhook_event);
//     //console.log("got a message");
//     handleMessageEvent(sender_info.value, webhook_event, event_type.type);
// });

// usefull for testing
// Webhook.emit('messaging_postbacks', event_type, sender_info, webhook_event);
// Webhook.emit('messages', event_type, sender_info, webhook_event);
// Webhook.emit('message_deliveries', event_type, sender_info, webhook_event);



// function handleMessageEvent(userId, webhookEvent, type){
//     console.log("question number: " + questionNumber);

//     if (type == "messages") {
//         if (webhookEvent.message) {
//             if (webhookEvent.message.text){
//                 let userMessage = webhookEvent.message.text;
//                 console.log(userMessage + " recieved");
//                 handleResponseMessage(userId, userMessage);
//             }
//             if (webhookEvent.message.attachments != undefined) {
//                 let attachment = webhookEvent.message.attachments[0];
//                 if (attachment.type == "image"){
//                     console.log(attachment.payload.url);
//                     //TODO: Send image to model
//                     if (attachment.payload) {
//                         if (attachment.payload.url) {
//                             handleImage(userId, attachment.payload.url);
//                         } else {
//                             console.log("url not found");
//                         }
//                     } else {
//                         console.log("payload not found");
//                     }
//                 }
//             }
//         } else {
//             console.log("webhook.message is not true");
//         }
//     } else if (type == "messaging_postbacks") {
//         console.log("messageing_post backs - doing nothing");
//     } else {
//         console.log("unknown event type");
//     }


//     //sendMessage(userId, message + " received");
// }

// function handleImage(userId, url) {
//     //console.log("handleImage for user id: " + userId);
//     sendMessage(userId, "I'm looking at your image...");
//     getPrediction(url, function(prediction) {
//         console.log("prediction: " + prediction);
//         if (prediction == "plastic") {
//             sendMessage(userId, "Depending on where you live, recycling of plastics varies.");
//             sendMessage(userId, "Learn more about recycling at your home here: https://londonrecycles.co.uk/")
//         } else if (prediction == "cardboard" || prediction == "paper" || prediction == "glass") {
//             sendMessage(userId, "Ah " + prediction +"! As it's clean, you may recycle it.");
//             sendMessage(userId, "Learn more about recycling at your home here: https://londonrecycles.co.uk/")
//         } else if (prediction == "metal") {
//             sendMessage(userId, "Depending on where you live, recycling of metals varies.");
//             sendMessage(userId, "Learn more about recycling at your home here: https://londonrecycles.co.uk/local-recycling")
//         }
//         //questionNumber = 3;
//         //handleResponseMessage(userId, "");
//         //sendMessage(userId, "Learn more about recycling at your home here: https://londonrecycles.co.uk/")
//     });

// }


// function getPrediction(url, callback) {
//     var options = {
//         uri: 'https://7d37efd6.ngrok.io/send_image',
//         method: 'POST',
//         json: {
//             "url": url,
//         },
//         headers : {
//             "content-type": "application/json",
//         }
//     };

//     request(options, function (error, response, body) {
//         if (!error && response.statusCode == 200) {
//             console.log("request response: " + body);
//             callback(body);
//         }
//     });
// }


// function handleResponseMessage(userId, message) {
//     let nextQuestionNumber;

//     switch(questionNumber) {
//         case 1:
//             if (message.toLowerCase().includes("yes")) {
//                 console.log("message includes yes")
//                 nextQuestionNumber = 2;
//                 askQuestion(userId, nextQuestionNumber)
//             } else {
//                 console.log("message does not include yes")
//                 nextQuestionNumber = 3;
//                 askQuestion(userId, nextQuestionNumber);
//             }
//             break;
//         case 2:
//             if (message.toLowerCase().includes("yes")) {
//                 console.log("message includes yes")
//                 nextQuestionNumber = 3;
//                 askQuestion(userId, nextQuestionNumber)
//             } else {
//                 console.log("message does not include yes")
//                 sendNotRecyclable(userId);
//             }
//             break;
//         case 3:
//             nextQuestionNumber = 4;
//             askQuestion(userId, nextQuestionNumber);
//         case 4:
//             nextQuestionNumber = 5;
//             askQuestion(userId, nextQuestionNumber);
//         case 5:
//                 nextQuestionNumber = 1;
//             sendMessage(userId, "https://londonrecycles.co.uk/node/51/?postcode=" + message);
//         default:
//             // questionNumber = 1;
//             // askQuestion(userId, questionNumber);
//     }
//     questionNumber = nextQuestionNumber;
//     // askQuestion(userId, questionNumber);
// }

// function sendNotRecyclable(userId) {
//     sendMessage(userId, "Unfortunately, you can't recycle that.");
// }

// function askQuestion(userId, questionNumber){
//     switch(questionNumber) {
//         case 1:
//             beginConversation(userId);
//             break;
//         case 2:
//             askQuestion2(userId);
//             break;
//         case 3:
//             askQuestion3(userId);
//             break;
//         case 4:
//             askQuestion4(userId);
//             break;
//         default:
//             break;
//     }
// }

// function beginConversation(userId){
//     sendMessage(userId, "Hi, Let me help you with waste sorting!");
//     setTimeout(function(){
//         question = "First, please tell me if there is any food or liquid left in/on your waste?"
//         sendYesNoQuestion(userId, question);
//     }, 1000);
// }

// function askQuestion2(userId) {
//     question = "Are you able to clean it?"
//     sendYesNoQuestion(userId, question);
// }

// function askQuestion3(userId) {
//     message = "Please clean it. If you don't clean it, it will not be recyclable";
//     sendMessage(userId, message);
//     setTimeout(function(){
//         question = "Please take a picture of your waste, so I know how you should sort it.";
//         sendMessage(userId, question);
//     }, 1000);
// }

// function askQuestion4(userId) {
//     setTimeout(function(){
//         sendMessage(userId, "If you would like to learn more, send us your post code.");
//     }, 1000);
// }

// function sendMessage(recipientId, text) {
//     let recipient = {
//         'id': recipientId
//     };
//     // send the text message
//     Client.sendText(recipient, text)
//     .then(res => {
//         // log the api response
//         console.log(text + " sent");
//     })
//     .catch(e => {
//         console.error(e);
//     });
// }

// function sendYesNoQuestion(recipientId, text) {
//     // addQuestionToConversation(recipientId, text);
//     let recipient = {'id': recipientId};
//     let quick_replies = [{ 'content_type': 'text', "title" : "Yes", 'payload':'quick_reply_payload' }, { 'content_type': 'text', "title" : "No" , 'payload':'quick_reply_payload' }];

//     Client.sendQuickReplies(recipient, quick_replies, text)
//     .then(res => {
//         console.log("yes or no Q sent")
//         // {
//         //   "recipient_id": "1008372609250235",
//         //   "message_id": "mid.1456970487936:c34767dfe57ee6e339"
//         // }
//     }).catch( e => {
//         console.log(e);
//     });
// }


// let fields = {
//   'greeting': [
//     {
//       'locale':'default',
//       'text': 'Informing Londoners on how to sort their waste sustainably.',
//     }
//   ],
//   'get_started' : {
//       'payload' : 'callback_payload'
//   }
// };

// Client.setMessengerProfile(fields)
//   .then(res => {
//     if (res.result == "success"){
//         console.log("setMessengerProfile successful");
//     } else {
//         console.log("setMessengerProfile unsuccessful");
//     }
//   });
