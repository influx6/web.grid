/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var _ = require('stackq');
var grid = require('grid');
var web = require('../web.grid.js');
var url = require('url');
var http = require('http');

_.Jazz('plate specification', function ($){

  var consoler = web.bp.webConsole({});
  var webr = web.bp.httpServer({ address: '127.0.0.1', port: 3001 });
  var slog = web.bp.webRequest({ url: '/slog' , config: {}});

  var reply = web.bp.webReply({ fn: function(p){
    var req = p.body, res = req.res;
    res.writeHead(200,{'content-type':'text/plain'});
    res.end('Welcome!');
  }});
  var rejected = web.bp.webReply({fn: function(p){
    var req = p.body, res = req.res;
    res.writeHead(404,{'content-type':'text/plain'});
    res.end('Sorry not Accepted!');
  }});

  webr.a(consoler);
  webr.a(slog);
  slog.a(reply);
  slog.a(rejected,null,'rej');

  $('can i create a server',function(k){
     k.sync(function(d,g){
	_.Expects.truthy(d);
	_.Expects.isTrue(grid.Print.instanceBelongs(d))
     });
     k.for(webr);
  });

  slog.out().on(function(p){
    $('can i make a request',function(k){
      k.sync(function(d,guard){
	_.Expects.truthy(_.StreamPackets.instanceBelongs(d));
	_.Expects.is(d.body.url,'/slog');
      });
    }).use(p);
  });

  slog.out('rej').on(function(p){
    $('can i reject a request not matching',function(k){
      k.sync(function(d,guard){
	_.Expects.truthy(_.StreamPackets.instanceBelongs(d));
	_.Expects.isNot(d.body.url,'/slog');
      });
    }).use(p);
  });

  http.get("http://127.0.0.1:3001/slog",function(res){
    $('can i succeed in getting a 202 reply for slog',function(k){
      k.sync(function(d,guard){
	_.Expects.truthy(d);
	_.Expects.is(d.statusCode,200);
	_.Expects.is(d.socket._host,'127.0.0.1');
      });
    }).use(res);
  }).on('err',function(e){
    process.exit(0);
  });

  http.get("http://127.0.0.1:3001/slogs",function(res){
    $('can i succeed in getting a 404 reply for slogs',function(k){
      k.sync(function(d,guard){
	_.Expects.truthy(d);
	_.Expects.is(d.statusCode,404);
	_.Expects.is(d.socket._host,'127.0.0.1');
	webr.in('close').$.make({});
      });
    }).use(res);
  }).on('err',function(e){
    process.exit(0);
  });
});
