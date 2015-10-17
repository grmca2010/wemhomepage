/*jslint browser: true, nomen: true, unparam: true, white: true, plusplus: true */
/*global exports: true, require: false, console: false */
/*properties
    'Content-Type', actions, aem, basename, body, deploy_lastBuild, disk_avail,
    disk_partition, disk_size, disk_used, disk_used_percent, diskspace,
    distdescription, distro_version, end, error, exec, extname, facts,
    gitwem_lastBuild, hasOwnProperty, headers, hours, info, jar, jenkins,
    lastIndexOf, last_run, last_started_time, length, log, lsb, master, match,
    os, parse, plugins, puppet, push, readFiles, shift, shortName, sort, split,
    start_time, status, statusCode, stringify, substring, system_uptime,
    toLowerCase, uptime_hours, url, version, writeHead, 'x-jenkins'
*/

(function() {
   'use strict';
   var exec = require('child_process').exec,
       path = require('path'),
       dir  = require("node-dir"),
       request = require("request");

   // finding disk space (mdh 2015.0824 - code was swapping used and avail; fixed and added all values)
   function diskspace(callback, responseResult) {
      exec(
         'df -h  / /data 2>/dev/null | awk \'NR>1 {print $5 "=" $1 "=" $2 "=" $3 "=" $4}\'',
         function(error, stdout, stderr) {
            var i, result,
                df_result = stdout.split("\n");
            responseResult.diskspace = [];
            for (i in df_result) {
               if (df_result.hasOwnProperty(i)) {
                  result = df_result[i].split("=");
                  if (result[0] !== "") {
                     responseResult.diskspace.push({
                         "disk_partition": result[0],
                         "disk_size": result[1],
                         "disk_used": result[2],
                         "disk_avail": result[3],
                         "disk_used_percent": result[4]
                     });
                  }
               }
            }
            callback();
         } // end anon function
      ); // end exec()
   } // end diskspace()

   function jenkinstatus(callback, responseResult) {
       exec('ps -ef | grep "jenkins" | grep "8080" | grep -v /bin/sh |  head -1 | awk \'{print $1"="$2"="$5}\'', function(error, stdout, stderr) {
           var service_result;
           responseResult.jenkins = {
               "status": "down",
               "start_time": ""
           };
           if (stdout) {
               service_result = stdout.split("=");
               responseResult.jenkins.status = "up";
               responseResult.jenkins.start_time = service_result[2];
           }
           callback();
       });
   }

   // this MUST run after jenkinstatus()
   function jenkinsInfo(callback, responseResult) {
       request(
          { url: "http://localhost:8080/pluginManager/api/json?tree=plugins[shortName,version]" },
          function(error, response, body) {
             var i, rawdata, plugins = [];
             if (error || response.statusCode !== 200) {
                responseResult.jenkins.plugins = ["Not able to pull the data from jenkins"];
                callback();
                return;
             }
   
             // get the jenkins version number from an X-header in the response!
             responseResult.jenkins.version = response.headers['x-jenkins'];
               
             rawdata = (JSON.parse(response.body)).plugins;
             for (i=0; i<rawdata.length; i++) {
                plugins.push(rawdata[i].shortName.toLowerCase() + ': ' + rawdata[i].version);
             }
             responseResult.jenkins.plugins = plugins.sort();
             callback();
         } // end anon function
      ); // end request()
   } // end jenkinsInfo()

   function aemStatus(callback, responseResult) {
       var service_result;
       exec('ps -ef | grep "4502" | grep "cq-quickstart" | grep -v /bin/sh | head -1 | awk \'{print $1"="$2"="$5"="$15}\'', function(error, stdout, stderr) {
           responseResult.aem = {
               "status": "down",
               "start_time": "",
               "last_run": "",
               "last_started_time": "",
               "version": "(unknown)"
           }; 
           if (stdout) {
               service_result = stdout.split("=");
               responseResult.aem.status = "up";
               responseResult.aem.start_time = service_result[2];
               responseResult.aem.jar = service_result[3];
               responseResult.aem.version = (service_result[3].match(/quickstart-([0-9]\.[0-9]\.[0-9])/))[1];
           }  
           callback();
       });
   }

   // run AFTER aemStatus
   function aemLastRun(callback, responseResult) {
      var filepath = '/var/www/cq';
      if (responseResult.aem.version.match(/^6/)) {
         filepath += '/author';
      }
      filepath += '/crx-quickstart/conf/cq.pid';
   
      exec('ls -l --time-style="+%c" ' + filepath + ' | cut -d\' \' -f6-12', function(error, stdout, stderr) {
         if (stdout) {
            responseResult.aem.last_started_time = stdout;
         }
         callback();
      });
   }

   function puppetstatus(callback, responseResult) {
       exec('ps -ef | grep agent | grep -v /bin/sh | grep -v grep | awk \'{print $1"="$2"="$5}\'', function(error, stdout, stderr) {
           var service_result;
           responseResult.puppet = {
               "status": "down",
               "start_time": ""
           };
           if (stdout) {
               service_result = stdout.split("=");
               responseResult.puppet.status = "up";
               responseResult.puppet.start_time = service_result[2];
           }
           callback();
       });
   }

   function puppetCurrentRun(callback, responseResult) {
       exec('echo `ps -ef | grep -c puppet.\*applyin[g]`,`ps -ef | grep -Ec \'puppet\ +agent\ +-[t]\'`', function(error, stdout, stderr) {
           var cr = stdout.split(",");
           responseResult.puppet.currentRun = {
               "auto": parseInt(cr[0].trim()),
               "manual": parseInt(cr[1].trim())
           };
           callback();
       });
   }

   function puppetMaster(callback, responseResult) {
       exec(
          'grep \'\\bserver\' /etc/puppet/puppet.conf | grep -oE \'[a-z_-]+\\.cisco\\.com\'',
          function(error, stdout, stderr) {
           if (stdout) {
               responseResult.puppet.master = stdout;
           }
           else {
               responseResult.puppet.master = "(unknown) -- " + stderr;
           }
           callback();
       });
   }

   function readPuppetDirectory(callback, responseResult) {
       responseResult.puppet.info = {};
       dir.readFiles("/home/devops/data",{match: /\.txt|\.json$/}, function(err, content, filename, next) {
               var _fileName;
               if (err) {
                   console.log("error while reading the directory");
                   callback();
               }
               if(path.extname(filename)===".json"){
                          content=JSON.parse(content);
              }
               if (path.basename(filename) === "cq5-last-run.json") {
                   responseResult.aem.last_run =content;
               } else {
                   _fileName=path.basename(filename);
                   _fileName=_fileName.substring(0,_fileName.lastIndexOf("."));
                   responseResult.puppet.info[_fileName] = content;
               }
               next();
           },
           function(err, files) {
               var fields, facts, i;
               if (err) {
                   console.log("error while reading the directory");
               }
   
               if (responseResult.puppet.info.facts) {
                  fields = ['puppetversion', 'ipaddress', 'memorysize', 'memoryfree', 'swapsize', 'swapfree', 'uptime'];
                  facts  = responseResult.puppet.info.facts;
   
                  for (i in fields) {
                     if (fields.hasOwnProperty(i)) {
                       responseResult.puppet.info[fields[i]] = facts[fields[i]] || "";
                     }
                  }
               
                  responseResult.puppet.info.uptime_hours   = facts.system_uptime.hours;
                  responseResult.puppet.info.distro_version = facts.os.lsb.distdescription;
                  delete responseResult.puppet.info.facts;
               }
               
               callback();
           });
   }

   function jenkinJob_deploy_lastBuild(callback, responseResult) {
       responseResult.deploy_lastBuild = {
           status: "",
           error: ""
       };
       request({
           url: "http://localhost:8080/job/DEPLOY_LOCALHOST/lastBuild/api/json"
       }, function(error, response, body) {
           var data;
           if (error || response.statusCode !== 200) {
               responseResult.deploy_lastBuild.error = "Not able to pull the data from jenkin";
               callback();
               return;
           }
           data = JSON.parse(response.body);
           responseResult.deploy_lastBuild.status = data;
           callback();
       });
   }

   function jenkinJob_gitwem_lastBuild(callback, responseResult) {
       responseResult.gitwem_lastBuild = {
           actions: "",
           error: ""
       };
       request({
           url: "http://localhost:8080/job/GIT_WEM/lastBuild/api/json"
       }, function(error, response, body) {
           var data;
           if (error || response.statusCode !== 200) {
               responseResult.gitwem_lastBuild.error = "Not able to pull the data from jenkin";
               callback();
               return;
           }
           data = JSON.parse(response.body);
           responseResult.gitwem_lastBuild.actions = data;
           callback();
       });
   }

   // prints output as JSON
   function finish(response, responseResult) {
       var json = JSON.stringify(responseResult);
       response.writeHead(200, {
           "Content-Type": "application/json"
       });
       response.end(json);
   }

   // executes the callbacks one after another
   function series(response) {
       var callbackSeries = [diskspace, jenkinstatus, jenkinsInfo, aemStatus, aemLastRun, puppetstatus, puppetCurrentRun, puppetMaster, readPuppetDirectory, jenkinJob_deploy_lastBuild, jenkinJob_gitwem_lastBuild],
           responseResult = {};
   
       function next() {
           var callback = callbackSeries.shift();
           if (callback) {
               callback(next, responseResult);
           } else {
               finish(response, responseResult);
           }
       }
       next();
   }
   
   exports.status = function(request, response) {
       series(response);
   };
}());
