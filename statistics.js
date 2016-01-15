module.exports = function() {

   // module container
   var statistics = {};

   statistics.counters = counters;
   function counters(points) {
      var stat_obj = {};
      for (var p=0; p < points.length; p++) {
         var point = points[p];
         var hand  = finalShotHand(point);
         var serve_directions = serveDirections(point);

         increment('FirstServes', point.server);
         if (point.first_serve) increment('SecondServes', point.server);

         if (!point.first_serve) {
            if (serve_directions.first  == 'Wide') increment('FirstServesWide',  point.server);
            if (serve_directions.first  == 'Body') increment('FirstServesBody',  point.server);
            if (serve_directions.first  == 'T')    increment('FirstServesT',     point.server);
         } else {
            if (serve_directions.second == 'Wide') increment('SecondServesWide', point.server);
            if (serve_directions.second == 'Body') increment('SecondServesBody', point.server);
            if (serve_directions.second == 'T')    increment('SecondServesT',    point.server);
         }

         increment('Points', point.winner);
         if (point.server == point.winner) increment('ServePointsWon', point.server);
         if (point.server == point.winner && !point.first_serve) increment('ServePointsWon1st', point.server);
         if (point.server == point.winner &&  point.first_serve) increment('ServePointsWon2nd', point.server);

         if (point.server != point.winner) increment('ReturnPointsWon', 1 - point.server);
         if (point.server != point.winner && !point.first_serve) increment('ReturnPointsWon1st', 1 - point.server);
         if (point.server != point.winner &&  point.first_serve) increment('ReturnPointsWon2nd', 1 - point.server);

         if (point.server == point.winner && !point.first_serve) increment('PointsWon1stServe', point.server);
         if (point.server == point.winner &&  point.first_serve) increment('PointsWon2ndServe', point.server);

         if (point.result == 'Ace') increment('Aces', point.server);
         if (point.result == 'Serve Winner') increment('ServeWinners', point.server);
         if (point.result == 'Double Fault') increment('DoubleFaults', point.server);

         if (point.result == 'Winner') increment('Winners', point.winner);
         if (point.result == 'Winner' && hand == 'Forehand') increment('ForehandWinners', point.winner);
         if (point.result == 'Winner' && hand == 'Backhand') increment('BackhandWinners', point.winner);

         if (point.result == 'Forced Error') increment('ForcedErrors', 1 - point.winner);
         if (point.result == 'Forced Error' && hand == 'Forehand')   increment('ForehandForcedErrors', 1 - point.winner);
         if (point.result == 'Forced Error' && hand == 'Backhand')   increment('BackhandForcedErrors', 1 - point.winner);

         if (point.result == 'Unforced Error') increment('UnforcedErrors', 1 - point.winner);
         if (point.result == 'Unforced Error' && hand == 'Forehand') increment('ForehandUnforcedErrors', 1 - point.winner);
         if (point.result == 'Unforced Error' && hand == 'Backhand') increment('BackhandUnforcedErrors', 1 - point.winner);

         if ( point.rally && point.rally.length && 
               ((point.rally.length == 1 && 
                 point.result != 'Unforced Error' && 
                 point.result != 'Forced Error') ||
                (point.rally.length > 1)) ) {
                   if (point.first_serve) {
                      increment('RIP2nd', 1 - point.server);
                   } else {
                      increment('RIP1st', 1 - point.server);
                   }
         }

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
      var ps = { 0: {}, 1: {} };
      for (var p=0; p < 2; p++) {

         ps[p].PctFirstServe       = (c.FirstServes && c.SecondServes) ?
                                     cpct(c.FirstServes[p] - c.SecondServes[p], c.FirstServes[p]) : 
                                     undefined;

         ps[p].PctPointsWon1st     = (c.PointsWon1stServe && c.FirstServes) ?
                                     cpct(c.PointsWon1stServe[p], c.FirstServes[p] - c.SecondServes[p]) : 
                                     undefined;

         ps[p].PctAces             = validPct(c.Aces, c.FirstServes, p);
         ps[p].PctDoubleFaults     = validPct(c.DoubleFaults, c.FirstServes, p);
         ps[p].PctPointsWon2nd     = validPct(c.PointsWon2ndServe, c.SecondServes, p);
         ps[p].PctReturnPointsWon  = validPct(c.ReturnPointsWon, c.FirstServes, p, 1 - p);

         var opp_breakpoints       = validValue(c.Breakpoints, 1 - p);
         var opp_bpt_conv          = validValue(c.BreakpointConversions, 1 - p);
         ps[p].BreakpointsSaved    = opp_breakpoints - opp_bpt_conv;
         ps[p].BreakpointsFaced    = opp_breakpoints;

         var winners               = validValue(c.Winners, p);
         var aces                  = validValue(c.Aces, p);
         var serve_winners         = validValue(c.ServeWinners, p);
         ps[p].Winners             = winners + aces + serve_winners;

         var unforced_errors       = validValue(c.UnforcedErrors, p);
         var double_faults         = validValue(c.DoubleFaults, p);
         ps[p].UnforcedErrors      = unforced_errors + double_faults;

         var rip_1st               = validValue(c.RIP1st, p);
         var rip_2nd               = validValue(c.RIP2nd, p);
         var opp_total_serves      = validValue(c.FirstServes, 1 - p);
         var opp_2nd_serves        = validValue(c.SecondServes, 1 - p);
         var opp_double_faults     = validValue(c.DoubleFaults, 1 - p);
         var opp_2nd_serves_in     = opp_2nd_serves - opp_double_faults;
         var opp_1st_serves_in     = opp_total_serves - opp_2nd_serves;
         ps[p].PctReturnsInPlay    = cpct(rip_1st + rip_2nd, opp_1st_serves_in + opp_2nd_serves_in);
         ps[p].PctReturnsInPlay1st = cpct(rip_1st, opp_1st_serves_in);
         ps[p].PctReturnsInPlay2nd = cpct(rip_2nd, opp_2nd_serves_in);

         function validValue(value, player) { 
            return value ? value[player] ? value[player] : 0 : 0; 
         }

         function validPct(value1, value2, player1, player2) {
            return (value1 && value2) ? 
                   cpct(value1[player1], value2[player2 != undefined ? player2 : player1]) : 
                   undefined;
         }

      }
      return ps;

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

   function serveDirections(point) {
      if (!point) return false;
      var first_serve_direction = 'Unknown';
      var second_serve_direction;
      var directions = { 0: 'Unknown', 4: 'Wide', 5: 'Body', 6: 'T' };
      if (point.serves && point.serves.length) {
         var direction = serveDirection(point.serves[point.serves.length - 1]);
         if (direction && !point.first_serve) {
            first_serve_direction = directions[direction];
         } else {
            second_serve_direction = directions[direction];
         }
      }

      if (point.first_serve && point.first_serve.serves && point.first_serve.serves.length) {
         var direction = serveDirection(point.first_serve.serves[point.first_serve.serves.length - 1]);
         if (direction) first_serve_direction = directions[direction];
      }

      var serve_directions = { first: first_serve_direction };
      if (second_serve_direction) serve_directions.second = second_serve_direction;

      return serve_directions;

      function serveDirection(shot) {
         if (!shot) return false;
         var directions = '0456'.split('');
         for (var d=0; d < directions.length; d++) {
            if (shot.indexOf(directions[d]) >= 0) return directions[d];
         }
         return 0;
      }
   }

   return statistics;
}
