/*jslint browser: true, nomen: true, unparam: true, white: true, plusplus: true */
/*global exports: true, require: false */
/*properties
    'Content-Type', actions, aem, branch, deploy_lastBuild, disk_avail,
    disk_partition, disk_size, disk_used, disk_used_percent, diskspace,
    distro_version, end, error, exec, fullDisplayName, gitwem_lastBuild,
    hasOwnProperty, hostname, html_table, id, info, ipaddress, jenkins,
    lastBuiltRevision, last_started_time, length, master, match, memoryfree,
    memorysize, name, parameters, parse, plugins, puppet, puppetversion, replace,
    result, round, start_time, status, swapfree, swapsize, uptime, uptime_hours,
    url, value, version, writeHead
*/

var exec      = require('child_process').exec,
    path      = require('path'),
    dir       = require("node-dir"),
    request   = require("request"),
    os        = require("os"),
    host      = os.hostname(),
    fqdn      = host + '.cisco.com',
    statusSvc = 'http://' + fqdn + '/api/status';

function getStatusTable(svcUrl, callerResponse) {
   'use strict';

   /* ------ begin message building functions ---------------------------------------- */

   // put together the AEM info
   function buildAemMsg(data) {
      var aemMsg =
           "<ul>\n" +
           '  <li><span class="service-' + data.aem.status + '">' + data.aem.status + '</span>'
         + (data.aem.status === "up" ? ' (since ' + data.aem.start_time + ')' : '') + "</li>\n"
         + '  <li>version: ' + data.aem.version + "</li>\n"
         + '  <li>Last started: ' + data.aem.last_started_time + "</li>\n"
         + "</ul>\n";

      return aemMsg;
   }

   // put together the Puppet info
   function buildPuppetMsg(data) {
      var currentRunMessage = "Unknown";
      if(data.puppet.currentRun) {
          if(data.puppet.currentRun.auto) {
              currentRunMessage = "<span class=\"service-up\">Daemon Applying Configuration</span>";  
          } else if(data.puppet.currentRun.manual) {
              currentRunMessage = "<span class=\"service-up\">Manually Applying Configuration</span>";             
          } else {
              currentRunMessage = "Idle";
          }
      }
      var pupmsg =
           "<ul>\n" +
           '  <li><span class="service-' + data.puppet.status + '">' + data.puppet.status + '</span>'
         + (data.puppet.status === "up" ? ' (since ' + data.puppet.start_time + ')' : '') + "</li>\n"
         + '  <li>version: ' + data.puppet.version + "</li>\n"
         + '  <li><strong>Master: </strong>' + data.puppet.master + "</li>\n"
         + '  <li><strong>Current Status: </strong>' + currentRunMessage + "</li>\n"
         + "</ul>\n";

      return pupmsg;
   }

   // put together the WEM info
   function buildWemMsg(data) {
      var gitwem  = data.gitwem_lastBuild,
          wemmsg  = '',
          i, obj;

      if (gitwem.error) {
         wemmsg = '<span class="service-down">Error: ' + gitwem.error + '</span>';
      }
      else {
         wemmsg = "<ul>\n"
                + '  <li><a href="' + gitwem.actions.url.replace(/localhost/, fqdn)
                + '"><span class="service-'
                + (gitwem.actions.result === "FAILURE" ? 'down' : 'up') +'">'
                + gitwem.actions.result + '</span></a> (' + gitwem.actions.id + ")</li>\n";

         for (i=0;i<gitwem.actions.actions.length;i++) {
            obj = gitwem.actions.actions[i];
            if (obj.hasOwnProperty('lastBuiltRevision')) {
               wemmsg += "  <li><strong>Branch:</strong> " + obj.lastBuiltRevision.branch[0].name + "</li>\n";
            }
         }

         wemmsg += "</ul>\n";
      } // end else

      return wemmsg;
   }

   function buildDeployMsg(data) {
      var deploy  = data.deploy_lastBuild,
          depmsg  = '',
          i, obj;

      if (deploy.error) {
         depmsg = '<span class="service-down">Error: ' + deploy.error + '</span>';
      }
      else {
         depmsg = "<ul>\n"
                + '  <li><a href="' + deploy.status.url.replace(/localhost/, fqdn)
                + '"><span class="service-'
                + (deploy.status.result === "FAILURE" ? 'down' : 'up') +'">'
                + deploy.status.result + '</a> (' + deploy.status.id + ")</li>\n"
                + '  <li>' + deploy.status.fullDisplayName + ': ';

         for (i=0;i<deploy.status.actions.length;i++) {
            obj = deploy.status.actions[i];
            if (obj.hasOwnProperty('parameters')) {
               depmsg += obj.parameters[0].value + "</li>\n";
            }
         }

         depmsg += "</ul>\n";
      } // end else

      return depmsg;
   }

   // put together the jenkins info
   function buildJenkinsMsg(data) {
      var i, plugin,
          jenkmsg = "<ul>\n"
                  + '  <li><span class="service-' + data.jenkins.status + '">' + data.jenkins.status + '</span>'
                  + (data.jenkins.status === "up" ? ' (since ' + data.jenkins.start_time + ')' : '') + "</li>\n"
                  + '  <li>version: ' + data.jenkins.version + "</li>\n"
                  + '  <li class="accordion">' + "\n" 
                  + '    <div class="accordion-section">' + "\n"
                  + '      <div class="accordion-section-title">Plugins <span>&#9660;</span></div>' + "\n"
                  + '      <div class="accordion-section-content">' + "\n"
                  + '        <ul>' + "\n";

      for (i=0;i<data.jenkins.plugins.length;i++) {
         plugin = data.jenkins.plugins[i];
         jenkmsg += '          <li>' + plugin + "</li>\n";
      }

      jenkmsg += "        </ul>\n" 
              +  "      </div>\n"
              +  "    </div>\n"
              +  "  </li>\n"
              +  "</ul>\n";

      return jenkmsg;
   }

   // put together the disk usage info
   function buildDiskMsg(data) {
      var i, obj, usedPercent,
          diskmsg = '<table class="table table-condensed"><thead><tr><th>FS</th>'
                  + '<th>Total</th><th>Used</th><th>Available</th><th></th></tr></thead><tbody>';

      for (i=0;i<data.diskspace.length;i++) {
         obj = data.diskspace[i];
         usedPercent = obj.disk_used_percent.replace(/%/,'');

         diskmsg += '<tr><th>' + obj.disk_partition + '</th>' 
                 +  '<td>' + obj.disk_size +  '</td>'
                 +  '<td>' + obj.disk_used + '</td>'
                 +  '<td>' + obj.disk_avail +  '</td>'
                 +  '<td><div class="progress">'
                 +  '<div class="progress-bar" style="width: '
                 +  usedPercent + '%">' + usedPercent + '%</div></div></td></tr>';
      }
      diskmsg += '</tbody></table>';

      return diskmsg;
   }

   // put together uptime info
   function buildUptimeMsg(info) {
      var uptimemsg = 
            info.uptime
         + (info.uptime.match(/day/) ? ' [in hours: ' + info.uptime_hours + ']' : '');

      return uptimemsg;
   }

   // put together the RAM and swap usage info
   function buildMemMsg(info) {
      var memused  = Math.round((info.memorysize.replace(/ GB/,'') * 100) - (info.memoryfree.replace(/ GB/,'') * 100)) / 100,
          swapused = Math.round((info.swapsize.replace(/ GB/,'') * 100)   - (info.swapfree.replace(/ GB/,'') * 100)) / 100,
          mempct   = Math.round((memused/info.memorysize.replace(/ GB/,''))*100),
          swappct  = Math.round((swapused/info.swapsize.replace(/ GB/,''))*100),
          memmsg   = '<table class="table table-condensed"><thead><tr><th>Type</th>'
                   + '<th>Total</th><th>Used</th><th>Available</th><th></th></tr></thead><tbody>';

      memmsg += '<tr><th>RAM</th>' 
              +  '<td>' + info.memorysize + '</td>'
              +  '<td>' + memused          + ' GB</td>'
              +  '<td>' + info.memoryfree + '</td>'
              +  '<td><div class="progress">'
              +  '<div class="progress-bar" style="width: '
              +  mempct + '%">' + mempct + '%</div></div></td></tr>';

      memmsg += '<tr><th>Swap</th>' 
              +  '<td>' + info.swapsize + '</td>'
              +  '<td>' + swapused       + ' GB</td>'
              +  '<td>' + info.swapfree + '</td>'
              +  '<td><div class="progress">'
              +  '<div class="progress-bar" style="width: '
              +  swappct + '%">' + swappct + '%</div></div></td></tr>';

      memmsg += '</tbody></table>';
      return memmsg;
   }

   /* ------ end message building functions ---------------------------------------- */

   // now do the actual fetch of json and transform into html
   request(
      { url: svcUrl },
      function(error, response, body) {
         var data, info, table, aemStr;

         if (error) {
            table = '<strong>Error:</strong> attempt to call '
                  + svcUrl + ' resulted in this error: ' + error; 
         }
         else {
            try {
               data = JSON.parse(body);
               info = data.puppet.info;
               data.puppet.version = info.puppetversion;
               aemStr = data.aem.version.match(/^5/) ? 'CQ5' : 'AEM';

               table = 
                  '<table class="table table-striped">' +
                  '  <tr><th>' + aemStr + '</th><td>' + buildAemMsg(data) + '</td></tr>' +
                  '  <tr><th>Jenkins</th><td>'  + buildJenkinsMsg(data)  + '</td></tr>' +
                  '  <tr><th>Puppet</th><td>'   + buildPuppetMsg(data)   + '</td></tr>' + 
                  '  <tr><th>GIT_WEM</th><td>'  + buildWemMsg(data)      + '</td></tr>' +
                  '  <tr><th>Deploy</th><td>'   + buildDeployMsg(data)   + '</td></tr>' +
                  '  <tr><th>Disk</th><td>'     + buildDiskMsg(data)     + '</td></tr>' +
                  '  <tr><th>Memory</th><td>'   + buildMemMsg(info)      + '</td></tr>' +
                  '  <tr><th>IP</th><td>'       + info.ipaddress         + '</td></tr>' +
                  '  <tr><th>OS</th><td>'       + info.distro_version    + '</td></tr>' +
                  '  <tr><th>Uptime</th><td>'   + buildUptimeMsg(info)   + '</td></tr>' +
                  '</table>';
            }
            catch (ex) {
               table = '<strong>Error:</strong> attempt to call '
                     + svcUrl + " resulted in this error: <pre>\n" + ex
                     + "</pre><hr/>Result was:<pre>\n" + body.replace(/</g,'&lt;') + '</pre>'; 
            }
         }

         //console.log("Table: ",table);
         callerResponse.writeHead(200, {
            "Content-Type": "text/html"
         });
         callerResponse.end(table);
      } // end anon function arg to request()
   ); // end request()
} // end getStatusTable()

// finally, externalize the table builder as 'status()'
exports.html_table = function(request, response) {
   'use strict';
    return getStatusTable(statusSvc,response);
};
