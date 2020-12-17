// like tillTrue, but with a random wait first and fails after 10 seconds
async function till(callback, timeoutMS = 10000) {
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