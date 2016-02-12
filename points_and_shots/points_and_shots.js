var p = require('./mcpParse')();
var analyses = [];

function analyzeMatches(matches) {
   var max = {};
   max.ppg = { "PPG": 0 }; // maximum points per game
   max.spg = { "SPG": 0 }; // maximum shots per game
   max.pps = { "PPS": 0 }; // maximum points per set
   max.sps = { "SPS": 0 }; // maximum points per game

   var bins = { '6-0': [], '6-1': [], '6-2': [], '6-3': [], '6-4': [], '7-5': [], '7-6': [] };
   matches.forEach((m) => {
      var match = m.match;
      var tournament = m.tournament.name;
      var year = m.tournament.date.getFullYear();
      var sets = match.sets();
      var players = match.players();
      sets.forEach((s) => {
         var score = s.score() ? s.score().game_score.split('-').sort().reverse().join('-') : '';
         if (score && ['6-0', '6-1', '6-2', '6-3', '6-4', '7-5', '7-6'].indexOf(score) >= 0) {
            var games = s.games().length;
            var points = s.points().length;
            var shots = s.points().map(p => p.rally.length + 1).reduce((a, b) => (a+b));
            var ppg = (points / games).toFixed(2);
            var spg = (shots / games).toFixed(2);
            var h2h = players[0] + ' v. ' + players[1];
            bins[score].push({
                  "Set Score"    :  score,
                  "Total Points" :  points,
                  "Total Shots"  :  shots,
                  "PPG"          :  ppg,
                  "SPG"          :  spg,
                  "t"            :  h2h
            });

            if (ppg > max.ppg.PPG) max.ppg = { "h2h": h2h, "tournament": tournament, "score": score, "PPG": ppg };
            if (spg > max.spg.SPG) max.spg = { "h2h": h2h, "tournament": tournament, "score": score, "SPG": spg };

            if (points > max.pps.PPS) max.pps = { "h2h": h2h, "tournament": tournament, "score": score, "PPS": points };
            if (shots  > max.sps.SPS) max.sps = { "h2h": h2h, "tournament": tournament, "score": score, "SPS": shots  };
         }
      });
   })
   var distribution = [];
   var scores = Object.keys(bins);
   scores.forEach(function(s) { distribution = distribution.concat(bins[s]); });

   return { bins: bins, distribution: distribution, max_values: max };
}

function whenComplete(result) {

   if (result.matches) {
      analysis = analyzeMatches(result.matches);
      analyses.push(analysis);
      console.log('Analysis Complete');
   }
   
}

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

