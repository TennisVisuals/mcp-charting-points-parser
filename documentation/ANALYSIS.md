# mcp-charting-points-parser
## Analysis Module

Analysis functions are a work in progress. These function are provided as templates and to spur your creativity in exploring match data.

Please view the README file for details on installing the mcp-charting-points-parser.  These notes assume familiarity.

```
> a = p.analysis
```

**rallyDepth()** counts the number of points in a match which have a return of service, and differentiates returns which finish a point and returns which include an indication of the depth of the return. In the example below there are three "return-other" shots; these are returns of service which have no depth information and do not finish the point.

```

> a.rallyDepth(match.points())
{ points: 115,
  returns: 101,
  return_finish: 22,
  return_depth: 79,
  return_other: [ 'b3' ],
  shots: 432,
  rally_depth: 0 }
```
**matchWithRallyDepth()** runs **rallyDepth()** for an array of matches and gives an aggregate result.  It is useful for identifying matches where depth information is given for rally shots other than return of service.

Of all MCP women's matches, 31 have a total of 33 rally shots with depth information (but 9 of these are due to an invalid serve code pushing return-of-service to the second rally shot). Of all MCP men's matches, 35 have a total of 177 rally shots with depth information (but 12 of these are due to an invalid serve code pushing return-of-service to the second rally shot).

```
> a.matchesWithRallyDepth(p.matches)
{ rally_shots: 1640, rally_depth: 0, matches: [] }
```
**serveAnalysis()** counts the number of different types of serves charted for a given match while noting instances of invalid serve codes and cases where more than one serve were entered in the same shot sequence.
```
> a.serveAnalysis(match.points())
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
  invalid_serves: 0,
  multiple_serves: 0 }
```
**matchesServeAnalysis()** runs **serveAnalysis** for an array of matches and gives an aggregate result.

According to the MCP data, the most common serve for women is a 'Body' serve, while the most common serve for men is 'Out Wide'; women make 'down-the-T' aces about 1.27 times as often as 'out-wide' aces, while men make 'down-the-T' aces about 1.18 times as often as 'out-wide' aces.

There have been 538 invalid serves coded for women's matches (1.41/match) and 983 invalid serves coded for men's matches (1.14/match). Multiple serves are sometimes coded as part of the same shot sequence; this happened 6 times for men's matches.
```
> a.matchesServeAnalysis(p.matches)
...
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
