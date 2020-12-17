document.addEventListener('DOMContentLoaded', () => {
	currentlyOnSupportedTab(function(supported) {
    showUI(supported);
	});
});

function currentlyOnSupportedTab(cb) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {from: 'popup', type: 'CHECK_TAB_SUPPORTED'}, cb);
	});
}

function showUI(supported) {
  document.querySelector('.loading').hidden = true;
  if (supported) {
    document.querySelector('.ui').hidden = false;
    document.querySelector('.page-not-supported').hidden = true;
    const sendMessagesButton = document.querySelector('.send-messages')
    const conditionsInput = document.querySelector('#i-agree-that-i-have-read-the-google-messages-terms-and-conditions-and-am-fully-responsible-for-my-use-of-this-extension')
    conditionsInput.addEventListener('change', () => {
      sendMessagesButton.disabled = !conditionsInput.checked
    })
    sendMessagesButton.addEventListener('click', sendMessages)
  }
}

function sendMessages() {
  const sendInterval = 2500;
  const messageTextArea = document.querySelector('.message')
  const namesAndNumbersTextArea = document.querySelector('.numbers-and-names')
  const namesAndNumbers = getNamesAndNumbers(namesAndNumbersTextArea.value)
  const messages = getFormattedMessages(namesAndNumbers, messageTextArea.value)
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {
			from: 'popup',
			type: 'SEND_MESSAGES',
			messages: messages,
			sendInterval: sendInterval
		});
	});
}

function getNamesAndNumbers(textAreaValue) {
  return textAreaValue.split('\n').map((line, i) => {
    const lineParts = line.split(',')

    return {
      index: i,
      number: `${lineParts[0]}`.trim(),
      name: lineParts.length > 1 ? `${lineParts[1]}`.trim() : '',
    }
  })
}

function getFormattedMessages(namesAndNumbers, messageText) {
  return namesAndNumbers.map((nameAndNumber, i) => {
    return {
      index: i,
      name: nameAndNumber.name,
      number: nameAndNumber.number,
      message: format(messageText, nameAndNumber),
    }
  })
}

// thanks https://stackoverflow.com/a/52036543/4151489
function format(str, obj) {
  var regex = /{(.*?)}/g;
  return str.replace(regex, (m, c) => (obj)[c]);
}