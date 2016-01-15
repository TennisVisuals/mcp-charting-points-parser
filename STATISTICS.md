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

Produces the same stats you will find here: http://www.tennisabstract.com/charting/20151122-M-Tour_Finals-F-Roger_Federer-Novak_Djokovic.html
```
> p.st.baseStats(c)
{ '0':
   { AcePct: '10.17',
     DFPct: '3.39',
     FSPct: '66.10',
     PW1stPct: '69.23',
     PW2ndPct: '45.00',
     RPWPct: '30.36',
     BPSaved: '6/9',
     Winners: '19 (7/6)',
     UFE: '29 (11/16)' },
  '1':
   { AcePct: '7.14',
     DFPct: 0,
     FSPct: '67.86',
     PW1stPct: '63.16',
     PW2ndPct: '83.33',
     RPWPct: '38.98',
     BPSaved: '2/2',
     Winners: '15 (6/3)',
     UFE: '14 (7/7)' } }

> s1 = p.st.counters(match.sets()[0].points())
...

> p.st.baseStats(s1)
{ '0':
   { AcePct: '3.33',
     DFPct: '3.33',
     FSPct: '60.00',
     PW1stPct: '61.11',
     PW2ndPct: '50.00',
     RPWPct: '36.67',
     BPSaved: '2/4',
     Winners: '8 (4/3)',
     UFE: '18 (7/10)' },
  '1':
   { AcePct: '10.00',
     DFPct: 0,
     FSPct: '76.67',
     PW1stPct: '60.87',
     PW2ndPct: '71.43',
     RPWPct: '43.33',
     BPSaved: '2/2',
     Winners: '8 (1/2)',
     UFE: '11 (6/5)' } }
```
