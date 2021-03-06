const axios = require('axios')
const config = require('./config.json')
var AUTH_KEYCHAIN
var plathost
var reghost

const minReqInterval = config.minReqInterval

var lastPlatformRequest = []
var lastRegionRequest = []

var startTime
var currentKey = 0
var abortFlag = false

function init (keys, platform, region) {
  AUTH_KEYCHAIN = keys,
  lastPlatformRequest = (new Array(keys.length)).fill(0)
  lastRegionRequest = (new Array(keys.length)).fill(0)

  plathost = `https://${platform}.api.riotgames.com`
  reghost = `https://${region}.api.riotgames.com`
  startTime = Date.now()
}

function abort () {
  abortFlag = true
}

async function request (endpoint, isRegional, authKeyId = -1) {

  let time = Date.now();

  const usedKeyId = authKeyId === -1 ? currentKey : authKeyId

  // Cycle Key
  if (authKeyId === -1) {
    currentKey++
    if (currentKey === AUTH_KEYCHAIN.length) currentKey = 0
  }
  let lastReq = (isRegional ? lastRegionRequest[usedKeyId] : lastPlatformRequest[usedKeyId])

  while (time - minReqInterval + 10 < lastReq) {
    await sleep(minReqInterval)
    if (abortFlag) return
    time = Date.now()
    lastReq = (isRegional ? lastRegionRequest[usedKeyId] : lastPlatformRequest[usedKeyId])
  }

  console.log(`REQUESTING ${endpoint} with key ${usedKeyId} at t=${time - startTime} (lastReq=${(isRegional ? lastRegionRequest[usedKeyId] : lastPlatformRequest[usedKeyId]) - startTime}) (REGIONAL = ${isRegional})`)

  if(isRegional) {
    lastRegionRequest[usedKeyId] = time
  }
  else {
    lastPlatformRequest[usedKeyId] = time
  }

  // return endpoint
  
  const options = {
    method: 'GET',
    headers: { 
      "X-Riot-Token": AUTH_KEYCHAIN[usedKeyId]
    },
    url: (isRegional ? reghost: plathost) + endpoint,
  }

  return axios(options)
    .then(res => {
      res.data.keyUsed = usedKeyId
      return res.data
    })
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  init,
  abort,
  request: request
}