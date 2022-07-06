document.addEventListener('DOMContentLoaded', () => {
  console.log('domcontentloaded')
	currentlyOnSupportedTab(function(supported) {
    console.log('supported', supported)
    showUI(supported);
	});

});

function currentlyOnSupportedTab(cb) {
	browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
    console.log('sending message for ', tabs)
		browser.tabs.sendMessage(tabs[0].id, {from: 'popup', type: 'CHECK_TAB_SUPPORTED'}, cb);
	});
}

function getStatusInfo(cb) {
	browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
		browser.tabs.sendMessage(tabs[0].id, {from: 'popup', type: 'GET_STATUS_INFO'}).then((statusInfo) => {
      cb(statusInfo);
    });
	});
}

function showUI(supported) {
  document.querySelector('.loading').hidden = true;
  if (supported) {
    document.querySelector('.ui').hidden = false;
    document.querySelector('.page-not-supported').hidden = true;
    const messageTextArea = document.querySelector('.message')
    const namesAndNumbersTextArea = document.querySelector('.numbers-and-names')
    const advancedSimpleToggle = document.querySelector('.advanced-simple-toggle')
    const sendMessagesButton = document.querySelector('.send-messages')
    const conditionsInput = document.querySelector('#i-agree-that-i-have-read-the-google-messages-terms-and-conditions-and-am-fully-responsible-for-my-use-of-this-extension')
    conditionsInput.addEventListener('change', () => {
      sendMessagesButton.disabled = !conditionsInput.checked
    })
    sendMessagesButton.addEventListener('click', () => {
      const isAdvanced = !advancedSimpleToggle.textContent.toLocaleLowerCase().includes('advanced')
      if (isAdvanced) {
        console.warn('THIS SHOULD NEVER HAPPEN (control should be from the modal on the page because user is in advanced mode)')
      } else {
        sendMessages()
      }
    })

    const existingMessageText = localStorage.getItem('extension-message')
    if (existingMessageText) {
      messageTextArea.value = existingMessageText
    }
    const existingNamesAndNumbers = localStorage.getItem('extension-namesAndNumbers')
    if (existingNamesAndNumbers) {
      namesAndNumbersTextArea.value = existingNamesAndNumbers
    }
    messageTextArea.addEventListener('change', () => {
      localStorage.setItem('extension-message', messageTextArea.value);
    })
    namesAndNumbersTextArea.addEventListener('change', () => {
      localStorage.setItem('extension-namesAndNumbers', namesAndNumbersTextArea.value);
    })
    
    advancedSimpleToggle.addEventListener('click', () => {
      browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
          from: 'popup',
          type: 'INIT_ADVANCED_MODE'
        });
      });
      window.close();
      // const isAdvanced = advancedSimpleToggle.textContent.toLocaleLowerCase().includes('advanced')
      // advancedSimpleToggle.textContent = isAdvanced ? 'Switch to Simple' : 'Switch to Advanced'
      // advancedSimpleHeading.textContent = isAdvanced ? 'Import CSV' : 'Numbers, names'
      // advancedInputs.hidden = !isAdvanced
      // simpleInputs.hidden = isAdvanced
    })
    getStatusInfo((statusInfo) => {
      displayStatusInfo(statusInfo.progressRowIndex)
    });
  }
}

function sendMessages() {
  const sendIntervalMin = 2500;
  const sendIntervalMax = 10000;
  const messageTextArea = document.querySelector('.message')
  const namesAndNumbersTextArea = document.querySelector('.numbers-and-names')
  const namesAndNumbers = getNamesAndNumbers(namesAndNumbersTextArea.value)
  const messages = getFormattedMessages(namesAndNumbers, messageTextArea.value)
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
		browser.tabs.sendMessage(tabs[0].id, {
			from: 'popup',
			type: 'SEND_MESSAGES',
			messages: messages,
			sendIntervalMin,
			sendIntervalMax
		});
	});
}

function getNamesAndNumbers(textAreaValue) {
  return textAreaValue.trim().split('\n').map((line, i) => {
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

browser.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.funcName === 'displayStatusInfo') {
      const progressRowIndex = request?.args?.progressRowIndex
      displayStatusInfo(progressRowIndex)
    }
  }
);

function displayStatusInfo(progressRowIndex) {
  const namesAndNumbersTextArea = document.querySelector('.numbers-and-names')
  const namesAndNumbers = getNamesAndNumbers(namesAndNumbersTextArea.value)
  const namesAndNumbersStatusInfo = document.querySelector('.numbers-and-names-status-info')
  const messageTextArea = document.querySelector('.message')
  const sendMessagesButton = document.querySelector('.send-messages')
  const conditionsInput = document.querySelector('#i-agree-that-i-have-read-the-google-messages-terms-and-conditions-and-am-fully-responsible-for-my-use-of-this-extension')

  if (typeof progressRowIndex !== 'number') {
    namesAndNumbersTextArea.hidden = false;
    namesAndNumbersStatusInfo.hidden = true;
    namesAndNumbersStatusInfo.textContent = '';
    messageTextArea.disabled = false;
    conditionsInput.disabled = false;
  } else {
    namesAndNumbersStatusInfo.textContent = '';
    namesAndNumbersTextArea.hidden = true;
    namesAndNumbersStatusInfo.hidden = false;
    messageTextArea.disabled = true;
    sendMessagesButton.disabled = true;
    conditionsInput.disabled = true;

    namesAndNumbersTextArea.value.split('\n').forEach((line, i) => {
      const progressRow = document.createElement('div')
      const prefixSpan = document.createElement('span')
      prefixSpan.classList.add('prefix')
      progressRow.appendChild(prefixSpan)
      const progressText = document.createElement('span')
      progressText.textContent = line
      if (progressRowIndex > i) {
        prefixSpan.classList.add('completed')
      } else if (progressRowIndex === i) {
        prefixSpan.classList.add('spinner')
        progressText.style.textDecoration = 'underline'
      } else if (progressRowIndex < i) {
        progressText.style.color = 'gray'
      }
      progressRow.appendChild(progressText)
      namesAndNumbersStatusInfo.appendChild(progressRow)
    })
  }
}