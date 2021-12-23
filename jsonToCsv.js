const output = require('./output.json')
const fs = require('fs')

const champList = Object.keys(output.aggregate)

if (champList.length === 0) {
  throw new Error("No champions are avaliable in aggregate")
}

champList.sort((a,b) => a.localeCompare(b))

var fileStr = fs.createWriteStream("output.csv")

// Write Header
fileStr.write('champ,totalMatches,baseWR,')
fileStr.write(champList.join(','))
fileStr.write('\n')

// Write Lines
champList.forEach(champ => {
  const champBlock = output.aggregate[champ]
  fileStr.write(`${champ},${champBlock.total},${champBlock.win / champBlock.total}`)
  champList.forEach(opponent => {
    fileStr.write(',')
    fileStr.write(champBlock.matchups[opponent] ? (String)(champBlock.matchups[opponent].win / champBlock.matchups[opponent].total) : '-1')
  })
  fileStr.write('\n')
})