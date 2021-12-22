const axios = require('axios')
const config = require('./config.json')
var AUTH_KEY
var plathost
var reghost

const minReqInterval = config.minReqInterval

var lastPlatformRequest = 0
var lastRegionRequest = 0

var startTime

function init (key, platform, region) {
  AUTH_KEY = key,
  plathost = `https://${platform}.api.riotgames.com`
  reghost = `https://${region}.api.riotgames.com`
  startTime = Date.now()
}

async function request (endpoint, isRegional = false) {

  let time = Date.now();
  let lastReq = (isRegional ? lastRegionRequest : lastPlatformRequest)

  // console.log(`QUEUED     ${endpoint} at t=${time - startTime} (lastReq=${(isRegional ? lastRegionRequest : lastPlatformRequest) - startTime}) (REGIONAL = ${isRegional})`)

  while (time - minReqInterval + 10 < lastReq) {
    // console.log(`DELAYED    ${endpoint} at t=${time - startTime} (lastReq=${(isRegional ? lastRegionRequest : lastPlatformRequest) - startTime}) (REGIONAL = ${isRegional})`)
    await sleep(minReqInterval)
    time = Date.now()
    lastReq = (isRegional ? lastRegionRequest : lastPlatformRequest)
  }

  console.log(`REQUESTING ${endpoint} at t=${time - startTime} (lastReq=${(isRegional ? lastRegionRequest : lastPlatformRequest) - startTime}) (REGIONAL = ${isRegional})`)

  if(isRegional) {
    lastRegionRequest = time
  }
  else {
    lastPlatformRequest = time
  }

  // return endpoint
  
  const options = {
    method: 'GET',
    headers: { 
      "X-Riot-Token": AUTH_KEY
    },
    url: (isRegional ? reghost: plathost) + endpoint,
  }
  
  return axios(options)
    .then(res => res.data)
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  init,
  request: request
}