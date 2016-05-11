module.exports = function() {

   // module container
   var ipwl = {};

   ipwl.analyzeMatches = analyzeMatches;
   function analyzeMatches(matches) {
      var winloss = [];
      var dominance = [];
      var wlrMatches = [];
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
         if (winner == 1) score = reverseScore(score);

         var wlr = wlRatio(points);
         var we = winerr(points);

         if (winner != undefined) {
            var h2h = match.score().winner + ' def. ' + match.score().loser;
            winloss.push({
               player      : players[0],
               outcome     : winner == 0 ? 'won' : 'lost',
               gender      : gender == 'M' ? 'ATP' : 'WTA',
               goutcome    : winner == 0 ? (gender == 'M' ? 'M Won' : 'W Won') : (gender == 'M' ? 'M Lost' : 'W Lost'),
               score       : score,
               tournament  : tournament,
               round       : round,
               year        : year,
               h2h         : h2h,
               fwl         : wlr.f0,
               bwl         : wlr.b0,
               gid         : gid
            });

            winloss.push({
               player      : players[1],
               outcome     : winner == 1 ? 'won' : 'lost',
               gender      : gender == 'M' ? 'ATP' : 'WTA',
               goutcome    : winner == 1 ? (gender == 'M' ? 'M Won' : 'W Won') : (gender == 'M' ? 'M Lost' : 'W Lost'),
               score       : score,
               tournament  : tournament,
               round       : round,
               year        : year,
               h2h         : h2h,
               fwl         : wlr.f1,
               bwl         : wlr.b1,
               gid         : gid
            });

            var wlr_fb0 = (wlr.f0 / wlr.b0).toFixed(2);
            var wlr_fb1 = (wlr.f1 / wlr.b1).toFixed(2);
            wlrMatches.push({
               h2h         : h2h,
               score       : score,
               tournament  : tournament,
               round       : round,
               year        : year,
               winner      : match.score().winner,
               loser       : match.score().loser,
               gender      : gender == 'M' ? 'ATP' : 'WTA',
               winner_fbr  : winner == 0 ? wlr_fb0 : wlr_fb1,
               loser_fbr   : winner == 0 ? wlr_fb1 : wlr_fb0,
               gid         : gid
            });

            dominance.push({
               player      : match.score().winner,
               outcome     : 'won',
               gender      : gender == 'M' ? 'ATP' : 'WTA',
               h2h         : h2h,
               score       : score,
               tournament  : tournament,
               round       : round,
               year        : year,
               win_w2ufe   : we[winner].w2ufe,
               win_tw2ufe  : we[winner].tw2ufe,
               win_w2te    : we[winner].w2te,
               domF        : we[winner].domF,
               domB        : we[winner].domB,
               gid         : gid
            });

            dominance.push({
               player      : match.score().loser,
               outcome     : 'lost',
               gender      : gender == 'M' ? 'ATP' : 'WTA',
               h2h         : h2h,
               score       : score,
               tournament  : tournament,
               round       : round,
               year        : year,
               los_w2ufe   : we[1 - winner].w2ufe,
               los_tw2ufe  : we[1 - winner].tw2ufe,
               los_w2te    : we[1 - winner].w2te,
               domF        : we[1 - winner].domF,
               domB        : we[1 - winner].domB,
               gid         : gid
            });
         }
      })

      return { wlratio: winloss, dominance: dominance, wlrMatches: wlrMatches };
   }

   // excludes points ending in Ace, Serve Winner or Double Fault
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

   // recreates calculations from Nikita Taparia's article on "Point Enders"
   // https://medium.com/the-tennis-notebook/tennis-note-32-90984d2d9386
   function winerr(points) {
      // points "Won By" each player
      var wb0 = wonBy(points, 0);
      var wb1 = wonBy(points, 1);

      // "Winners" on forehand / backhand
      var wbf0 = wb0.filter(f => finalShotHand(f) == 'Forehand' && f.result == 'Winner');
      var wbb0 = wb0.filter(f => finalShotHand(f) == 'Backhand' && f.result == 'Winner');
      var wbf1 = wb1.filter(f => finalShotHand(f) == 'Forehand' && f.result == 'Winner');
      var wbb1 = wb1.filter(f => finalShotHand(f) == 'Backhand' && f.result == 'Winner');

      // "Double Faults"
      var df0 = wb1.filter(f => (f.result.indexOf('Double Fault') >= 0))
      var df1 = wb0.filter(f => (f.result.indexOf('Double Fault') >= 0))

      // "Unforced Errors" 
      var ue0 = wb1.filter(f => (f.result.indexOf('Unforced Error') >= 0))
      var ue1 = wb0.filter(f => (f.result.indexOf('Unforced Error') >= 0))

      // points lost by "Unforced Error" on forehand / backhand
      var lbfue0 = ue0.filter(f => finalShotHand(f) == 'Forehand').length
      var lbbue0 = ue0.filter(f => finalShotHand(f) == 'Backhand').length
      var lbfue1 = ue1.filter(f => finalShotHand(f) == 'Forehand').length
      var lbbue1 = ue1.filter(f => finalShotHand(f) == 'Backhand').length

      // "Forced Errors"
      var fe0 = wb1.filter(f => (f.result.indexOf('Forced Error') >= 0 && f.rally.length > 1))
      var fe1 = wb0.filter(f => (f.result.indexOf('Forced Error') >= 0 && f.rally.length > 1))

      // points lost by "Forced Errors" on forehand / backhand
      var lbffe0 = fe0.filter(f => finalShotHand(f) == 'Forehand')
      var lbbfe0 = fe0.filter(f => finalShotHand(f) == 'Backhand')
      var lbffe1 = fe1.filter(f => finalShotHand(f) == 'Forehand')
      var lbbfe1 = fe1.filter(f => finalShotHand(f) == 'Backhand')

      // forehand /backhand shots that "Induced a Forced Error"
      var fci0 = fe1;
      var fcif0 = fci0.filter(f => findShot(f.rally[f.rally.length - 2]) == 'Forehand');
      var fcib0 = fci0.filter(f => findShot(f.rally[f.rally.length - 2]) == 'Backhand');
      var fci1 = fe0;
      var fcif1 = fci1.filter(f => findShot(f.rally[f.rally.length - 2]) == 'Forehand');
      var fcib1 = fci1.filter(f => findShot(f.rally[f.rally.length - 2]) == 'Backhand');

      // total points ended by player shots
      // "Induced a Forced Error" shots are deemed to have ended the point
      // not the final "Forced Error"
      var pte0 = wbf0.length + wbb0.length + ue0.length + fci0.length;
      var pte1 = wbf1.length + wbb1.length + ue1.length + fci1.length;

      // Ratio of Winners to Unforced Errors
      var w2ufe0 = ((wbf0.length + wbb0.length) / ue0.length).toFixed(2);
      var w2ufe1 = ((wbf1.length + wbb1.length) / ue1.length).toFixed(2);

      // Ratio of "Total Winners" to "Unforced Errors"
      // "Total Winners" includes "Winners" and shots "Inducing Forced Errors"
      var tw2ufe0 = ((wbf0.length + wbb0.length + fci0.length) / ue0.length).toFixed(2);
      var tw2ufe1 = ((wbf1.length + wbb1.length + fci1.length) / ue1.length).toFixed(2);

      // Ratio of "Winners" to "Total Errors"
      // "Total Errors" includes "Unforced Errors" and "Forced Errors"
      var w2te0 = ((wbf0.length + wbb0.length) / (ue0.length + fe0.length)).toFixed(2); 
      var w2te1 = ((wbf1.length + wbb1.length) / (ue1.length + fe1.length)).toFixed(2); 

      // Total Shots for forehand / backhand for each player
      var hc0 = handCount(points, 0);
      var hc1 = handCount(points, 1);

      // Dominance Calculation for forehand / backhand for each player
      var domF0 = ((wbf0.length + fcif0.length - lbffe0.length) / hc0.f).toFixed(2);
      var domB0 = ((wbb0.length + fcib0.length - lbbfe0.length) / hc0.b).toFixed(2);
      var domF1 = ((wbf1.length + fcif1.length - lbffe1.length) / hc1.f).toFixed(2);
      var domB1 = ((wbb1.length + fcib1.length - lbbfe1.length) / hc1.b).toFixed(2);

      return { 
         0: { w2ufe: w2ufe0, tw2ufe: tw2ufe0, w2te: w2te0, domF: domF0, domB: domB0 },
         1: { w2ufe: w2ufe1, tw2ufe: tw2ufe1, w2te: w2te1, domF: domF1, domB: domB1 }
      }
   }

   function reverseScore(score) {
      var reversed_scores = score.split(',').map(s => {
         s = s.trim();
         var tbscore = s.split('(');
         if (tbscore.length > 1) {
            return tbscore[0].split('-').reverse().join('-') + '(' + tbscore[1];
         } else {
            return s.split('-').reverse().join('-');
         }
      });
      return reversed_scores.join(', ');
   }

   return ipwl;
}
