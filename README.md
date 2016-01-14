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

> p.parseArchive('testing')
Loading File:./mcpParse/cache/testing.csv
Please be patient if file is large...
Parsing CSV File...
235 points loaded
Separating Matches...
1 matches
Matches Loaded
Parsing Shot Sequences...
1 Matches Successfully Parsed

> parsed.matches.length
1
```
Each match can be queried/navigated using "accessors":
```
> p.matches[0].match.players()
[ 'Diego Sebastian Schwartzman', 'Horacio Zeballos' ]

> p.matches[0].match.score().match_score
'7-6(0), 4-6, 6-1'

> p.matches[0].tournament
{ name: 'Montevideo',
  division: 'M',
  tour: 'ch',
  date: Fri Nov 20 2015 00:00:00 GMT+0100 (CET) }

> parsed.matches[0].match.points()
...
```

A single point looks like this:
```
> p.matches[0].match.points()[0]
{ serves: [ '6' ],
  rally: [ 'b28', 'b3', 'b1', 'f2', 'f2', 'r2', 'r+3', 'b1', 'v1*' ],
  terminator: '*',
  result: 'Winner',
  serve: 1,
  code: '6b28b3b1f2f2r2r+3b1v1*|',
  winner: 1,
  point: '0-15',
  server: 0,
  game: 0 }
```
For **winner** and **server**,  '0' and '1' indicate the array position of the player.  The server of the point is:

```
> p.matches[0].match.players()[0]
'Diego Sebastian Schwartzman'
```

The winner of the point would be:

```
> p.matches[0].match.players()[1]
'Horacio Zeballos'
```

### Analysis

I will continue adding analysis functions until a full stat package has been created.

The first two analysis function are looking at data quality.

**rallyDepth()** counts the number of points in a match which have a return of service, and differentiates returns which finish a point and returns which include an indication of the depth of the return. In the example below there are three "return-other" shots; these are returns of service which have no depth information and do not finish the point.

```
p.rallyDepth(p.matches[0].match.points())
{ points: 90,
  returns: 75,
  return_finish: 16,
  return_depth: 58,
  return_other: [ 'm2', 'm2', 'm2' ],
  shots: 253,
  rally_depth: 0 }
```
**matchRallies** runs a **rallyDepth** for an array of matches and gives an aggregate result.  It is useful for identifying matches where depth information is given for rally shots other than return of service.

```
p.matchRallies(p.matches)
```
