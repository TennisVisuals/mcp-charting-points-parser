# Shot Sequence Notes
#### Observations after parsing 230,000+ MCP Shot Sequences

Here are some lessons learned from the creation of the mcp-charting-points-parser

Check out the **instructions** tab in MCP spreadsheet (**MatchChart.xlsm**) for more information on shot sequence coding: https://github.com/JeffSackmann/tennis_MatchChartingProject

Only terminators (*, #, @) and (S, R, Q, P) end a shot sequence
  - shot sequences without a terminator are *always* awarded to the receiver
    - error codes are irrelevant for determining the winner of a point
    - '6f1b3b1n' will award a point to receiver, even though receiver is coded as hitting a backhand into the net
  - shot sequences occurring after a terminator are ignored
  - if there are multiple terminators, the last terminator defines the point winner

The first stroke in a sequence is *always* the server
  - If a serve is omitted then there will be no Return of Service shot
  - '0' (zero) should always be used when the direction of serve is unknown

Stand-alone error codes are counted as shots

Coding multiple serves in a single serve cell results in the point *always* being awarded to the server
