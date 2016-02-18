module.exports = function() {

   // module container
   var snp = {};

   snp.analyses = [];
   snp.total_shots = 0;

   snp.analyzeMatches = analyzeMatches;
   function analyzeMatches(matches) {
      var bins = { '6-0': [], '6-1': [], '6-2': [], '6-3': [], '6-4': [], '7-5': [], '7-6': [] };
      matches.forEach((m) => {
         var match = m.match;
         var tournament = m.tournament.name;
         var year = m.tournament.date.getFullYear();
         var sets = match.sets();
         var players = match.players();
         var gid = (players.join('') + tournament + year).replace(/ /g,'');
         sets.forEach((s) => {
            var score = s.score() ? s.score().game_score.split('(')[0].split('-').sort().reverse().join('-') : '';
            if (score && ['6-0', '6-1', '6-2', '6-3', '6-4', '7-5', '7-6'].indexOf(score) >= 0) {
               var games = s.games().length;
               var points = s.points().length;
               var shots = s.points().map(p => p.rally.length + 1).reduce((a, b) => (a+b));
               snp.total_shots += shots;
               var ppg = (points / games).toFixed(2);
               var spg = (shots / games).toFixed(2);
               var h2h = players[0] + ' v. ' + players[1];
               bins[score].push({
                     "Set Score"    :  score,
                     "Total Points" :  points,
                     "Total Shots"  :  shots,
                     "PPG"          :  ppg,
                     "SPG"          :  spg,
                     "Tournament"   :  tournament,
                     "h2h"          :  h2h,
                     "gid"          :  gid
               });
            }
         });
      })
      var distribution = [];
      var scores = Object.keys(bins);
      scores.forEach(function(s) { distribution = distribution.concat(bins[s]); });

      return { bins: bins, distribution: distribution };
   }

   snp.whenComplete = whenComplete;
   function whenComplete(result) {

      if (result.matches) {
         analysis = analyzeMatches(result.matches);
         snp.analyses.push(analysis);
         console.log('Analysis Complete');
      }
      
   }

   snp.minMax = minMax;
   function minMax(bin) {
      var max = {};
      max.ppg = { "PPG": 0 }; // maximum points per game
      max.spg = { "SPG": 0 }; // maximum shots per game
      max.pps = { "PPS": 0 }; // maximum points per set
      max.sps = { "SPS": 0 }; // maximum points per game

      var min = {};
      min.ppg = { "PPG": undefined }; // min points per game
      min.spg = { "SPG": undefined }; // min shots per game
      min.pps = { "PPS": undefined }; // min points per set
      min.sps = { "SPS": undefined }; // min points per game

      bin.forEach((b) => {
         if (b.PPG > max.ppg.PPG) max.ppg = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "PPG": b.PPG 
         };
         if (b.SPG > max.spg.SPG) max.spg = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "SPG": b.SPG 
         };
         if (b['Total Points'] > max.pps.PPS) max.pps = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "PPS": b['Total Points'] 
         };
         if (b['Total Shots']  > max.sps.SPS) max.sps = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "SPS": b['Total Shots']  
         };

         if (b.PPG < min.ppg.PPG || !min.ppg.PPG) min.ppg = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "PPG": b.PPG 
         };
         if (b.SPG < min.spg.SPG || !min.spg.SPG) min.spg = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "SPG": b.SPG 
         };
         if (b['Total Points'] < min.pps.PPS || !min.pps.PPS) min.pps = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "PPS": b['Total Points'] 
         };
         if (b['Total Shots']  < min.sps.SPS || !min.sps.SPS) min.sps = { 
            "h2h": b.h2h, "tournament": b.Tournament, "score": b['Set Score'], "SPS": b['Total Shots']  
         };
      });
      return { min: min, max: max };
   }

   return snp;
}
