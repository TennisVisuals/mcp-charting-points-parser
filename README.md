# mcp-charting-points-parser
### Parses CSV files created by the Match Charting Project
Uses Universal Match Object (UMO) https://github.com/TennisVisuals/universal-match-object to create navigable objects for each match found in MCP .csv files

#### Requirements:
- Node
- CSV point files downloaded from: https://github.com/JeffSackmann/tennis_MatchChartingProject

#### Installation
- Create project directory 'mcpParse'
- Download .zip file
- Unzip in project directory
- move MCP .csv files into mcpParse/cache/ sub-directory
*(two example files are provided, 'example' and 'testing')*

Navigae into the 'mcpParse' directory and:
```
npm install
```
#### Module Usage
Navigate to the directory above the project directory:
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
Each match can be queried/navigated using "accessors":
```
> tournament = p.matches[0].tournament
{ name: 'Tour Finals',
  division: 'M',
  date: Sun Nov 22 2015 00:00:00 GMT+0100 (CET) }

> match = p.matches[0].match

> players = match.players()
[ 'Roger Federer', 'Novak Djokovic' ]

> match.score().match_score
'6-3, 6-4'

> p.matches[0].match.score().winner
'Novak Djokovic'

> match.points()
...
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
  point: '0-15',
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
### Convenience
Several convenience function are provided for working with the match data

**playerMatches()** returns an array of all matches containing the specified player.  Call the function a second time to create an array of matches between two players.

```
> dj = p.az.playerMatches(p.matches, 'Djokovic')
```
**decipherPoint()** provides an english-language translation of a point.
```
> p.decipherPoint(point)
[ 'T Serve',
  'Backhand cross-court; Close to Baseline',
  'Forehand down the line',
  'Backhand to the middle',
  'Backhand to the left side; Netted; Unforced Error' ]
```
**decipherSequence()** provides an english-language translation of an MCP shot sequence. An optional second argument enables passing the point (e.g. '0-15') which aids in determining the trajectory of the return of service.
```
> p.decipherSequence('6f=37b+3b3z#', '0-15')
[ 'T Serve',
  'Forehand at the Baseline to the right side; Within Service Boxes',
  'Backhand approach shot cross-court',
  'Backhand cross-court',
  'Backhand Volley; Forced Error' ]
```
**decipherShot()** provides an english-language translation of a single MCP shot.
```
> p.decipherShot('6*', '0-15')
{ sequence: 'T Serve; Ace',
  full_sequence: 'T Serve, Winner',
  direction: 1 }
  ```

### Analysis

I will continue adding analysis functions until a full stat package has been created.

The first few analysis function are looking at data quality.  These function are provided as templates and to spur your creativity in exploring match data.

**rallyDepth()** counts the number of points in a match which have a return of service, and differentiates returns which finish a point and returns which include an indication of the depth of the return. In the example below there are three "return-other" shots; these are returns of service which have no depth information and do not finish the point.

```
> p.az.rallyDepth(match.points())
{ points: 115,
  returns: 101,
  return_finish: 22,
  return_depth: 79,
  return_other: [ 'b3' ],
  shots: 432,
  rally_depth: 0 }
```
**matchWithRallyDepth()** runs **rallyDepth()** for an array of matches and gives an aggregate result.  It is useful for identifying matches where depth information is given for rally shots other than return of service. Of all MCP women's matches, 31 have a total of 33 rally shots with depth information (but 9 of these are due to an invalid serve code pushing return-of-service to the second rally shot). Of all MCP men's matches, 35 have a total of 177 rally shots with depth information (but 12 of these are due to an invalid serve code pushing return-of-service to the second rally shot).

```
> p.az.matchesWithRallyDepth(p.matches)
{ rally_shots: 1640, rally_depth: 0, matches: [] }
```
**serveAnalysis()** counts the number of different types of serves charted for a given match while noting instances of invalid serve codes and cases where more than one serve were entered in the same shot sequence.
```
> p.az.serveAnalysis(match.points())
{ serve_types:
   { '4': 44,
     '5': 17,
     '6': 40,
     '6#': 1,
     '6*': 6,
     '4*': 4,
     '6n': 1,
     '4#': 1,
     '5d': 1 },
  invalid_serves: 0 }
```
**matchesServeAnalysis()** runs **serveAnalysis** for an array of matches and gives an aggregate result. According to the MCP data, the most common serve for women is a 'Body' serve, while the most common serve for men is 'Out Wide'; women make 'down-the-T' aces about 1.27 times as often as 'out-wide' aces, while men make 'down-the-T' aces about 1.18 times as often as 'out-wide' aces. There have been 538 invalid serves coded for women's matches (1.41/match) and 983 invalid serves coded for men's matches (1.14/match). Multiple serves are sometimes coded as part of the same shot sequence; this happened 6 times for men's matches.
```
> p.az.matchesServeAnalysis(p.matches)
```
### Strange Encounters

Once you begin looking at the data you will no doubt have some strange encounters with seemingly un-parseable shot sequences:
```
6d2g1g2g2g2d2g3n2g1g3n@
```
It looks to me like the charter's left hand was off by one key and the sequence should read:
```
6s2f1f2f2f2s2f3m2f1f3n@
```
But we'll never know...
