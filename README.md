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

```
npm install
```
#### Module Usage
Navigate to the directory above the project directory
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
> p.matches[0].match.players()
[ 'Roger Federer', 'Novak Djokovic' ]

> p.matches[0].tournament
{ name: 'Tour Finals',
  division: 'M',
  date: Sun Nov 22 2015 00:00:00 GMT+0100 (CET) }

> p.matches[0].match.score().match_score
'6-3, 6-4'

> p.matches[0].match.score().winner
'Novak Djokovic'

> parsed.matches[0].match.points()
...
```

A single point looks like this:
```
> p.matches[0].match.points()[0]
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
> p.matches[0].match.players()[0]
'Roger Federer'
```

The winner of the point would be:

```
> p.matches[0].match.players()[1]
'Novak Djokovic'
```
### Convenience
Several convenience function are provided for working with the match data

**playerMatches(match_array, player_name)** returns an array of all matches containing the specified player.  Call the function a second time to create an array of matches between two players.

```
> dj = p.az.playerMatches(p.matches, 'Djokovic')
```
### Analysis

I will continue adding analysis functions until a full stat package has been created.

The first two analysis function are looking at data quality.

**rallyDepth()** counts the number of points in a match which have a return of service, and differentiates returns which finish a point and returns which include an indication of the depth of the return. In the example below there are three "return-other" shots; these are returns of service which have no depth information and do not finish the point.

```
> p.az.rallyDepth(p.matches[0].match.points())
{ points: 115,
  returns: 101,
  return_finish: 22,
  return_depth: 79,
  return_other: [ 'b3' ],
  shots: 432,
  rally_depth: 0 }
```
**matchWithRallyDepth()** runs **rallyDepth()** for an array of matches and gives an aggregate result.  It is useful for identifying matches where depth information is given for rally shots other than return of service.

```
> p.az.matchesWithRallyDepth(p.matches)
{ rally_shots: 1640, rally_depth: 0, matches: [] }
```
