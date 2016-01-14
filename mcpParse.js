module.exports = function() {

   // module container
   var mcp = {};

   // environment variables
   var mismatches = 0;
   var debug = false;

   // cached files
   var cache_default = './mcpParse/cache/';

   // external module dependencies
   var fs             = require('fs');
   var d3             = require('d3');
   var util           = require('util');
   var chardet        = require('chardet');
   var EventEmitter   = require('events').EventEmitter;
   var ProgressBar    = require('progress');

   var mo             = require('./matchObject');

   mcp.mcpCSVparser = mcpCSVparser;
   function mcpCSVparser (file_name, cache_directory) {
      cache_directory = cache_directory ? cache_directory : cache_default;
      this.cache_directory = cache_directory;
      this.file_name = file_name
                       ? file_name.indexOf('.csv') > 0 ? file_name : file_name + '.csv'
                       : '';
      this.init();
   }

   util.inherits(mcpCSVparser, EventEmitter);

   mcpCSVparser.prototype.init = function () {
       var model;
       var self = this;
       self.on('loaded', function (points_array) {
          try {
             var result = self.loadMatches(self.file_name, points_array);
          }

          catch(err) {
             result = { error: 'Parsing Failed' };
          }

          if (result.error) {
             console.log('Error:', result.error);
             self.emit('complete', false);
          } else {
             self.emit('complete', result);
          }
       });
       if (!self.file_name) {
          console.log('Error: No File Name Given');
          self.emit('complete', false);
       } else {
          self.loadMatchArchive();
       }
   };

   mcpCSVparser.prototype.loadMatchArchive = function () {
     var self = this;
     var targetURL = self.cache_directory + self.file_name;
     console.log('Loading File:' + targetURL + '\r\nPlease be patient if file is large...');
     var chard = chardet.detectFileSync(targetURL);
     if (chard == 'ISO-8859-1' || chard == 'UTF-8') {
        var encoding = 'utf8';
     } else {
        var encoding = 'utf16le';
     }
     fs.readFile(targetURL, encoding, function(err, data) {
        if (err) {
           self.emit('error', err);
        } else {
           console.log('\r\nParsing CSV File...');
           var points_array = d3.csv.parse(data)
           self.emit('loaded', points_array);
        }
     });
   };

   // read .csv file and separate into matches
   mcpCSVparser.prototype.loadMatches = function (archiveURL, points_array) {
      console.log(points_array.length + ' points loaded\r\nSeparating Matches...');
      var match_points = [];
      var matches = [];
      var match_id;
      points_array.forEach(function(point) {
         if (point.match_id != match_id) {
            if (match_points.length) matches.push({ match_id: match_id, points: match_points });
            match_id = point.match_id;
            match_points = [point];
         } else {
            match_points.push(point);
         }
      });
      console.log(matches.length + ' matches');
      return matches;
   }

   mcp.parseArchive = function (file_name, callback) {
      var validate = (typeof callback == 'string' && callback == 'validate') ? true : false;
      var csv_parser = new mcpCSVparser(file_name);

      csv_parser.on('error', function (error) {
          console.log('Error parsing:', file_name, error);
        });

      csv_parser.on('complete', function (matches) {
         if (matches) {
            console.log('Matches Loaded\r\nParsing Shot Sequences...');
            parseMatches(matches);      
         }
      });

      function parseMatches(match_array) {
         var parsed_matches = [];
         var errors = [];
         var bar = new ProgressBar(':bar', { total: match_array.length });
         for (var m=0; m < match_array.length; m++) {
            //try {
               if (validate) {
                  // compares two methods of parsing
                  var result = csv_parser.validateMatch(match_array[m]);
               } else {
                  // utilizeds only shot sequence parsing
                  var result = csv_parser.parseMatch(match_array[m]);
               }

               if (!result) {
                  errors.push('ERROR: ' + match_array[m].match_id + ' => No Result');
               } else if (result.error) {
                  errors.push('ERROR: ' + match_array[m].match_id + ' => ' + result);
               } else {
                  parsed_matches.push(result);
               }
               bar.tick();
            //}

            //catch(err) {
            //   errors.push('Parsing Failed: ' + match_array[m].match_id);
            //   console.log(err);
            //}
         }
         console.log(parsed_matches.length + ' Matches Successfully Parsed');
         if (errors.length) console.log(errors.length + ' Parsing Errors');
         mcp.matches = parsed_matches;
         mcp.errors = errors;
         if (typeof callback == 'function') callback({ matches: parsed_matches, errors: errors });
      }
   }

   mcpCSVparser.prototype.parseMatch = function (match) {
      if (!match || !match.points) return false;
      var points = match.points;

      // parse match_id for player and tournament data
      var players = parsePlayers(points[0].match_id);
      var tournament = parseTournament(points[0].match_id);
      tournament.date = parseDate(points[0].match_id);

      // create UMO to generate valid point progression
      var UMO_shot_seq = new mo.matchObject();
      // set player names
      UMO_shot_seq.players(players[0], players[1]);

      // if # of sets or final_set_tiebreak different than defaults
      if (tournament.sets) { UMO_shot_seq.options({match: {sets: tournament.sets}}); }
      if (tournament.final_set_tiebreak != undefined) {
         UMO_shot_seq.options({match: {final_set_tiebreak: tournament.final_set_tiebreak}});
      }

      for (var p=0; p < points.length; p++) {

         // use UMO to validate point
         var serves = getServes(points[p]);
         var parsed_point_sequence = pointParser(serves);

         // null point encountered
         if (parsed_point_sequence.continue || !parsed_point_sequence.point) {
            continue;
         }

         parsed_point_sequence.winner = parsed_point_sequence.point;
         parsed_point_sequence.point = undefined;
         var result_shot_seq = UMO_shot_seq.push(parsed_point_sequence);

         // abort with error
         if (result_shot_seq.error) { return result_shot_seq; }
      }

      // return players and score
      return { match: UMO_shot_seq, tournament: tournament };
   }

   function getServes(value) {
      return [value['1st'], value['2nd']];
   }

   mcp.pointParser = pointParser;
   function pointParser(serves) {
      var code = serves.join('|');
      // parse first serve in case it ends the point
      // sometimes there is erroneous 2nd serve data
      var s1result = shotParser(serves[0], 1);

      if (s1result.point == 'S' || !serves[1] ) {
         s1result.serve = 1;
         s1result.code = code;
         return s1result;
      }

      s2result = shotParser(serves[1], 2);
      s2result.serve = 2;
      s2result.first_serve = { serves: s1result.serves, }
      if (s1result.lets) s2result.first_serve.lets = s1result.lets;
      if (s1result.error) s2result.first_serve.error = s1result.error;
      if (s1result.parse_notes) s2result.first_serve.parse_notes = s1result.parse_notes;

      s2result.code = code;
      return s2result;
   }

   mcp.shotParser = shotParser;
   function shotParser(shot_sequence, which_serve) {

      var point;
      var parsed_shots = analyzeSequence(shot_sequence);

      if (['Q', 'S'].indexOf(parsed_shots.result) >= 0) {
         parsed_shots.point = 'S';
         return parsed_shots;
      }

      if (['P', 'R'].indexOf(parsed_shots.result) >= 0) {
         parsed_shots.point = 'R';
         return parsed_shots;
      }

      // if there is not a terminator for second serve Receiver is always the winner
      if (!parsed_shots.terminator) {
         if (!shotFault(parsed_shots.serves[0]) && parsed_shots.serves.length > 2) {
            parsed_shots.point = 'R'; 
            return parsed_shots;
         }
      }

      // even number of shots implies Receiver made final shot
      var last_player = (parsed_shots.serves.length + parsed_shots.rally.length) % 2 == 0 ? 'R' : 'S';
      var final_shot = parsed_shots.rally.length ? parsed_shots.rally[parsed_shots.rally.length - 1] : parsed_shots.serves[parsed_shots.serves.length - 1];

      // if there is no shot in the sequence, continue to next shot_sequence
      if (!final_shot) { 
         return { continue: true };
      }

      // if there is no rally
      if (!parsed_shots.rally.length) {
         if (parsed_shots.terminator == '*') { 
            parsed_shots.result = 'Ace'; 
            parsed_shots.point = 'S';
         } else if (parsed_shots.terminator == '#') { 
            parsed_shots.result = 'Serve Winner'; 
            parsed_shots.point = 'S';
         } else if (shotFault(parsed_shots.serves[0])) {
            parsed_shots.error = assignError(parsed_shots.serves[0]);
            if (which_serve == 2) {
               parsed_shots.result = 'Double Fault';
               parsed_shots.point = 'R';
            }
         } else {
            parsed_shots.parse_notes = 'treated as a fault';
         }
         return parsed_shots;
      }

      if (final_shot.indexOf('#') >= 0) {
         parsed_shots.result = 'Forced Error';
         parsed_shots.error = assignError(final_shot);
         if (!shotFault(parsed_shots.serves[0])) {
            parsed_shots.point = (last_player == 'R') ? 'S' : 'R';
         } else {
            // doesn't make sense, but this is how the spreadsheet does it...
            parsed_shots.point = 'S';
         }
      } else if (final_shot.indexOf('*') >= 0) {
         parsed_shots.result = 'Winner';
         parsed_shots.point = last_player;
      } else if (final_shot.indexOf('@') >= 0) {
         parsed_shots.result = 'Unforced Error';
         parsed_shots.error = assignError(final_shot);
         if (!shotFault(parsed_shots.serves[0])) {
            parsed_shots.point = (last_player == 'R') ? 'S' : 'R';
         } else {
            // doesn't make sense, but this is how the spreadsheet does it...
            parsed_shots.point = 'R';
         }
      } else if (!shotFault(parsed_shots.serves[0])) {
         if (parsed_shots.serves.length && parsed_shots.rally.length > 1) {
            parsed_shots.parse_notes = 'no terminator: receiver wins point';
            parsed_shots.result = 'Unknown';
            parsed_shots.point = 'R';
         } else if (parsed_shots.rally.length == 1 && shotFault(final_shot)) {
            parsed_shots.error = assignError(final_shot);
            parsed_shots.point = (last_player == 'R') ? 'S' : 'R';
         }
      } else if (parsed_shots.rally.length == 1 && shotFault(final_shot)) {
         parsed_shots.error = assignError(final_shot);
         parsed_shots.point = (last_player == 'R') ? 'S' : 'R';
      }

      return parsed_shots;
   }

   function assignError(shot) {
      var errors = {'n': 'Net', 'w': 'Out Wide', 'd': 'Out Deep', 'x': 'Out Wide and Deep', 'g': 'Foot Fault', 'e': 'Unknown', '!': 'Shank' };
      var error = shotFault(shot);
      if (error) return errors[error];
   }

   mcp.analyzeSequence = analyzeSequence;
   function analyzeSequence(shot_sequence) {
      var result;
      var terminator;
      var ignored_shots;

      // count lets
      var lets = shot_sequence.split('c').length - 1;
      // remove all lets
      shot_sequence = shot_sequence.split('c').join('');

      var shots = shotSplitter(shot_sequence);
      var trimmed_shots = shots;

      // eliminate any sequence data following terminator
      for (var s = shots.length - 1; s>=0; s--) {
         terminator = containsTerminator(shots[s]);
         if (terminator) {
            trimmed_shots = shots.slice(0, s + 1);
            ignored_shots = shots.slice(s + 1);
            result = shots[s];
            break;
         }
      }
      var serves = findServes(trimmed_shots);
      var rally = serves.length ? trimmed_shots.slice(serves.length) : trimmed_shots;

      if (!terminator && !serves.length && rally.length == 1 && ['Q', 'S', 'P', 'R'].indexOf(rally[0]) >= 0) {
         result = rally[0];
      }
      var analysis = { serves: serves, rally: rally };
      if (lets) analysis.lets = lets;
      if (terminator) analysis.terminator = terminator;
      if (result) analysis.result = result;
      if (ignored_shots && ignored_shots.length) analysis.ignored = ignored_shots;

      //var analysis = { serves: serves, rally: rally, lets: lets, terminator: terminator, result: result, ignored: ignored_shots };
      return analysis
   }

   function containsTerminator(shot) {
      if (!shot) return false;
      var terminators = ['#', '@', '*'];
      for (var t=0; t < terminators.length; t++) {
         if (shot.indexOf(terminators[t]) >= 0) return terminators[t];
      }
      return false;
   }

   function findServes(shots) {
      if (!shots) return [];
      var serves = [];
      var rally = [];
      var serve_codes = '0456'.split('');
      for (var s=0; s < shots.length; s++) {
         if (shots[s].length && serve_codes.indexOf(shots[s][0]) >= 0) {
            serves.push(shots[s]);
         }
      }
      return serves;
   }

   function shotSplitter(point) {
      var strokes = '0456fbrsvzopuylmhijktq';
      var stroke_array = strokes.split('');
      var shots = [];

      // remove any leading characters that are not considered strokes
      var leading_characters = true;
      while(leading_characters) { 
         if (point && '+-='.indexOf(point[0]) >= 0) {
            point = point.slice(1); 
         } else {
            leading_characters = false;
         }
      }

      var fodder = point.slice();
      var nextfodder;
      while(fodder.length) {
         for (var l=1; l < fodder.length; l++) {
            if (stroke_array.indexOf(fodder[l]) >= 0) { 
               shots.push(fodder.slice(0,l)); 
               nextfodder = fodder.slice(l); 
               break;
            }
         }
         if (l == fodder.length) {
            shots.push(fodder.slice(0,l)); 
            nextfodder = fodder.slice(l); 
         }
         fodder = nextfodder;
      }
      return shots;
   }

   function shotFault(shot) {
      if (!shot) return false;
      var faults = 'nwdxge!'.split('');
      for (var f=0; f < faults.length; f++) {
         if (shot.indexOf(faults[f]) >= 0) return faults[f];
      }
      return false;
   }

   function parsePlayers(match_id) {
      // not a very reobust parse at the moment!
      var players = match_id.split('_').join(' ').split('-').slice(4,6);
      return players;
   }

   function parseDate(match_id) {
      var splitMatchID = match_id.split('-');
      var dt = splitMatchID[0];
      var date = dt.slice(4,6) + '-' + dt.slice(6,8) + '-' + dt.slice(0,4);
      var match_date = new Date(date);
      return match_date;
   }

   function parseTournament(match_id) {
      var tournament = {};
      var splitMatchID = match_id.split('-');
      tournament.name = (splitMatchID.length > 2) ? normalizeTournament(splitMatchID[2]) : '';
      tournament.division = (splitMatchID.length > 1) ? 
                            ['M', 'W'].indexOf(splitMatchID[1]) >= 0 ? splitMatchID[1] : '' : '';

      if (tournament.name.indexOf('ITF ') == 0) {
         tournament.name = tournament.name.slice(4);
         tournament.tour = 'itf';
      }

      if (tournament.name.indexOf('WTA ') == 0) {
         tournament.tour = 'wta';
      }

      if (tournament.name == 'French Open') tournament.name = 'Roland Garros';
      if (tournament.name.indexOf('Davis Cup') == 0) tournament.name = 'Davis Cup';
      if (tournament.name.indexOf('Fed Cup') == 0) tournament.name = 'Fed Cup';

      if (tournament.name.match(' CH'+'$') == ' CH') {
         tournament.name = tournament.name.slice(0, tournament.name.length - 3);
         tournament.tour = 'ch';
      }

      if (tournament.name.indexOf('WTC ') == 0 || tournament.name.match(' WCT'+'$') == ' WCT') {
         tournament.tour = 'wct';
      }

      if (tournament.name.match(' Masters'+'$') == ' Masters') {
         tournament.tour = 'atp';
      }

      if (tournament.name.match(' Q'+'$') == ' Q') {
         tournament.name = tournament.name.slice(0, tournament.name.length - 2);
         tournament.draw = 'qual';
      }

      if (tournament.name.match(/\sF[0-9]+$/)) {
         var temp = tournament.name.split(' ');
         tournament.name = temp.slice(0, temp.length - 1).join(' ');;
         tournament.tour = 'fu';
      }

      if (tournament.name.match(/\s[0-9]+K/)) {
         var temp = tournament.name.split(' ');
         tournament.name = temp.slice(0, temp.length - 1).join(' ');;
         tournament.prize_money = '$' + temp[temp.length - 1].replace('K', ',000').trim();
         tournament.tour = 'itf';
      }

      var grand_slam_scoring = ['Australian Open', 'US Open', 'Roland Garros', 'Wimbledon', 'Davis Cup'];
      var no_final_set_tiebreak = ['Australian Open', 'Roland Garros', 'Wimbledon', 'Fed Cup', 'Olympics'];

      if (grand_slam_scoring.indexOf(tournament.name) >= 0) {
         if (tournament.division == 'W') {
            tournament.sets = 3;
         } else if (tournament.division == 'M') {
            tournament.sets = 5;
         }
      }

      if (no_final_set_tiebreak.indexOf(tournament.name) >= 0) {
         tournament.final_set_tiebreak = false;
      }

      return tournament;
   }

   function normalizeTournament(tournament) {
      var particles = ['de', 'di', 'du', 'van', 'von', 'ten'];
      var t_split = tournament.split('_');
      var normalized = t_split.map(function(e, i) {
         e = e.trim();
         if (!e) return;
         if (e === e.toUpperCase()) return e; // acronym
         if (i == 0 || i == t_split.length - 1 || particles.indexOf(e.toLowerCase()) < 0) {
            return e[0].toUpperCase() + e.slice(1); 
         } else {
            return e.toLowerCase();
         }
      }).join(' ');
      return normalized;
   }

   // Analysis

   mcp.rallyDepth = rallyDepth;
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

   mcp.matchRallies = matchRallies;
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

   // used for debugging, compares two parsing methods
   mcpCSVparser.prototype.validateMatch = function (match) {
      if (!match || !match.points) return false;
      var points = match.points;

      var debug_list = [
         '20140118-W-Australian_Open-R32-Maria_Sharapova-Alize_Cornet',
         '19811130-W-Australian_Open-F-Martina_Navratilova-Chris_Evert',
         '20131005-M-Tokyo-SF-Nicolas_Almagro-Juan_Martin_Del_Potro',
         '19991122-M-Tour_Finals-RR-Pete_Sampras-Andre_Agassi'
      ];

      var debug_file = (debug_list.indexOf(points[0].match_id) >= 0) ? true : false;

      // parse match_id for player and tournament data
      var players = parsePlayers(points[0].match_id);
      var tournament = parseTournament(points[0].match_id);

      // create two separate UMOs
      var UMO_PtsAfter = new mo.matchObject();
      var UMO_shot_seq = new mo.matchObject();
      UMO_PtsAfter.players(players[0], players[1]);
      UMO_shot_seq.players(players[0], players[1]);

      // if # of sets or final_set_tiebreak different than defaults
      if (tournament.sets) {
         UMO_PtsAfter.options({match: {sets: tournament.sets}});
         UMO_shot_seq.options({match: {sets: tournament.sets}});
      }
      if (tournament.final_set_tiebreak != undefined) {
         UMO_PtsAfter.options({match: {final_set_tiebreak: tournament.final_set_tiebreak}});
         UMO_shot_seq.options({match: {final_set_tiebreak: tournament.final_set_tiebreak}});
      }

      // necessary for PtsAfter() transformation of GM to point score
      var last_point;

      for (var p=0; p < points.length; p++) {

         // use UMO to validate point
         var ppp = ptsAfter(points[p]);
         var serves = getServes(points[p]);
         var pps = pointParser(serves);

         // null point encountered
         if (ppp.continue || pps.continue) continue;

         if (!ppp.point || !pps.point) {
            console.log('missing point', ppp.point, pps.point);
            continue;
         }

         var result_PtsAfter = UMO_PtsAfter.push(ppp.point);
         var result_shot_seq = UMO_shot_seq.push({ winner: pps.point, shots: pps.shots, rally: pps.rally });

         // compare points returned by UMO for each parser
         if (debug_file && result_PtsAfter.point && result_shot_seq.point && result_PtsAfter.point.point != result_shot_seq.point.point) {
            console.log(pps.point, '\t' + result_shot_seq.point.point, '\t' + ppp.point, '\t' + result_PtsAfter.point.point, '\t' + pps.code);
         }

         // abort with error
         if (result_shot_seq.error) return result_shot_seq;

         // set last_point, necessary for PtsAfter() transformation of GM to point score
         last_point = ppp.point;
      }

      // if the two UMOs have differeing scores, display them
      if (UMO_shot_seq.score().match_score.trim() != UMO_PtsAfter.score().match_score.trim()) {
         mismatches += 1;
         console.log('parsing mismatch #: ', mismatches, ' ', points[0].match_id);
         console.log(UMO_PtsAfter.score().match_score, ' / ', UMO_shot_seq.score().match_score);
      }

      // return players and score
      return { players: UMO_shot_seq.players(), score: UMO_shot_seq.score().match_score };

      // small parser for ptsAfter column of MCP .csv files
      function ptsAfter(value) {
         if (!value || !value.PtsAfter) return { continue: true };
         var point = value.PtsAfter.slice();

         // reverse point if second player serving
         if (points[p].Svr == 2) { point = point.split('-').reverse().join('-'); }
         point = point.replace('AD', 'A');

         if (last_point && point == 'GM') {
            var point = last_point.replace('A', 50);
            var score = point.split('-');
            var winner = parseInt(score[0]) > parseInt(score[1]) ? 0 : 1;
            score[winner] = 'G';
            point = score.join('-');
         }
         return { point: point };
      }
   }

   mcp.localCacheList = localCacheList;
   function localCacheList() {
      var ignore_list = [];
      ignore_list.push('20151104-M-20151103-R64-Viktor_Troicki-Jack_Sock.html');                // duplicate file with incorrect tournament name
      ignore_list.push('1990409-W-Amelia_Island-F-Steffi_Graf-Arantxa_Sanchez_Vicario.html');   // incorrect date (file duplicated)
      ignore_list.push('20151022-M-Vienna-R16-Jo_Wilfried_Tsonga-Lukas_Rosol.html');            // incomplete file
      var files = fs.readdirSync(cache_default);
      files = files.filter(function(f) { return f.indexOf('DS_Store') < 0 && f.indexOf('un~') < 0; });
      files = files.filter(function(f) { return ignore_list.indexOf(f) < 0 });
      return files;
   }

   return mcp;
}
