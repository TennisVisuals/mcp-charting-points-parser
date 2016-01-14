module.exports = function() {

   // module container
   var analyze = {};

   // Analysis

   analyze.rallyDepth = rallyDepth;
   function rallyDepth(points) {
      var no_depth_or_finish = [];
      var rally_count = 0;
      var return_count = 0;
      var return_depth = 0;
      var return_finish = 0;
      var depth_count = 0;
      for (var p=0; p < points.length; p++) {
         if (points[p].rally.length) {
            return_count += 1;
            var shots = points[p].rally;
            var ros = shots[0];
            var depth = findDepth(ros);
            var finish = findTerminator(ros);

            if (depth) {
               return_depth += 1;
            }
            if (finish) {
               return_finish += 1;
            }
            if (!depth && !finish) {
               no_depth_or_finish.push(ros);
            }

            if (shots.length > 1) {
               for (var r=1; r < shots.length; r++) {
                  rally_count += 1;
                  var rally_depth = findDepth(shots[r]);
                  if (rally_depth) {
                     depth_count += 1;
                     console.log(points[p].serves, shots);
                  }
               }
            }
         }
      }

      function findDepth(shot) {
         for (var i=0; i < shot.length; i++) {
            if ('789'.split('').indexOf(shot[i]) >= 0) return true;
         }
         return false;
      }

      function findTerminator(shot) {
         for (var i=0; i < shot.length; i++) {
            if ('*@#'.split('').indexOf(shot[i]) >= 0) return true;
         }
         return false;
      }

      var analysis = { 
         points: points.length, 
         returns: return_count, 
         return_finish: return_finish, 
         return_depth: return_depth, 
         return_other: no_depth_or_finish, 
         shots: rally_count, 
         rally_depth: depth_count
      }
      return analysis;
   }

   analyze.matchRallies = matchRallies;
   function matchRallies(matches) {
      var rally_shots = 0;
      var rally_depth = 0;
      var matches_with_rally_depth = [];
      matches.forEach(function(match, i) {
         var analysis = rallyDepth(match.match.points());
         rally_shots += analysis.shots;
         if (analysis.rally_depth > 0) {
            matches_with_rally_depth.push(i);
            rally_depth += 1;
         }
      });
      return { rally_shots: rally_shots, rally_depth: rally_depth, matches: matches_with_rally_depth };
   }

   return analyze;
}
