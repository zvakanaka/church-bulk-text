// like tillTrue, but with a random wait first and fails after 30 seconds
async function till(callback, timeoutMS = 30000) {
  await timeout(getRandomInt(1000, 5000))
  return tillTrue(callback, undefined, timeoutMS)
}
function timeout(ms) { return new Promise(r => setTimeout(r, ms)); }
function rafAsync() { return new Promise(resolve => requestAnimationFrame(resolve)); }
/*
 * USAGE:
 * await tillTrue(() => document.querySelector('.thing'));
 */
async function tillTrue(callback, intervalMs, timeoutMs = Infinity) {
  let result = callback();
  const start = Date.now();
  let now = Date.now();
  while (!result && now - start <= timeoutMs) {    if (typeof intervalMs === 'undefined') await rafAsync();
    else await timeout(intervalMs);
    result = callback();
    now = Date.now();
  }
  if (now - start > timeoutMs) throw new Error(`tillTrue timeout, waited longer than ${timeoutMs} miliseconds`);
  return result;
}

// thanks https://stackoverflow.com/a/52036543/4151489
function format(str, obj) {
  var regex = /{(.*?)}/g;
  return str.replace(regex, (m, c) => (obj)[c]);
}

function formatWithNoBlanksAllowed(str, obj) {
  var regex = /{(.*?)}/g;
  return str.replace(regex, (m, key) => {
    if (obj[key]) return obj[key]
    throw new Error(`Object does not have a value for key, '${key}': ${JSON.stringify(obj, null, 2)}`)
  });
}

/** see https://www.npmjs.com/package/sequential-promise-all */
/**
 * Call a promise n times, waiting for each promise to resolve before calling it again.
 * THANK YOU for idea: Jason Suttles https://stackoverflow.com/a/43377621/4151489
 * @param  {function} promise        function that returns a Promise (will be called n times after previous one finishes)
 * @param  {Array}    args           arguments to pass to promise
 * @param  {Number}   n              number of times to call promise
 * @param  {function} [updateCb]     callback that is called after every resolution (modify args here before next call if desired)
 * @return {Promise[]}               array of responses from all promises
 */
function sequentialPromiseAll(promise, args, n, updateCb) {
  return new Promise((resolve, reject) => {
    const responses = [];
    const arr = Array.from(Array(n), (_d, i) => i); // create array filled with 0..n
    arr.reduce((p, _item, i) => {
      return p.then((previousResponse) => {
        if (previousResponse) {
          responses.push(previousResponse);
          if (updateCb) updateCb(args, previousResponse, i);
        }
        return promise(...args);
      });
    }, Promise.resolve()).then((previousResponse) => {
      responses.push(previousResponse);
      resolve(responses);
    }).catch((err) => {
      console.warn(err, responses);
      reject(responses);
    });
  });
}
// thanks https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

// filters out non-numerical characters
function getNumber(str) {
  const NUMBERS_ONLY_REGEXP = /[0-9]+/g
  return (str.match(NUMBERS_ONLY_REGEXP) || []).join('')
}

// Thank you: https://stackoverflow.com/a/63411236/4151489
function isSameArray(array1, array2) {
  const isInArray1 = array1.every(item => array2.find(item2 => item === item2))
  const isInArray2 = array2.every(item => array1.find(item2 => item === item2))
  
  const sameArrayContents = array1.length === array2.length && isInArray1 && isInArray2
  
  return sameArrayContents
} 

/**
 * Removes unicode characters from the text
 * Thank you: brismuth
 */
function removeUnicode(text) {
	return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
}


/**
 * Turn an array of objects into a CSV. If object keys are inconsistent across objects, the extra keys will be included in each row.
 * @param  {Object[]} data                      Array of objects to change to CSV (see https://codepen.io/zvakanaka/pen/XOxJZp?editors=1010)
 * @param  {String} [colDelim=','] Delimiter character between columns
 * @param  {String} [rowDelim='\r\n']    Delimiter character between rows
 * @return {String}                             CSV text
 */
function objArrToCsv(data, colDelim = ',', rowDelim = '\r\n') {
  const headers = getAllKeys(data);
  return data.reduce((acc, row) => acc + headers.map(header => {
    if (!row.hasOwnProperty(header) || !row[header]) return '';
    const cell = `${row[header]}`.replace(/(\")/g, '""'); // escape double quotes with a double quote
    const shouldSurroundWithQuotes = cell.includes(colDelim) || `${rowDelim}"`.split('').some(ch => cell.includes(ch));
    return shouldSurroundWithQuotes ? `"${cell}"` : cell;
  }).join(colDelim) + rowDelim, `${headers.join(colDelim)}${rowDelim}`);
}
/**
* Returns an array of all keys that appear across an array of objects (top level only).
* e.g. [{a:'a',b:'b'},{a:'aa',z:'z'}] => ['a','b','z']
* @param  {Object[]}      data Array of objects
* @return {Array}              Unique keys
*/
function getAllKeys(data) {
  const setOfHeaders = new Set([]);
  data.forEach(row => Object.keys(row).forEach(header => setOfHeaders.add(header)));
  return Array.from(setOfHeaders);
}

function papaParse(csvContent) {
  return papaToObjArr(Papa.parse(csvContent.trim()))
}
function papaToObjArr({ data }) {
  const headings = data[0]
  return data.reduce((acc, cur, i) => {
    if (i !== 0) {
      acc.push(cur.reduce((acc2, cur2, j) => {
        acc2[headings[j]] = cur2
        return acc2
      }, {}))
    }
    return acc
  }, [])
}

// https://github.com/zvakanaka/image-manipulation-with-canvas/blob/master/js/fileParts.js
function fileParts(src) {
  const filename = src.split('/')[src.split('/').length - 1];
  const ext = filename.split('.')[filename.split('.').length - 1];
  const fileWithoutExt = filename.substr(0, filename.length - ext.length - 1);
  return {
    filename, ext, fileWithoutExt
  };
}

// https://github.com/zvakanaka/image-manipulation-with-canvas/blob/master/js/dragAndDrop.js
function loadFile(ev, callback) {
  const target = ev.dataTransfer ? ev.dataTransfer : ev.target
  window.fileObject = target.files[0]
  if (target.files.length === 1) { // single file
    // determine if our URL is a supported image
    const supportedFileExtensions = ['csv']
    const {ext} = fileParts(target.files[0].name.toLowerCase())
    if (supportedFileExtensions.includes(ext)) { // valid extension
      readInFile(target.files, callback)
    } else {
      alert(`Invalid extension ${ext} in ${supportedFileExtensions.join(', ')}`)
    }
  }
  else { // list of files
    alert('No support for list of files yet')
  }
}

function readInFile(files, callback) {
  let file, fr

  if (typeof window.FileReader !== 'function') {
    console.log('File API not supported')
    return
  }

  if (!files) {
    console.log('No support for files input')
  } else if (!files[0]) {
    console.log('No file selected')
  } else {
    file = files[0]
    fr = new FileReader()
    fr.onload = () => {
      callback(fr.result)
    }
    fr.readAsDataURL(file)
  }
}

function initDragAndDrop(callback, inputEl, dropTarget = document) {
  inputEl.addEventListener('change', (ev) => {
    ev.preventDefault()
    loadFile(ev, (contents) => callback(contents))
  })

  dropTarget.addEventListener('drop', (ev) => {
    ev.preventDefault()
    loadFile(ev, (contents) => callback(contents))
  }, false)
}

// see https://github.com/zvakanaka/create-extension/blob/master/client/utils.js
function applyStyle(str) {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = str;
  document.head.appendChild(styleEl);
}
/*
 * USAGE:
 * html`<h1>Hi</h1>`
 */
function html(arr, ...parts) { return arr.reduce((acc, cur, i) => `${acc}${cur}${parts[i] || ''}`, ''); }
function css(arr, ...parts) { return arr.reduce((acc, cur, i) => `${acc}${cur}${parts[i] || ''}`, ''); }