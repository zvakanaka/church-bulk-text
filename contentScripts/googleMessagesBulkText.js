console.log('church-bulk-text extension loaded')

let statusInfo = null

browser.runtime.onMessage.addListener(async (message, sender, response) => {
  console.log('received: ', message)
  if (message.from === 'popup' && message.type === 'SEND_MESSAGES') {
    const { messages, sendIntervalMin, sendIntervalMax } = message
    const messagesAndNumbers = treatMessagesAndNumbers(messages)

    await sendAllMessages(messagesAndNumbers, sendIntervalMin, sendIntervalMax)
  }

  if (message.from === 'popup' && message.type === 'CHECK_TAB_SUPPORTED') {
    var url = window.location.href;
    response(url.startsWith('https://messages.google.com/'));
  }

  if (message.from === 'popup' && message.type === 'GET_STATUS_INFO') {
    return Promise.resolve(statusInfo)
  }
  
  if (message.from === 'popup' && message.type === 'INIT_ADVANCED_MODE') {
    const advancedModal = html`
    <div class="extension-modal">
      <a class="close-anchor" href="#">x</a>
      <div class="extension-content">
        <div class="extension-drop">
          <label for="csv-file" data-tooltip="Select file">+</label>
          <input type="file" id="csv-file" accept="text/csv;text/plain">
        </div>
        <div hidden class="after-drop">
          <!-- <h1>Advanced Mode</h1> -->
          <div class="add-number-columns">
            <h2>Recipients</h2>
            <div class="recipient-column-picker">
              Phone Number 1
              <select class="recipient-column-select" data-recipient-number="1">
              </select>
            </div>
          </div>
          <button class="add-recipient-column-picker">Add Another Recipient</button>
          <h2>Message</h2>
          <h3>Insert Template Column</h3>
          <div class="template-column-picker">
            <button class="insert-column">Insert Column</button>
            <select class="template-column-select"></select>
          </div>
          <textarea class="extension-message" placeholder="e.g. Hi {personName} and {companionName}, can you pick a time to meet with {districtLeaderName} before the end of the month? {scheduleLink} Thanks!"></textarea>
          <div>
            <input id="i-agree-that-i-have-read-the-google-messages-terms-and-conditions-and-am-fully-responsible-for-my-use-of-this-extension" type="checkbox" />
            <label for="i-agree-that-i-have-read-the-google-messages-terms-and-conditions-and-am-fully-responsible-for-my-use-of-this-extension">I agree that I have read <a target="_blank" href="https://policies.google.com/terms">the Google Messages terms and conditions</a> and am fully responsible for my use of this extension.</label>    
          </div>
          <button disabled class="extension-send-messages">Send Messages</button>
        </div>
      </div>
    </div>
    `
    const style = css`
    .extension-content [hidden]:not([hidden="false"]) {
      display: none;
    }
    .extension-content {
      height: 90%;
    }
    .extension-content h2 {
      margin-bottom: 0;
    }
    .extension-message {
      height: 128px;
      width: 421px;
      margin-top: 1rem;
      margin-bottom: 1rem;
    }
    .close-anchor {
      top: 5px;
      right: 16px;
      position: absolute;
      text-decoration: none;
    }
    .after-drop {
      display: flex;
      flex-direction: column;
    }
    .extension-modal {
      overflow: auto;
      position: fixed;
      background: white;
      color: black;
      outline: black solid 1px;
      padding: 1em;
      top: calc(-225px + 50vh);
      left: calc(-225px + 50vw);
      width: 450px;
      height: 450px;
      font-family: monospace;
      display: flex;
      flex-direction: column;
      z-index: 999999;
    }
    .extension-drop:after  {
      font-size: 200%;
    }
    [for="csv-file"] {
      cursor: pointer;
      font-size: 400%;
      color: darkgray;
      align-self: center;
    }
    #csv-file {
      width: 0.1px;
      height: 0.1px;
      opacity: 0;
      overflow: hidden;
      position: absolute;
      z-index: -1;
    }

    .extension-drop {
      height: 100%;
      background: #eee;
      outline: 3px dashed grey;
      display: flex;
      justify-content: center;
      flex-direction: column;
      margin: 20px 6px;
    }
    .extension-drop:before {
      content: 'Click to Open a CSV';
      color: black;
      /* margin: calc(50% - 10ch); */
      font-family: monospace;
      align-self: center;
    }
    `
    applyStyle(style)
    const div = document.createElement('div')
    div.innerHTML = advancedModal
    document.body.appendChild(div)

    const drop = document.querySelector('.extension-drop')
    const csvInput = drop.querySelector('#csv-file')
    initDragAndDrop((content) => {
      const csvString = content.startsWith('data:text/csv;base64,77u/')
        ? atob(content.split('data:text/csv;base64,77u/')[1])
        : atob(content.split('data:text/csv;base64,')[1])
      const csvObjArr = papaParse(csvString)
      const afterDrop = document.querySelector('.after-drop')
      afterDrop.hidden = false;
      drop.hidden = true;

      const columnNames = getAllKeys(csvObjArr)

      const messageTextarea = document.querySelector('.extension-message')
      const templateColumnSelect = document.querySelector('.template-column-select')
      addOptionsToSelect(templateColumnSelect, columnNames)
      const templateInsertColumnButton = document.querySelector('.insert-column')
      templateInsertColumnButton.addEventListener('click', () => {
        if (templateColumnSelect.value) {
          typeInTextarea(`{${templateColumnSelect.value}}`, messageTextarea)
        }
      })

      const recipientColumnSelect = document.querySelector('.recipient-column-select')
      addOptionsToSelect(recipientColumnSelect, columnNames)
      const addRecipientButton = document.querySelector('.add-recipient-column-picker')
      const addNumberColumns = document.querySelector('.add-number-columns')
      addRecipientButton.addEventListener('click', () => {
        const numRecipient = document.querySelectorAll('.recipient-column-picker').length + 1
        const newRecipientContainer = document.createElement('div')
        newRecipientContainer.classList.add('recipient-column-picker')
        newRecipientContainer.textContent = `Phone Number ${numRecipient} `
        const newSelect = document.createElement('select')
        newSelect.classList.add('recipient-column-select')
        newSelect.dataset.recipientNumber = numRecipient
        addOptionsToSelect(newSelect, columnNames)
        newRecipientContainer.appendChild(newSelect)
        addNumberColumns.appendChild(newRecipientContainer)
      })

      const sendMessagesButton = document.querySelector('.extension-send-messages')
      const conditionsInput = document.querySelector('#i-agree-that-i-have-read-the-google-messages-terms-and-conditions-and-am-fully-responsible-for-my-use-of-this-extension')
      conditionsInput.addEventListener('change', () => {
        sendMessagesButton.disabled = !conditionsInput.checked
      })
      sendMessagesButton.addEventListener('click', async () => {
        const messageTemplateStr = messageTextarea.value
        const recipientNumberColumnNames = Array.from(document.querySelectorAll('.recipient-column-select')).map(select => select.value).filter(Boolean)

        const preparedMessagesAndNumbers = getAdvancedPreparedMessagesAndNumbers(csvObjArr, recipientNumberColumnNames, messageTemplateStr)
        const dedupedPreparedMessagesAndNumbers = preparedMessagesAndNumbers.reduce((acc, cur) => {
          if (!acc.some(item => isSameArray(item.numbers, cur.numbers))) {
            acc.push(cur)
          }
          return acc
        }, [])
        console.log(dedupedPreparedMessagesAndNumbers)
        await sendAllMessages(dedupedPreparedMessagesAndNumbers, 2500, 10000)
        alert(`Done sending messages`)
      })
    }, csvInput, drop)
  }
  return true
});

/**
 * Returns array of objects with prepared messages. e.g.:
 * [
 *   { numbers: ['555-555-5555', '555-555-5556'], message: 'Hi, Sue and So.' },
 *   { numbers: ['123-456-7890', '555-555-5557'], message: 'Hi, John and Jane.' },
 * ]
 */
function getAdvancedPreparedMessagesAndNumbers(csvObjArr, recipientNumberColumnNames, messageTemplateStr) {
  const preparedMessages = csvObjArr.map((obj, i) => {
    try {
      const numbers = recipientNumberColumnNames.map(recipientNumberColumnName => {
        const recipientNumber = obj[recipientNumberColumnName]
        if (!recipientNumber) {
          const errMessage = `Missing recipient number for column, '${recipientNumberColumnName}' in row ${i}`
          throw new Error(errMessage)
        }
        const formattedRecipientNumber = getNumber(recipientNumber)
        if (!formattedRecipientNumber) {
          const errMessage = `Could not extract recipient number for column, '${recipientNumberColumnName}' in row ${i}: '${recipientNumber}'`
          throw new Error(errMessage)
        }
        return formattedRecipientNumber
      })
      
      const message = removeUnicode(formatWithNoBlanksAllowed(messageTemplateStr, obj))
      if (!message) throw new Error(`Message is empty for row ${i}`)
      
      return { numbers, message }
    } catch (err) {
      alert(err)
      throw err
    }
  })

  return preparedMessages
}

// Thank you: https://stackoverflow.com/a/34278578/4151489
function typeInTextarea(newText, el) {
  const [start, end] = [el.selectionStart, el.selectionEnd];
  el.setRangeText(newText, start, end, 'select');
}

function addOptionsToSelect(select, optionStrs) {
  const option = document.createElement('option')
  option.textContent = "--Select a Column--"
  option.value = ""
  select.appendChild(option)
  optionStrs.forEach(optionStr => {
    const option = document.createElement('option')
    option.textContent = option.value = optionStr
    select.appendChild(option)
  })
}

function treatMessagesAndNumbers(messagesAndNumbers) {
  return messagesAndNumbers.map((messageAndNumber) => {
    const {message, number} = messageAndNumber
    
    return {
      ...messagesAndNumbers,
      numbers: [getNumber(number)],
      message: removeUnicode(message),
    }
  })
}

async function sendAllMessages(messagesAndNumbers, sendIntervalMin, sendIntervalMax) {
  // get to the right page
  const messagesStartPage = '/web/conversations/new'
  if (location.pathname !== messagesStartPage) {
    await till(() => document.querySelector('[data-e2e-start-button]'))
    document.querySelector('[data-e2e-start-button]').click()
    await till(() => location.pathname === messagesStartPage)
  }

  // reset status information
  browser.runtime.sendMessage({ funcName: 'displayStatusInfo', args: null })
  statusInfo = null
  browser.runtime.sendMessage({ funcName: 'displayStatusInfo', args: { progressRowIndex: 0 } })
  statusInfo = { progressRowIndex: 0 }

  const n = messagesAndNumbers.length; // number of times to call promise
  await sequentialPromiseAll(
    sendGroupMessageAndWait, // function that returns a promise (will be called n times after previous one resolves)
    [messagesAndNumbers[0].message, messagesAndNumbers[0].numbers, undefined, undefined], // arguments array provided to promise
    n, // number of times to call promise
    ( // callback - invoked after each promise resolution
    argsHandle, // modify this in the callback to change the arguments at the next invocation
    _previousResponse, // what is resolved from promise
    i) => {
    browser.runtime.sendMessage({ funcName: 'displayStatusInfo', args: { progressRowIndex: i } })
    statusInfo = { progressRowIndex: i }

    argsHandle[0] = messagesAndNumbers[i].message;
    argsHandle[1] = messagesAndNumbers[i].numbers;
    argsHandle[2] = sendIntervalMin;
    argsHandle[3] = sendIntervalMax;
  });

  browser.runtime.sendMessage({ funcName: 'displayStatusInfo', args: { progressRowIndex: n } })
  statusInfo = { progressRowIndex: n }
  await timeout(1000)
  browser.runtime.sendMessage({ funcName: 'displayStatusInfo', args: null })
  statusInfo = null
}

function sendGroupMessageAndWait(message, numberOrNumbers, waitMin, waitMax) {
  return new Promise(async (resolve, reject) => {
    if (message.includes('undefined')) {
      reject(`message includes 'undefined': ${message}`)
    }
    console.group(`${numberOrNumbers}`);
    console.log(message)
    console.groupEnd(`${numberOrNumbers}`);
    if (typeof waitMin === 'number' && typeof waitMax === 'number') {
      await timeout(getRandomInt(waitMin, waitMax))
    }
    await sendGroupMessage(message, numberOrNumbers)
    resolve(`message sent to ${numberOrNumbers}`)
  })
}

async function sendGroupMessage(message, recipients) {
  if (Array.isArray(recipients)) {
    if (recipients.length === 0) throw new Error('No recipients provided')
    
    if (recipients.length > 1) await startGroupChat()
    const n = recipients.length; // number of times to call promise
    await sequentialPromiseAll(
      addRecipient, // function that returns a promise (will be called n times after previous one resolves)
      [recipients[0]], // arguments array provided to promise
      n, // number of times to call promise
      ( // callback - invoked after each promise resolution
      argsHandle, // modify this in the callback to change the arguments at the next invocation
      _previousResponse, // what is resolved from promise
      i) => {
      argsHandle[0] = recipients[i];
    });
  } else if (typeof recipients === 'string' || typeof recipients === 'number') {
    await addRecipient(recipients)
  } else {
    throw new Error(`Unkown recipients format, '${typeof recipients}' for recipients: ${recipients}`)
  }
  if (!location.pathname.startsWith('/web/conversations/') || (Array.isArray(recipients) && recipients.length > 1)) {
    // must click next before sending group message
    await continueToConversation()
  }
  await setMessage(message)
  await sendMessage()
  history.back()
}
async function startGroupChat() {
  if (!location.href.endsWith('/web/conversations/new?mode=new-group')) {
    await till(() => document.querySelector('[data-e2e-start-group-chat-button], [data-e2e-add-more-people]'))
    document.querySelector('[data-e2e-start-group-chat-button], [data-e2e-add-more-people]').click()
  }
}

async function addRecipient(number) {
  return new Promise(async (resolve, reject) => {
    await till(() => document.querySelector('[placeholder="Type a name, phone number, or email"],[placeholder="Add more people"]'))
    setTo('[placeholder="Type a name, phone number, or email"],[placeholder="Add more people"]', number)
    
    // select the existing contact or new number
    await till(() => {
      const testEl = document.querySelector('[data-e2e-contact-row],[data-e2e-send-to-button]')
      if (testEl && testEl.textContent.includes(number)) return true;
    })
    document.querySelector('[data-e2e-contact-row],[data-e2e-send-to-button]').click()
    resolve(`recipient added ${number}`)
  })
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
  
  await till(() => document.querySelectorAll('[data-e2e-send-text-button]'), 50000)
}
async function sendMessage() {
  await till(() => document.querySelector('[data-e2e-send-text-button]:not([disabled])'))
  document.querySelector('[data-e2e-send-text-button]').click()
}