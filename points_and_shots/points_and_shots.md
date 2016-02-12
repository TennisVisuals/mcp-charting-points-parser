# Points and Shots
### Tutorial
##### Using mcpParse.js to analyze all points and shots in the MCP Repository

```
full_distribution = [];
p.parseArchive('charting-m-points', whenComplete)

fs.writeFileSync('atp.dat', JSON.stringify({ "data": analysis.distribution }))
fs.writeFileSync('max_atp.dat', JSON.stringify(analysis.max_values))

full_distribution = full_distribution.concat(analysis.distribution);

p.parseArchive('charting-w-points', whenComplete)

fs.writeFileSync('wta.dat', JSON.stringify({ "data": analysis.distribution }))
fs.writeFileSync('max_wta.dat', JSON.stringify(analysis.max_values))
full_distribution = full_distribution.concat(analysis.distribution);

fs.writeFileSync('atp_wta.dat', JSON.stringify({ "data": full_distribution }))
```
