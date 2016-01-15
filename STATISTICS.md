# UMO Stats
### Statistics Package for Universal Match object

The statistics package is a work in progress.

Please view the README file for details on installing the mcp-charting-points-parser.  These notes assume familiarity.

**counters()** reduces the raw data into numbers from which statistics can be calculated.

```
> p.st.counters(match.points())
{ Serves: [ 59, 56 ],
  Points: [ 53, 62 ],
  UnforcedErrors: [ 27, 14 ],
  Breakpoints: [ 2, 9 ],
  ForcedErrors: [ 18, 20 ],
  GamepointConversions: [ 7, 9 ],
  Games: [ 7, 12 ],
  ServeWinners: [ , 2 ],
  BreakpointConversions: [ , 3 ],
  Ace: [ 6, 4 ],
  DoubleFaults: [ 2 ] }
```
