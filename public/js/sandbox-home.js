// originally this was inline in the sandbox index.html

/*jslint browser: true, nomen: true, unparam: true, white: true */
/*properties
    _id, animate, append, assignment, attr, branch, click, date, each, get,
    hostname, html, length, 'letter-spacing', location, name, next, notes,
    notifications, prepend, profile, prop, prototype, ready, replace, sandBox,
    slice, startsWith, success, toLowerCase, toggle
*/
/*globals jQuery: true */

(function(){
   'use strict';

   var agentSvc  = "http://dobby.cisco.com:3000/api/agents",
       statusSvc = "/api/status/html",
       host      = location.hostname.replace(/\.cisco\.com/,'').toLowerCase(),
       fqdn      = host + '.cisco.com',
       thisName;

   jQuery.get("navbar.html").success(function (data) {
      jQuery("body").prepend(data);
   });

   jQuery("#hostNameHeading").append(location.hostname);

   setInterval(
      function(){
         jQuery("#hostNameHeading").animate({"letter-spacing": ".2px"}, 1000 ).animate({"letter-spacing": "0px"}, 500 );
      },
      15000
   );

   jQuery.get(agentSvc).success(function (data) {
      jQuery.each(data, function(i,obj) {
         thisName = obj.name.toLowerCase();
         if (thisName === host || thisName === fqdn) {
            jQuery("#agent").append(
               '<table class="table table-striped">' +
               '<tr><th>id</th><td>'                 + obj._id                + '</td></tr>' +
               '<tr><th>Name</th><td>'               + obj.name               + '</td></tr>' +
               '<tr><th>Profile</th><td>'            + obj.profile            + '</td></tr>' +
               '<tr><th>Assignment</th><td>'         + obj.assignment         + '</td></tr>' +
               '<tr><th>Notifications</th><td>'      + obj.notifications      + '</td></tr>' +
               '<tr><th>Sandbox Available</th><td>'  +(obj.sandBox?'Yes':'No')+ '</td></tr>' +
               '<tr><th>Date</th><td>'               + obj.date               + '</td></tr>' +
               '<tr><th>Branch</th><td>'             + obj.branch             + '</td></tr>' +
               '<tr><th>Notes</th><td>'              + obj.notes              + '</td></tr>' +
               '</table>'
            );
         } // end 'if'
      }); // end each()
   }); // end get().success()

   function addStatusTable(selector) {
      jQuery.get(statusSvc).success(function (data) {
         jQuery(selector).append(data);

         // set up accordions
         jQuery('.accordion-section-title').click(function(e) {
            jQuery(this).next().toggle('fast');
         }); // end click()
      }); // end get().success()
   } // end addStatusTable()


   jQuery(document).ready(function() {
      addStatusTable('#status');

      // prep for the following each()
      if (typeof String.prototype.startsWith !== 'function') {
         String.prototype.startsWith = function(str) {
            return this.slice(0, str.length) === str;
         };
      }

      jQuery('a').each(function(){
         if (jQuery(this).attr('href').startsWith(':')) {
            jQuery(this).prop('href','//'+window.location.hostname+jQuery(this).attr('href'));
         }
         if (jQuery(this).html().startsWith(':')) {
            jQuery(this).html('http://'+window.location.hostname+jQuery(this).html());
         }
      }); // end each()
   }); // end ready()
}()); // end anon function
