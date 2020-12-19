chrome.runtime.onMessage.addListener(async (message, sender, response) => {
  if (message.from === 'popup' && message.type === 'SEND_MESSAGES') {
    const { messages, sendInterval } = message
    const messagesAndNumbers = treatMessagesAndNumbers(messages)

    await sendAllMessages(messagesAndNumbers, sendInterval)
  }

  if (message.from === 'popup' && message.type === 'CHECK_TAB_SUPPORTED') {
    var url = window.location.href;
    response(url.startsWith('https://messages.google.com/'));
  }
});

function treatMessagesAndNumbers(messagesAndNumbers) {
  return messagesAndNumbers.map((messageAndNumber) => {
    const {message, number} = messageAndNumber
    
    return {
      ...messagesAndNumbers,
      number: getNumber(number),
      message: removeUnicode(message),
    }
  })
}

async function sendAllMessages(messagesAndNumbers, sendInterval) {
  // get to the right page
  const messagesStartPage = '/web/conversations/new'
  if (location.pathname !== messagesStartPage) {
    await till(() => document.querySelector('[data-e2e-start-button]'))
    document.querySelector('[data-e2e-start-button]').click()
    await till(() => location.pathname === messagesStartPage)
  }

  const n = messagesAndNumbers.length; // number of times to call promise
  await sequentialPromiseAll(
    formatAndSendGroupMessage, // function that returns a promise (will be called n times after previous one resolves)
    [messagesAndNumbers[0].message, messagesAndNumbers[0].number], // arguments array provided to promise
    n, // number of times to call promise
    ( // callback - invoked after each promise resolution
    argsHandle, // modify this in the callback to change the arguments at the next invocation
    _previousResponse, // what is resolved from promise
    i) => {
    argsHandle[0] = messagesAndNumbers[i].message;
    argsHandle[1] = messagesAndNumbers[i].number;
  });
}

function formatAndSendGroupMessage(message, number) {
  return new Promise(async (resolve, reject) => {
    if (message.includes('undefined')) {
      reject(`message includes 'undefined': ${message}`)
    }
    console.group(`${number}`);
    console.log(message)
    console.groupEnd(`${number}`);
    await sendGroupMessage(message, number)
    await timeout(getRandomInt(3000, 10000))
    resolve(`message sent to ${number}`)
  })
}

async function sendGroupMessage(message, recipients) {
  if (Array.isArray(recipients)) {
    if (recipients.length === 0) throw new Error('No recipients provided')
    // recipients.forEach(recipient => addRecipient(recipient))
    await addRecipient(recipients[0])
    await addRecipient(recipients[1])
  } else if (typeof recipients === 'string' || typeof recipients === 'number') {
    await addRecipient(recipients)
  }
  if (!location.pathname.startsWith('/web/conversations/')) {
    // must click next before sending group message
    await continueToConversation()
  }
  await setMessage(message)
  await sendMessage()
  history.back()
}
async function addRecipient(number) {
  await till(() => document.querySelector('[placeholder="Type a name, phone number, or email"],[placeholder="Add more people"]'))
  setTo('[placeholder="Type a name, phone number, or email"],[placeholder="Add more people"]', number)
  
  // select the existing contact or new number
  await till(() => {
    const testEl = document.querySelector('[data-e2e-contact-row],[data-e2e-send-to-button]')
    if (testEl && testEl.textContent.includes(number)) return true;
  })
  document.querySelector('[data-e2e-contact-row],[data-e2e-send-to-button]').click()
}
async function setMessage(text) {
  await till(() => document.querySelector('[placeholder="Text message"]'))
  setTo('[placeholder="Text message"]', text)
}
function setTo(selector, value) {
  try {
    let input = document.querySelector(selector)
    let lastValue = input.value;
    input.value = value;
    let event = new Event('input', { bubbles: true });
    event.simulated = true;
    let tracker = input._valueTracker;
    if (tracker) {
      tracker.setValue(lastValue);
    }
    input.dispatchEvent(event);
  } catch (e) {
    console.error('Probably could not find element:', selector, '\n', e)
    throw e
  }
}
async function continueToConversation() {
  await till(() => document.querySelector('[data-e2e-next-button]'))
  // continue to new/existing conversation
  document.querySelector('[data-e2e-next-button]').click()
  
  await till(() => document.querySelector('[data-e2e-send-text-button]'), 50000)
}
async function sendMessage() {
  await till(() => document.querySelector('[data-e2e-send-text-button]:not([disabled])'))
  document.querySelector('[data-e2e-send-text-button]').click()
}