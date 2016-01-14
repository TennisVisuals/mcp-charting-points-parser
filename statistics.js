module.exports = function() {

   // module container
   var statistics = {};

   statistics.counters = counters;
   function counters(points) {
      var stat_obj = {};
      for (var p=0; p < points.length; p++) {
         var point = points[p];
         increment('Serves', point.server);
         increment('Points', point.winner);
         if (point.result == 'Ace') increment('Ace', point.server);
         if (point.result == 'Serve Winner') increment('Serve Winners', point.server);
         if (point.result == 'Double Fault') increment('Double Faults', point.server);
         if (point.result == 'Forced Error') increment('Forced Errors', 1 - point.winner);
         if (point.result == 'Unforced Error') increment('Unforced Errors', 1 - point.winner);
         if (point.breakpoint != undefined) increment('Breakpoints', point.breakpoint);
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
