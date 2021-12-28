function csvToArray(csv)
{
    row = csv.split("\n");
    return row.map(function(row) {
      return row.split(",");  
    })
}
const multipliers = require('./metaMultipliers.json');
// synchronous read file
const fs = require('fs');
const { config } = require('process');
var champsAndNumbers = {}; //dictionary for character and their place
//console.log(soloqueueWinrates);
var allWinrates = csvToArray(fs.readFileSync('output.csv', 'utf8'));
var allSpecificMatchups = csvToArray(fs.readFileSync('SpecificMatchups.csv', 'utf8'));
var allMetas = csvToArray(fs.readFileSync('champMeta.csv','utf8'));
function assignChampNumbers (value, index, array)
{
    champsAndNumbers[value] = index;
}
allWinrates[0].forEach(assignChampNumbers);
var champLength = allWinrates.length;
// matchup score for soloqueue = wr - 50
// ranges from -0.5 to 0.5 
for(let i = 1 ; i < champLength; i ++)
{
    for(let j = 3; j < champLength; j++)
    {
        if(allWinrates[i][j]!=-1)
        allWinrates[i][j] -=0.5;
    }
}
// add matchup score / 10 forward and backwards
for(let i = 0 ; i < allSpecificMatchups.length; i++)
{
    var champIndex1 = champsAndNumbers[allSpecificMatchups[i][0]];
    var champIndex2 = champsAndNumbers[allSpecificMatchups[i][1]];
    allWinrates[champIndex1][champIndex2] += allSpecificMatchups[2]*multipliers.matchUpsMultiplier;
    allWinrates[champIndex2][champIndex1] -= allSpecificMatchups[2]*multipliers.matchUpsMultiplier;
}
for(let i = 0 ; i < allMetas.length; i++)
{
    var champIndex = champsAndNumbers[allMetas[i][0]];
    for(let j = 1; j < allWinrates.length; j ++)
    {
        if(allWinrates[i][j]!= -1)
        allWinrates[champIndex][j] += multipliers.viabilityMultiplier;
    }
}
console.log(allWinrates);
function arrayToCSV (twoDiArray) {
    var fileStr = fs.createWriteStream("finalMatchupScores.csv");
    var csvRows = [];
    for (var i = 0; i < twoDiArray.length; ++i) {
        csvRows.push(twoDiArray[i].join(','));
    }

    var csvString = csvRows.join('\r\n');
    fileStr.write(csvString);
}
arrayToCSV(allWinrates);
