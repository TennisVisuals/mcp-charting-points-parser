# In Play Win/Loss Ratios
##### Using mcpParse.js to calculate FH/BH win/loss ratios for sets in the MCP Repository

The code included with this example defines three functions:
  - analyzeMatches()
  - handCount()
  - wlRatio()

**analyzeMatches()** processes each match to generate forehand/backhand win/loss ratios.

**handCount()** counts the number of forehands and backhands for a given player in an array of points.

**wlRatio()** calculates forehand/backhand win/loss ratios for an array of points.

#### Requirements:
  - Node
  - CSV point files downloaded from: https://github.com/JeffSackmann/tennis_MatchChartingProject

### Example Usage
Launch node and load the base module and the example module:
```
var p = require('./mcpParse')();
var wlr = require('./ipwlRatio')()
```

Use the following command to parse the men's archive:

```
> p.parseArchive('charting-m-points')
Loading File:./cache/charting-m-points.csv
Please be patient if file is large...
Parsing CSV File...
166471 points loaded
Separating Matches...
1093 matches
Matches Loaded
Parsing Shot Sequences...
==================-----------------------
1093 Matches Successfully Parsed
Analysis Complete
```

save men's matches:

```
var m = p.matches.slice()
```

process womens's matches:

```
> p.parseArchive('charting-w-points')
130583 points loaded
Separating Matches...
961 matches
Matches Loaded
Parsing Shot Sequences...
==================-----------------------
961 Matches Successfully Parsed
Analysis Complete
```

join men's and women's matches, analyze, and write resulting dataset:

```
var w = p.matches.slice()
var mw = m.concat(w)
r = wlr.analyzeMatches(mw)
fs.writeFileSync('wlRatios.dat', JSON.stringify({ data: r }));
```
