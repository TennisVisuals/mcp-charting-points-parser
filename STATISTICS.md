# UMO Stats
### Statistics Package for Universal Match object

The statistics package is a work in progress.

Please view the README file for details on installing the mcp-charting-points-parser.  These notes assume familiarity.

**counters()** reduces raw point data into numbers from which statistics can be calculated.
```
> c = p.st.counters(match.points())
{ FirstServes: [ 59, 56 ],
  SecondServes: [ 20, 18 ],
  Points: [ 53, 62 ],
  ReturnPointsWon: [ 17, 23 ],
  UnforcedErrors: [ 27, 14 ],
  Winners: [ 13, 9 ],
  Breakpoints: [ 2, 9 ],
  ForcedErrors: [ 18, 20 ],
  GamepointConversions: [ 7, 9 ],
  Games: [ 7, 12 ],
  ServeWinners: [ , 2 ],
  BreakpointConversions: [ , 3 ],
  Ace: [ 6, 4 ],
  DoubleFaults: [ 2 ] }
```
**baseStats()** converts counters into Overview stats for an arbitrary collection of points.  Use the *sets* accessor on the match object to retrieve points for a single set.
```
> p.st.baseStats(c)
{ '0': { AcePct: '10.17' }, '1': { AcePct: '7.14' } }
...

> s1 = p.st.counters(match.sets()[0].points())
...

> p.st.baseStats(s1)
{ '0': { AcePct: '3.33' }, '1': { AcePct: '10.00' } }
...
```
