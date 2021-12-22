const { init, request } = require('./riotreq.js')
const apikey = require('./apikey.json')
const config = require('./config.json')
const fs = require('fs')

init(apikey.key, config.platform, config.region)

async function spiderSearch (initPlayer, maxMatch = 1000) {
  const initPlayerInfo = await request(`/lol/summoner/v4/summoners/by-name/${initPlayer}`)

  const searchedMatches = []
  var failFlag = false
  let totalPlayerScanned = 0

  const playerQueueRoot = {
    puuid: initPlayerInfo.puuid,
    next: null
  }

  let currentPlayer = playerQueueRoot

  let aggregate = {}

  while (!failFlag && searchedMatches.length <= maxMatch && currentPlayer) {
    // Get Match IDs
    const matches = await request(`/lol/match/v5/matches/by-puuid/${currentPlayer.puuid}/ids?${config.queueType === -1 ? "" : (`queueType=${config.queueType}&`)}start=0&count=${config.matchHistoryCount}`, true)
    const promises = matches.map(async matchId => {
      if (searchedMatches.includes(matchId) || searchedMatches.length > maxMatch) {
        console.log(`Skipping ${matchId}`)
        return null
      }
      searchedMatches.push(matchId)

      // Get Match Data
      const matchInfo = await request(`/lol/match/v5/matches/${matchId}`, true)

      // Aggregate Data and get players
      matchInfo.info.participants.forEach(participantInfo => {
        const champ = participantInfo.championName
        
        // Aggregate Data
        if (aggregate[champ]) {
          aggregate[champ].total++
          if(participantInfo.win) aggregate[champ].win++
        }
        else {
          aggregate[champ] = {
            total: 1,
            win: participantInfo.win ? 1 : 0
          }
        }

        // Get more player
        const newId = participantInfo.puuid
        let isRepeat = false
        let n = playerQueueRoot
        while (n.next) {
          if(n.puuid === newId) {
            isRepeat = true
            break
          }
          n = n.next
        }
        if(!isRepeat && n.puuid !== newId) {
          n.next = {
            puuid: newId,
            next: null
          }
        }
      })
    })

    await Promise.all(promises)
    .catch(err => {
      console.error(err)
      failFlag = true
    })

    currentPlayer = currentPlayer.next
    totalPlayerScanned++
    console.log(`Scanned ${searchedMatches.length} matches and ${totalPlayerScanned} players`)
  }

  Object.keys(aggregate).forEach(champName => aggregate[champName].winRate = aggregate[champName].win / aggregate[champName].total)

  return {
    totalPlayerScanned,
    matchesScanned: searchedMatches.length,
    aggregate
  }
}

// request('/lol/summoner/v4/summoners/by-name/Ginsu')
// .then(res => {
//   const puuid = res.puuid
//   return request(`/lol/match/v5/matches/by-puuid/${puuid}/ids`, true)
// })
// .then(res => {
//   return Promise.all(res.map(matchId => {
//     return request(`/lol/match/v5/matches/${matchId}`, true)
//   }))
// })
// .then(res => {
//   const str = JSON.stringify(res, null, 2)
//   fs.writeFileSync('./output.json', str)
// })

spiderSearch(config.initialPlayer)
.then(res => {
  const str = JSON.stringify(res, null, 2)
  fs.writeFileSync('./output.json', str)
})