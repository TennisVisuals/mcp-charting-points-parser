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
            console.log('Matches Loaded\r\nParsing Shot Sequenes...');
            parseMatches(matches);      
         }
      });

      function parseMatches(match_array) {
         var parsed_matches = [];
         var errors = [];
         var bar = new ProgressBar(':bar', { total: match_array.length });
         for (var m=0; m < match_array.length; m++) {
            try {
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
            }

            catch(err) {
               errors.push('Parsing Failed: ' + match_array[m].match_id);
               console.log(err);
            }
         }
         console.log(parsed_matches.length + ' Matches Successfully Parsed');
         if (errors.length) console.log(errors.length + ' Parsing Errors');
         if (typeof callback == 'function') callback({ matches: parsed_matches, errors: errors });
      }
   }

   mcpCSVparser.prototype.parseMatch = function (match) {
      if (!match || !match.points) return false;
      var points = match.points;

      // parse match_id for player and tournament data
      var players = parsePlayers(points[0].match_id);
      var tournament = parseTournament(points[0].match_id);
      var date = parseDate(points[0].match_id);

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
         var parsed_point_sequence = pointParser(points[p]);

         // null point encountered
         if (parsed_point_sequence.continue) continue;

         var result_shot_seq = UMO_shot_seq.push({ winner: parsed_point_sequence.point });

         // abort with error
         if (result_shot_seq.error) return result_shot_seq;
      }

      // return players and score
      return { match: UMO_shot_seq, tournament: tournament };
   }

   function pointParser(value) {
      var serve1 = value['1st'];
      var serve2 = value['2nd'];

      // parse first serve in case it ends the point
      // sometimes there is erroneous 2nd serve data
      var s1result = shotParser(serve1, 1);

      // handle situations where 1st and 2nd serve contained in 1st serve coding
      if (s1result.remnant) {
         if (!serve2) serve2 = s1result.remnant;
      }

      if (s1result.point == 'S' || !serve2 ) {
         return s1result;
      }

      return shotParser(serve2, 2);
   }

   function shotParser(point, which_serve) {

      // remove all lets
      point = point.split('c').join('');

      var shots = shotSplitter(point);
      var winner;

      // even number of shots implies Receiver made final shot
      var last_player = shots.length % 2 == 0 ? 'R' : 'S';
      var final_shot = shots[shots.length - 1];

      if (!final_shot) return { continue: true };

      // check if the first shot finished the point
      if (shots.length > 1 && shotFault(shots[0])) {
         var result = { point: 'R', shots: [shots[0]], rally: 0, code: point, remnant: shots.slice(1).join('') };
         return result;
      }

      if (shots.length == 1) {
         if (final_shot.indexOf('#') > 0 || final_shot == 'Q' || final_shot == 'S') {
            winner = 'S';
         } else if (shotFault(final_shot) || final_shot == 'P' || final_shot == 'R') {
            winner = 'R';
         } else if (final_shot.indexOf('*') > 0) {
            winner = 'S';
         }
      } else if (final_shot.indexOf('*') >= 0) {
         if (shotFault(final_shot) && debug) console.log('CONTRADICTION: ', final_shot);
         winner = last_player;
      } else if (final_shot.indexOf('#') > 0 || final_shot.indexOf('@') > 0 || shotFault(final_shot)) {
         winner = (last_player == 'R') ? 'S' : 'R';
      } else {
         winner = last_player;
      }
      return { point: winner, shots: shots, rally: shots.length - 1, code: point };
   }

   function shotSplitter(point) {
      var strokes = '0456fbrsvzopuylmhijktq'.split('');
      var shots = [];
      var fodder = point.slice();
      var nextfodder;
      while(fodder.length) {
         for (var l=1; l < fodder.length; l++) {
            if (strokes.indexOf(fodder[l]) >= 0) { 
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
      var faults = 'nwdxge!'.split('');
      for (var f=0; f < faults.length; f++) {
         if (shot.indexOf(faults[f]) >= 0) return true;
      }
      return false;
   }

   function parsePlayers(match_id) {
      // not a very reobust parse at the moment!
      var players = match_id.split('_').join(' ').split('-').slice(4,6);
      return players;
   }

   function parseDate(match_id) {
      return new Date();
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
         tournament.name = tournament.name.slice(0, tournament.length - 3);
         tournament.tour = 'ch';
      }

      if (tournament.name.indexOf('WTC ') == 0 || tournament.name.match(' WCT'+'$') == ' WCT') {
         tournament.tour = 'wct';
      }

      if (tournament.name.match(' Masters'+'$') == ' Masters') {
         tournament.tour = 'atp';
      }

      if (tournament.name.match(' Q'+'$') == ' Q') {
         tournament.name = tournament.name.slice(0, tournament.length - 2);
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

   // used for debugging, compares two parsing methods
   mcpCSVparser.prototype.validateMatch = function (match) {
      if (!match || !match.points) return false;
      var points = match.points;

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
         var pps = pointParser(points[p]);

         // null point encountered
         if (ppp.continue || pps.continue) continue;

         var result_PtsAfter = UMO_PtsAfter.push(ppp.point);
         var result_shot_seq = UMO_shot_seq.push({ winner: pps.point });

         // compare points returned by UMO for each parser
         if (debug && result_PtsAfter.point.point != result_shot_seq.point.point) {
            console.log(pps.point, '\t' + result_shot_seq.point.point, '\t' + ppp.point, '\t' + resultresult_PtsAfter.point.point, '\t' + pps.code);
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
         var point = value.PtsAfter.slice();
         if (!point) return { continue: true };

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
