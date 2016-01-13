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
> p.matches[0].match.players()
[ 'Diego Sebastian Schwartzman', 'Horacio Zeballos' ]
> p.matches[0].match.score().match_score
'7-6(0), 4-6, 6-1'
```

To see point detail for each point in a match:
```
parsed.matches[0].match.points()
```
