module.exports = function() {

   // module container
   var ipwl = {};

   ipwl.analyzeMatches = analyzeMatches;
   function analyzeMatches(matches) {
      var results = [];
      wlrs = [];
      matches.forEach((m) => {
         var match = m.match;
         var tournament = m.tournament.name;
         var gender = m.tournament.division;
         var year = m.tournament.date.getFullYear();
         var players = match.players();
         var gid = (players.join('') + tournament + year).replace(/ /g,'');
         var h2h = players[0] + ' v. ' + players[1];

         var points = inPlay(match.points());
         var winner = match.score().winner ? players.indexOf(match.score().winner) : undefined;

         var wlr = wlRatio(points);
         wlrs.push({ h2h: h2h, wlr: wlr });

         if (winner) {
            results.push({
               player   : players[0],
               outcome  : winner == 0 ? 'won' : 'lost',
               goutcome : winner == 0 ? (gender == 'M' ? 'M Won' : 'W Won') : (gender == 'M' ? 'M Lost' : 'W Lost'),
               h2h      : players[0] + ' v. ' + players[1],
               fwl      : wlr.f0,
               bwl      : wlr.b0,
               gid      : gid
            });

            results.push({
               player   : players[1],
               outcome  : winner == 1 ? 'won' : 'lost',
               goutcome : winner == 1 ? (gender == 'M' ? 'M Won' : 'W Won') : (gender == 'M' ? 'M Lost' : 'W Lost'),
               h2h      : players[1] + ' v. ' + players[0],
               fwl      : wlr.f1,
               bwl      : wlr.b1,
               gid      : gid
            });
         }
      })

      return results;
   }

   var inPlay = function(points) { return points.filter(f => f.rally ? f.rally.length > 1 : false) };
   var wonBy = function(points, winner) { return points.filter(f => f.winner == winner); }

   ipwl.handCount = handCount;
   var handCount = function(points, player) { 
      var f_count = 0;
      var b_count = 0;
      var total_shots = 0;
      var unknown = 0;
      points.forEach(p => {
         var shots = p.rally;
         total_shots += p.rally ? p.rally.length : 0;
         shots.forEach((s, i) => {
            var hand = findShot(s);
            if (['Forehand', 'Backhand'].indexOf(hand) >= 0) {
               if (p.server == player && (i % 2)) {
                  if (hand == 'Forehand') f_count += 1;
                  if (hand == 'Backhand') b_count += 1;
               } else if (p.server != player && !(i % 2)) {
                  if (hand == 'Forehand') f_count += 1;
                  if (hand == 'Backhand') b_count += 1;
               }
            } else {
               unknown += 1;
            }
         });
      });
      return { f: f_count, b: b_count, s: total_shots, u: unknown }
   }

   // all fh/bh shots for points won/lost
   ipwl.wlRatio = wlRatio;
   var wlRatio = function(points) {
      var hw0 = handCount(wonBy(points, 0), 0);
      var hw1 = handCount(wonBy(points, 1), 1);
      var hl0 = handCount(wonBy(points, 1), 0);
      var hl1 = handCount(wonBy(points, 0), 1);
      var ratios = {
         f0: +(hw0.f / hl0.f).toFixed(2),
         b0: +(hw0.b / hl0.b).toFixed(2),
         f1: +(hw1.f / hl1.f).toFixed(2),
         b1: +(hw1.b / hl1.b).toFixed(2)
      }
      return ratios;
   }

   // all shots in points ended by forehand/backhand
   var handedOutcome = function(points) {
      var wb0 = wonBy(points, 0);
      var wb1 = wonBy(points, 1);

      var wbf0 = wb0.filter(f => finalShotHand(f) == 'Forehand' && f.result == 'Winner');
      var wbf0s = wbf0.map(m => m.rally.length).reduce((a,b) => a + b);
      var wbb0 = wb0.filter(f => finalShotHand(f) == 'Backhand' && f.result == 'Winner');
      var wbb0s = wbb0.map(m => m.rally.length).reduce((a,b) => a + b);

      var lbf0 = wb1.filter(f => finalShotHand(f) == 'Forehand' && f.result ? f.result.indexOf('Error') >= 0 : false);
      var lbf0s = lbf0.map(m => m.rally.length).reduce((a,b) => a + b);
      var lbb0 = wb1.filter(f => finalShotHand(f) == 'Backhand' && f.result ? f.result.indexOf('Error') >= 0 : false);
      var lbb0s = lbb0.map(m => m.rally.length).reduce((a,b) => a + b);

      var wbf1 = wb1.filter(f => finalShotHand(f) == 'Forehand' && f.result == 'Winner');
      var wbf1s = wbf1.map(m => m.rally.length).reduce((a,b) => a + b);
      var wbb1 = wb1.filter(f => finalShotHand(f) == 'Backhand' && f.result == 'Winner');
      var wbb1s = wbb1.map(m => m.rally.length).reduce((a,b) => a + b);

      var lbf1 = wb0.filter(f => finalShotHand(f) == 'Forehand' && f.result ? f.result.indexOf('Error') >= 0 : false);
      var lbf1s = lbf1.map(m => m.rally.length).reduce((a,b) => a + b);
      var lbb1 = wb0.filter(f => finalShotHand(f) == 'Backhand' && f.result ? f.result.indexOf('Error') >= 0 : false);
      var lbb1s = lbb1.map(m => m.rally.length).reduce((a,b) => a + b);

      var ratios = {
         f0: +(wbf0s / lbf0s).toFixed(2),
         b0: +(wbf0s / lbf0s).toFixed(2),
         f1: +(wbf1s / lbf1s).toFixed(2),
         b1: +(wbb1s / lbb1s).toFixed(2)
      }

      return ratios;
   }

   function finalShotHand(point) {
      if (!point) return undefined;
      if (!point.rally) return 'Serve';
      return findShot(point.rally[point.rally.length - 1]);
   }

   function findShot(shot) {
      if (!shot) return false;
      var forehands = 'frvoulhj'.split('');
      var backhands = 'bszpymik'.split('');
      for (var d=0; d < forehands.length; d++) {
         if (shot.indexOf(forehands[d]) >= 0) return 'Forehand';
      }
      for (var d=0; d < backhands.length; d++) {
         if (shot.indexOf(backhands[d]) >= 0) return 'Backhand';
      }
      return 'Unknown';
   }

   return ipwl;
}
