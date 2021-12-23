const { init, abort, request } = require('./riotreq.js')
const apikey = require('./apikey.json')
const config = require('./config.json')
const fs = require('fs')

init(apikey.key, config.platform, config.region)

var abortFlag = false

async function spiderSearch (initPlayer, maxMatch) {
  const initPlayerInfo = await request(`/lol/summoner/v4/summoners/by-name/${initPlayer}`, false, 0)

  const searchedMatches = []
  let totalPlayerScanned = 0
  let failedMatchScans = 0
  let failedPlayerScans = 0

  const playerQueueRoot = {
    puuid: initPlayerInfo.puuid,
    keyUsed: 0,
    next: null
  }

  let currentPlayer = playerQueueRoot

  let aggregate = {}

  while (!abortFlag && searchedMatches.length - failedMatchScans < maxMatch && currentPlayer) {
    let matches
    // Get Match IDs
    try {
      matches = await request(`/lol/match/v5/matches/by-puuid/${currentPlayer.puuid}/ids?${config.queueType === -1 ? "" : (`queueType=${config.queueType}&`)}start=0&count=${config.matchHistoryCount}`, true, currentPlayer.keyUsed)
    }
    catch (err) {
      console.error(err)
      failedPlayerScans++
      return
    }

    const promises = matches.map(async matchId => {
      if (abortFlag || searchedMatches.includes(matchId) || searchedMatches.length - failedMatchScans >= maxMatch) {
        console.log(`Skipping ${matchId}`)
        return null
      }
      searchedMatches.push(matchId)

      // Get Match Data
      let matchInfo 
      try {
        matchInfo = await request(`/lol/match/v5/matches/${matchId}`, true)
      }
      catch (err) {
        console.error(err)
        failedMatchScans++
        return
      }

      // Do not bother to start analyzing if the the program is aborted
      if (abortFlag) return

      const champList = matchInfo.info.participants.map(participantInfo => ({
        name: participantInfo.championName,
        position: participantInfo.teamPosition,
        team: participantInfo.teamId
      }))

      // Aggregate Data and get players
      matchInfo.info.participants.forEach((participantInfo, index) => {
        const champName = champList[index].name
        let champBlock = aggregate[champName] // Block in the Aggregate that contains information about a specific champion
        const champDidWin = participantInfo.win
        
        // Aggregate General Win/Loss
        if (champBlock) {
          // General Win/Loss
          champBlock.total++
          if(champDidWin) champBlock.win++
        }
        else {
          aggregate[champName] = {
            total: 1,
            win: champDidWin ? 1 : 0,
            positions: {},
            matchups: {}
          }
          champBlock = aggregate[champName]
        }

        // Aggregate Position Info
        const currentPosition = participantInfo.teamPosition // Position that the player played the champion in

        if (!champBlock.positions[currentPosition]) {
          champBlock.positions[currentPosition] = {
            total: 0,
            win: 0,
            matchups: {}
          }
        }

        const positionBlock = champBlock.positions[currentPosition] // Block in Aggregate that contains information for champion played in a specific position
        positionBlock.total++
        if (champDidWin) positionBlock.win++

        // Find opponent player of the same role and add to positional tally
        for (const champ of champList) {
          if (champ.position === currentPosition && champ.team !== participantInfo.teamId) {
            const matchupBlock = positionBlock.matchups[champ.name]
            if (matchupBlock) {
              matchupBlock.total++
              if (champDidWin) matchupBlock.win++
            }
            else {
              positionBlock.matchups[champ.name] = {
                total: 1,
                win: champDidWin ? 1 : 0
              }
            }
            break
          }
        }

        // Find opponent players in general (Full matchups, ignoring positions played)
        champList.forEach(champ => {
          if(champ.team !== participantInfo.teamId) {
            const matchupBlock = champBlock.matchups[champ.name]
            if (matchupBlock) {
              matchupBlock.total++
              if (champDidWin) matchupBlock.win++
            }
            else {
              champBlock.matchups[champ.name] = {
                total: 1,
                win: champDidWin ? 1 : 0
              }
            }
          }
        })

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
            keyUsed: matchInfo.keyUsed,
            next: null
          }
        }
      })
    })

    await Promise.all(promises)

    currentPlayer = currentPlayer.next
    totalPlayerScanned++
    console.log(`Scanned ${searchedMatches.length} matches and ${totalPlayerScanned} players`)
  }

  Object.keys(aggregate).forEach(champName => aggregate[champName].winRate = aggregate[champName].win / aggregate[champName].total)

  return {
    totalPlayerScanned,
    failedScans: failedMatchScans,
    matchesScanned: searchedMatches.length,
    aggregate
  }
}

var processPromise = spiderSearch(config.initialPlayer, config.maxMatches)
.then(res => {
  const str = JSON.stringify(res, null, 2)
  fs.writeFileSync('./output.json', str)
})
.catch(err => console.error(err)) 

process.on('SIGINT', async () => {
  console.log('Process Aborted, writing down existing aggregate...')
  abortFlag = true
  abort()
  await processPromise
});