module.exports = function() {

   // module container
   var statistics = {};

   statistics.counters = counters;
   function counters(points) {
      var stat_obj = {};
      for (var p=0; p < points.length; p++) {
         var point = points[p];
         var hand  = finalShotHand(point);

         increment('FirstServes', point.server);
         if (point.first_serve) increment('SecondServes', point.server);

         increment('Points', point.winner);
         if (point.server != point.winner) increment('ReturnPointsWon', 1 - point.server);
         if (point.server != point.winner && !point.first_serve) increment('RPW1stServe', 1 - point.server);
         if (point.server != point.winner &&  point.first_serve) increment('RPW2ndServe', 1 - point.server);

         if (point.server == point.winner && !point.first_serve) increment('PointsWon1stServe', point.server);
         if (point.server == point.winner &&  point.first_serve) increment('PointsWon2ndServe', point.server);

         if (point.result == 'Ace') increment('Aces', point.server);
         if (point.result == 'Serve Winner') increment('ServeWinners', point.server);
         if (point.result == 'Double Fault') increment('DoubleFaults', point.server);

         if (point.result == 'Winner') increment('Winners', point.winner);
         if (point.result == 'Winner' && hand == 'Forehand') increment('ForehandWinners', point.winner);
         if (point.result == 'Winner' && hand == 'Backhand') increment('BackhandWinners', point.winner);

         if (point.result == 'Forced Error') increment('ForcedErrors', 1 - point.winner);
         if (point.result == 'Forced Error' && hand == 'Forehand')   increment('ForehandFE', 1 - point.winner);
         if (point.result == 'Forced Error' && hand == 'Backhand')   increment('BackhandFE', 1 - point.winner);

         if (point.result == 'Unforced Error') increment('UnforcedErrors', 1 - point.winner);
         if (point.result == 'Unforced Error' && hand == 'Forehand') increment('ForehandUFE', 1 - point.winner);
         if (point.result == 'Unforced Error' && hand == 'Backhand') increment('BackhandUFE', 1 - point.winner);

         if (point.breakpoint != undefined) increment('Breakpoints', point.breakpoint);
         if (point.point.indexOf('G') >= 0 && point.winner != point.server) increment('BreakpointConversions', 1 - point.server);
         if (point.point.indexOf('G') >= 0 && point.winner == point.server) increment('GamepointConversions', point.server);
         if (point.point.indexOf('G') >= 0) increment('Games', point.winner);
      }
      return stat_obj;

      function increment(what, who) {
         if (stat_obj[what]) {
            if (stat_obj[what][who]) {
               stat_obj[what][who] += 1;
            } else {
               stat_obj[what][who] = 1;
            }
         } else {
            stat_obj[what] = [];
            stat_obj[what][who] = 1;
         }
      }
   }

   statistics.baseStats = baseStats;
   function baseStats(c) {
      var player_stats = { 0: {}, 1: {} };
      for (var p=0; p < 2; p++) {
         player_stats[p].AcePct    = (c.Aces && c.FirstServes) ?
                                     cpct(c.Aces[p], c.FirstServes[p]) : undefined;
         player_stats[p].DFPct     = (c.DoubleFaults && c.FirstServes) ?
                                     cpct(c.DoubleFaults[p], c.FirstServes[p]) : undefined;
         player_stats[p].FSPct     = (c.FirstServes && c.SecondServes) ?
                                     cpct(c.FirstServes[p] - c.SecondServes[p], c.FirstServes[p]) : undefined;
         player_stats[p].PW1stPct  = (c.FirstServes && c.PointsWon1stServe) ?
                                     cpct(c.PointsWon1stServe[p], c.FirstServes[p] - c.SecondServes[p]) : undefined;
         player_stats[p].PW2ndPct  = (c.SecondServes && c.PointsWon2ndServe) ?
                                     cpct(c.PointsWon2ndServe[p], c.SecondServes[p]) : undefined;
         player_stats[p].RPWPct    = (c.ReturnPointsWon && c.FirstServes) ?
                                     cpct(c.ReturnPointsWon[p], c.FirstServes[1 - p]) : undefined;

         var opp_bpts              = c.Breakpoints     ? c.Breakpoints[1 - p] ? c.Breakpoints[1 - p] : 0 : 0;
         var opp_bpt_conv          = c.BreakpointConversions ? c.BreakpointConversions[1 - p] ? c.BreakpointConversions[1 - p] : 0 : 0;
         player_stats[p].BPSaved   = (opp_bpts - opp_bpt_conv) + '/' + opp_bpts;

         var winners               = c.Winners         ? c.Winners[p]         ? c.Winners[p]         : 0 : 0;
         var forehand_winners      = c.ForehandWinners ? c.ForehandWinners[p] ? c.ForehandWinners[p] : 0 : 0;
         var backhand_winners      = c.BackhandWinners ? c.BackhandWinners[p] ? c.BackhandWinners[p] : 0 : 0;
         var aces                  = c.Aces            ? c.Aces[p]            ? c.Aces[p]            : 0 : 0;
         var serve_winners         = c.ServeWinners    ? c.ServeWinners[p]    ? c.ServeWinners[p]    : 0 : 0;
         player_stats[p].Winners   = winners + aces + serve_winners + ' (' + forehand_winners + '/' + backhand_winners + ')';

         var unforced_errors       = c.UnforcedErrors  ? c.UnforcedErrors[p]  ? c.UnforcedErrors[p]  : 0 : 0;
         var forehand_ufe          = c.ForehandUFE     ? c.ForehandUFE[p]     ? c.ForehandUFE[p]     : 0 : 0;
         var backhand_ufe          = c.BackhandUFE     ? c.BackhandUFE[p]     ? c.BackhandUFE[p]     : 0 : 0;
         var double_faults         = c.DoubleFaults    ? c.DoubleFaults[p]    ? c.DoubleFaults[p]    : 0 : 0;
         player_stats[p].UFE       = unforced_errors + double_faults + ' (' + forehand_ufe + '/' + backhand_ufe + ')';
      }
      return player_stats;

      function cpct(count, total) { 
         if (!total || !count) return 0;
         return (count / total * 100).toFixed(2); 
      }

   }

   statistics.serveStats = serveStats;
   function serveStats(c) {
      var player_stats = { 0: {}, 1: {} };
      for (var p=0; p < 2; p++) {
      }
      return player_stats;
   }

   // temporary workaround until universal method contrived
   function finalShotHand(point) {
      if (!point) return undefined;
      if (!point.rally) return 'Serve';

      return findShot(point.rally[point.rally.length - 1]);

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

   }

   return statistics;
}
