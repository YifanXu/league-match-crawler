# League Match Crawler

This is a small script intended to pull winrate data of champions from riot api by examining a given player's match history, and recursively examine the match history of players that was previously found.

## Usage

```
npm install
node index.js
```

Results will be outputed to ``output.json`` in the root folder

## Adding your api key

Pulling data from riot api requires you to have an api key. You can obtain an developmental api key from the Riot's [Developer Portal](https://developer.riotgames.com/) 

Make a file in the root directory called ``apikey.json`` and put the key in such a format

```
{
  "key": "RGAPI-your-key"
}
```

## Configuring the Script

There are parameters that you can adjust to customize the behavior of the script. They can be found in ``config.json``

- **Platform**: Routing Value of the target platform (ex. "na1") (Learn more about [Routing Values](https://developer.riotgames.com/docs/lol#_routing-values))
- **Region**: Routing Value of the target region (ex. "americas") (Learn more about [Routing Values](https://developer.riotgames.com/docs/lol#_routing-values))
- **initialPlayer**: Summoner name of the player for the script to start searching from
- **queueType**: Type of queue to gather the data from. Refer to the [List of Queue IDs](https://static.developer.riotgames.com/docs/lol/queues.json)
- **minReqInterval**: The minimal time between each request as to not hit the [Rate Limit](https://developer.riotgames.com/docs/portal#web-apis_rate-limiting)
- **matchHistoryCount**: The number of games to pull from the match history list for each player
- **maxMatches**: The maximum number of the matches that the script for go through before terminating. The script will also terminate if it cannot find any more players.
