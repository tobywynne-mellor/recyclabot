function learnMore(userId, webhook_event){

  question4 ="Would you like to learn more about recycling in your home?"

  if (ans = yes){
    question5 = "Please tell me your postcode"
    let str = webhookEvent.message.text; //get user postcode
    str = str.replace(/\s+/g, '+')//change the postcode format to fit the URL
    sendMessage("https://londonrecycles.co.uk/node/51/?postcode=" + str);//add the postcode to URL
  }

  else{
    text = "Thank you for being sustainable. Enjoy your day!"
  }

}
