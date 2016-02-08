# mcp-charting-points-parser
### Parses CSV files created by the Match Charting Project
Uses the Universal Match Object (UMO) https://github.com/TennisVisuals/universal-match-object to create navigable objects for each match found in MCP .csv files

#### Requirements:
- Node
- CSV point files downloaded from: https://github.com/JeffSackmann/tennis_MatchChartingProject

#### Installation
- Download .zip file
- Unzip, which creates 'mcp-charting-points-parser-master' directory
- move MCP .csv files you wish to use into /cache/ sub-directory
*(two example files are provided, 'example' and 'testing')*

Navigate into the 'mcp-charting-points-parser-master' directory and:
```
npm install
```
#### Module Usage
While still inside the project directory:
```
node

> p = require('./mcpParse')()

> p.parseArchive('example')
Loading File:./mcpParse/cache/example.csv
Please be patient if file is large...

Parsing CSV File...
657 points loaded
Separating Matches...
4 matches
Matches Loaded
Parsing Shot Sequences...
====
4 Matches Successfully Parsed

> p.matches.length
4
```
Each match contains tournament information as well as a UMO which can be queried/navigated using "accessors":
```
> tournament = p.matches[0].tournament
{ name: 'Tour Finals',
  division: 'M',
  date: Sun Nov 22 2015 00:00:00 GMT+0100 (CET) }

> match = p.matches[0].match
{ [Function: match]
  options: [Function],
  points: [Function],
  winProgression: [Function],
  gameProgression: [Function],
  push: [Function],
  pop: [Function],
  players: [Function],
  score: [Function],
  reset: [Function],
  sets: [Function],
  pointIndex: [Function],
  findPoint: [Function] }
```
You won't need most of these accessors for match analysis; review the REAME for the Universal Match Object if you are interested in learning more about the accessors not covered in these examples.  
```
> players = match.players()
[ 'Roger Federer', 'Novak Djokovic' ]

> match.score().match_score
'6-3, 6-4'

> match.score().winner
'Novak Djokovic'

> match.points().length
115
```

A single point looks like this:
```
> point = match.points()[0]
{ serves: [ '6' ],
  rally: [ 'b19', 'f3', 'b2', 'b1n@' ],
  terminator: '@',
  result: 'Unforced Error',
  error: 'Net',
  serve: 2,
  first_serve: { serves: [ '4n' ], error: 'Net' },
  code: '4n|6b19f3b2b1n@',
  winner: 1,
  score: '0-15',
  server: 0,
  game: 0 }
```
For **winner** and **server**,  '0' and '1' indicate the array position of the player.  The server of the point is:

```
> players[point.server]
'Roger Federer'
```

The winner of the point would be:

```
> players[point.winner]
'Novak Djokovic'
```
**playerMatches()** returns an array of all matches containing the specified player.  Call the function a second time to create an array of matches between two players.

```
> djoker = p.playerMatches(p.matches, 'Djokovic')
...
> NDvRF = p.playerMatches(djoker, 'Federer')
...
```
### Analysis & Statistics
Be sure to check out the functions available in the **Analysis** and **Statistics** modules which you can read about in the documentation folder.

### Convenience
To make writing analysis functions easier...

**combineMatchesPoints(*player_name, matches*)** combines points from an array of matches (such as 'djoker' from the example above). Specified player is player '0' in the resulting array of points.
```
> points = p.combineMatchesPoints('Djokovic', djoker)
```

**shotSplitter(*shot_sequence*)** parses a shot sequence string into an array of shots.

**findShotPattern(*points, shot_pattern, [reverse(boolean)]*)** filters an array of points by looking for a specified shot pattern. By default searches beginning with the serve.  To search from the concluding shot, pass 'true' as the final parameter.

Accepts any degree of detail: shot type, direction, depth, position, error.
```
> q = p.sequence
> t = q.findShotPattern(points, ['6', 'f3', 'b3','b'])
> t = q.findShotPattern(points, q.shotSplitter('6f3b3b'))

> t = q.findShotPattern(points, ['b', 'b', '#'], true)
```
To skip the serve:
```
> t = q.findShotPattern(points, ['', 'b', 'b'])
```
To find matching shots where the server is player '0':
```
> sp = t.filter(point => point.server == 0)
```

### Point Translation

**decipherPoint()** provides an english-language translation of a point.
```
> q.decipherPoint(point)
[ 'T Serve',
  'Backhand cross-court; Close to Baseline',
  'Forehand down the line',
  'Backhand to the middle',
  'Backhand to the left side; Netted; Unforced Error' ]
```
**decipherSequence()** provides an english-language translation of an MCP shot sequence. An optional second argument enables passing the point score (e.g. '0-15') which aids in determining the trajectory of the return of service.
```
> q.decipherSequence('6f=37b+3b3z#', '0-15')
[ 'T Serve',
  'Forehand at the Baseline to the right side; Within Service Boxes',
  'Backhand approach shot cross-court',
  'Backhand cross-court',
  'Backhand Volley; Forced Error' ]
```
**decipherShot()** provides an english-language translation of a single MCP shot. The point score is an optional parameter.
```
> q.decipherShot('6*', '0-15')
{ sequence: 'T Serve; Ace',
  full_sequence: 'T Serve, Winner',
  direction: 1 }
  ```
