module.exports = function() {

   // module container
   var ipwl = {};

   ipwl.analyzeMatches = analyzeMatches;
   function analyzeMatches(matches) {
      var results = [];
      var emptyfull = [];
      matches.forEach((m) => {
         var match = m.match;
         var score = match.score().match_score;
         var tournament = m.tournament.name;
         var round = m.tournament.round;
         var gender = m.tournament.division;
         var year = m.tournament.date.getFullYear();
         var players = match.players();
         var gid = (players.join('') + tournament + year).replace(/ /g,'');

         var points = inPlay(match.points());
         var winner = match.score().winner ? players.indexOf(match.score().winner) : undefined;

         var wlr = wlRatio(points);
         var we = winerr(points);

         if (winner != undefined) {
            var h2h = match.score().winner + ' def. ' + match.score().loser;
            results.push({
               player   : players[0],
               outcome  : winner == 0 ? 'won' : 'lost',
               gender   : gender == 'M' ? 'ATP' : 'WTA',
               goutcome : winner == 0 ? (gender == 'M' ? 'M Won' : 'W Won') : (gender == 'M' ? 'M Lost' : 'W Lost'),
               score    : score,
               tournament: tournament,
               round    : round,
               year     : year,
               h2h      : h2h,
               fwl      : wlr.f0,
               bwl      : wlr.b0,
               gid      : gid
            });

            results.push({
               player   : players[1],
               outcome  : winner == 1 ? 'won' : 'lost',
               gender   : gender == 'M' ? 'ATP' : 'WTA',
               goutcome : winner == 1 ? (gender == 'M' ? 'M Won' : 'W Won') : (gender == 'M' ? 'M Lost' : 'W Lost'),
               score    : score,
               tournament: tournament,
               round    : round,
               year     : year,
               h2h      : h2h,
               fwl      : wlr.f1,
               bwl      : wlr.b1,
               gid      : gid
            });

            emptyfull.push({
               gender      : gender == 'M' ? 'ATP' : 'WTA',
               score       : score,
               tournament  : tournament,
               round       : round,
               year        : year,
               h2h         : h2h,
               winner      : match.score().winner,
               loser       : match.score().loser,
               win_w2ufe   : we[winner].w2ufe,
               win_tw2ufe  : we[winner].tw2ufe,
               win_w2te    : we[winner].w2te,
               los_w2ufe   : we[1 - winner].w2ufe,
               los_tw2ufe  : we[1 - winner].tw2ufe,
               los_w2te    : we[1 - winner].w2te,
            });
         }
      })

      return { wlratio: results, emptyfull: emptyfull };
   }

   // var inPlay = function(points) { return points.filter(f => f.rally ? f.rally.length > 1 : false) };
   var inPlay = function(points) { 
      return points.filter(f => f.rally ? (f.rally.length > 1 || (f.result && f.rally.length == 1 && f.result.indexOf('Forced Error') != 0)) : false) 
   };
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

   function winerr(points) {
      // reproduction of Winners FH/BH stat
      var wb0 = wonBy(points, 0);
      var wbf0 = wb0.filter(f => finalShotHand(f) == 'Forehand' && f.result == 'Winner');
      var wbb0 = wb0.filter(f => finalShotHand(f) == 'Backhand' && f.result == 'Winner');
      var wb1 = wonBy(points, 1);
      var wbf1 = wb1.filter(f => finalShotHand(f) == 'Forehand' && f.result == 'Winner');
      var wbb1 = wb1.filter(f => finalShotHand(f) == 'Backhand' && f.result == 'Winner');

      // reproduction of UFE stat
      var ue0 = wb1.filter(f => (f.result.indexOf('Unforced Error') >= 0))
      var df0 = wb1.filter(f => (f.result.indexOf('Double Fault') >= 0))
      var ue1 = wb0.filter(f => (f.result.indexOf('Unforced Error') >= 0))
      var df1 = wb0.filter(f => (f.result.indexOf('Double Fault') >= 0))
      var lbfue0 = ue0.filter(f => finalShotHand(f) == 'Forehand').length
      var lbbue0 = ue0.filter(f => finalShotHand(f) == 'Backhand').length
      var lbfue1 = ue1.filter(f => finalShotHand(f) == 'Forehand').length
      var lbbue1 = ue1.filter(f => finalShotHand(f) == 'Backhand').length

      var fe0 = wb1.filter(f => (f.result.indexOf('Forced Error') >= 0 && f.rally.length > 1))
      var fe1 = wb0.filter(f => (f.result.indexOf('Forced Error') >= 0 && f.rally.length > 1))
      var lbffe0 = fe0.filter(f => finalShotHand(f) == 'Forehand')
      var lbbfe0 = fe0.filter(f => finalShotHand(f) == 'Backhand')
      var lbffe1 = fe1.filter(f => finalShotHand(f) == 'Forehand')
      var lbbfe1 = fe1.filter(f => finalShotHand(f) == 'Backhand')

      var pte0 = wbf0.length + wbb0.length + ue0.length + fe0.length;
      var pte1 = wbf1.length + wbb1.length + ue1.length + fe1.length;

      var w2ufe0 = ((wbf0.length + wbb0.length) / ue0.length).toFixed(2);
      var w2ufe1 = ((wbf1.length + wbb1.length) / ue1.length).toFixed(2);
      var tw2ufe0 = ((wbf0.length + wbb0.length + fe1.length) / ue0.length).toFixed(2);
      var tw2ufe1 = ((wbf1.length + wbb1.length + fe0.length) / ue1.length).toFixed(2);
      var w2te0 = ((wbf0.length + wbb0.length) / (ue0.length + fe0.length)).toFixed(2); 
      var w2te1 = ((wbf1.length + wbb1.length) / (ue1.length + fe1.length)).toFixed(2); 

      return { 
         0: { w2ufe: w2ufe0, tw2ufe: tw2ufe0, w2te: w2te0 },
         1: { w2ufe: w2ufe1, tw2ufe: tw2ufe1, w2te: w2te1 }
      }
   }

   return ipwl;
}
