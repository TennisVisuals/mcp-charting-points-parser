# Set Scores: Points and Shots
##### Using mcpParse.js to discover maximum and minimum points and shots for sets in the MCP Repository

The code included with this example defines three functions:
  - analyzeMatches()
  - whenComplete()
  - minMax()

**analyzeMatches()** goes through each match and separates sets into "bins" based on the score.  *Final sets without tiebreaks are not included.*

**whenComplete()** is a convenience function that is submitted as a callback to the *parseArchive()* function (provided by the mcpParse module).  It adds the result to the *analyses* array for safekeeping.

**minMax()** is used to analyze each "bin" of sets to find the minimum and maximum shots/points for each set score.

#### Requirements:
  - Node
  - CSV point files downloaded from: https://github.com/JeffSackmann/tennis_MatchChartingProject

### Example Usage
Launch node and load the base module and the example module:
```
var p = require('./mcpParse')();
var s = require('./shotsAndPoints')();
```
Use the following command to parse the first archive:

```
> p.parseArchive('charting-m-points', s.whenComplete)
Loading File:./cache/charting-m-points.csv
Please be patient if file is large...
Parsing CSV File...
145297 points loaded
Separating Matches...
958 matches
Matches Loaded
Parsing Shot Sequences...
==================-----------------------
958 Matches Successfully Parsed
Analysis Complete

```
The "Shots and Points" module keeps track of each invocation in the *analyses* array:

```
> Object.keys(s.analyses[0])
[ 'bins', 'distribution' ]

> s.analyses[0].distribution.length
2373

> Object.keys(s.analyses[0].bins)
[ '6-0', '6-1', '6-2', '6-3', '6-4', '7-5', '7-6' ]

> s.analyses[0].bins['6-1'].length
242

```
There are 2373 sets and 145,297 points in the 958 Matches of the MCP Men's archive; 242 of those are '6-1' sets.

The module also keeps track of total shots processed:
```
> s.total_shots
682846
```

Use **minMax()** to find the minimum and maximum points-per-game (PPG), points-per-set (PPS), shots-per-game (SPG), and shots-per-set (SPS) for the entire distribution or an individual bin:

```
> atpMinMax = s.minMax(s.analyses[0].distribution)
> s.minMax(s.analyses[0].bins['6-1'])
```

Run the **parseArchive()** command for the MCP archive of Women's matches:

```
> p.parseArchive('charting-w-points', s.whenComplete)
Loading File:./cache/charting-w-points.csv
Please be patient if file is large...
Parsing CSV File...
115484 points loaded
Separating Matches...
852 matches
Matches Loaded
Parsing Shot Sequences...
=====================----------------------
852 Matches Successfully Parsed
Analysis Complete

> s.analyses[1].distribution.length
1934
```
There are 1934 sets and 115,484 points in the 852 Matches of the MCP Women's archive.
```
> s.total_shots
1244120
```
There is a total of 1,244,120 shots for all sets processed (includes men's and women's).

Use **minMax()** to find values for sets in women's matches:
```
> wtaMinMax = s.minMax(s.analyses[1].distribution)
```
You can then combine the set distributions for both Men and Women...
```
full_distribution = [];
full_distribution = full_distribution.concat(s.analyses[0].distribution);
full_distribution = full_distribution.concat(s.analyses[1].distribution);
```
...and find the min/max of the full distribution for all MCP matches:

```
> s.minMax(full_distribution)
```
The women dominate the stats, with two exceptions: minimum points per set and maximum shots per set:
```
min:
{ h2h: 'Hyeon Chung v. Liang Chi Huang',
  tournament: 'Kaohsiung',
  score: '6-0',
  PPS: 28 }

max:
{ h2h: 'Viktor Troicki v. Grigor Dimitrov',
 tournament: 'Sydney',
 score: '7-6',
 SPS: 878 }
```
Each distribution can then be saved for incorporation into an Exploding Box Plot... which will be the next published example.
```
> fs.writeFileSync('atp.dat', JSON.stringify({ "data": s.analyses[0].distribution }))
> fs.writeFileSync('wta.dat', JSON.stringify({ "data": s.analyses[1].distribution }))
> fs.writeFileSync('atp_wta.dat', JSON.stringify({ "data": full_distribution }))
> fs.writeFileSync('max_atp.dat', JSON.stringify(atpMinMax))
> fs.writeFileSync('max_wta.dat', JSON.stringify(wtaMinMax))
```
The exported files are included in the data directory for this example.
