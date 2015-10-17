(function() {
   'use strict';
   var exec = require('child_process').exec,
       path = require('path'),
       request = require("request"),
       async = require("async");

  function status_all(res){
    //responese object
     var allsandboxstatusResponse={
          success_sandboxs:[],
          failure_sandboxs:[],
          error: ""
      };
      //storing all domain name
      var domain_list=[]

      var fetchDomaindetails=function(domain_name,doneCallbak){

          //fetching agent info
          var service_url="http://"+domain_name+"/api/status";
          request({
              url: service_url
          }, function(error, response, body) {
              console.log(domain_name);
              var result={};
              result["domain"]=domain_name;
              result["url"]=service_url;
              if (error || response.statusCode !== 200) {
                  result["data"]="";
                  result["error"]="Not able to pull the data from "+domain_name+" server";
                  allsandboxstatusResponse.failure_sandboxs.push(result);
              }
              else {
                var data = JSON.parse(response.body);
                result["data"]=data
                result["error"]="";
                allsandboxstatusResponse.success_sandboxs.push(result);
              }
              return doneCallbak(null);
          });
      }


      //fetching domain or agent name from dobby
      request({
          url: "http://dobby.cisco.com:3000/api/agents"
      }, function(error, response, body) {
          var data;
          if (error || response.statusCode !== 200) {
              allsandboxstatusResponse.error = "Not able to pull the data from dobby server";
              res.jsonp(allsandboxstatusResponse);
          }

          data = JSON.parse(response.body);
          for (var i=0;i<data.length;i++) {
                var domain=data[i].name;
                if(!domain.match(".cisco.com$")){
                    domain=domain+".cisco.com"
                }
                console.log(data[i].profile.toLowerCase());
                if(data[i].profile.toLowerCase().match(/sandbox/g)){
                  domain_list.push(domain);
                }
          }
          async.map(domain_list,fetchDomaindetails,function(err,results){
            console.log("Finished!");
            res.jsonp(allsandboxstatusResponse);
          })
      });

  }

  exports.status_all = function(request, response) {
     //cross-domain-jsonp
     status_all(response);
   };
}());
