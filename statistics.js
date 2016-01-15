module.exports = function() {

   // module container
   var statistics = {};

   statistics.counters = counters;
   function counters(points) {
      var stat_obj = {};
      for (var p=0; p < points.length; p++) {
         var point = points[p];
         increment('FirstServes', point.server);
         if (point.first_serve) increment('SecondServes', point.server);

         increment('Points', point.winner);
         if (point.server != point.winner) increment('ReturnPointsWon', 1 - point.server);

         if (point.result == 'Ace') increment('Ace', point.server);
         if (point.result == 'Serve Winner') increment('ServeWinners', point.server);
         if (point.result == 'Double Fault') increment('DoubleFaults', point.server);

         if (point.result == 'Winner') increment('Winners', point.winner);
         if (point.result == 'Forced Error') increment('ForcedErrors', 1 - point.winner);
         if (point.result == 'Unforced Error') increment('UnforcedErrors', 1 - point.winner);

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

   return statistics;
}
