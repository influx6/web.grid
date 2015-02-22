var _ = require('stackq');
var grid = require('grids');
var web = require('../web.grid.js');
var url = require('url');
var http = require('http');

_.Jazz('plate specification', function ($){

  var consoler = web.bp.webConsole({});
  var webr = web.bp.httpServer({ address: '127.0.0.1', port: 3001 });
  var file_assets = web.bp.fileHost({ url: '/assets/*', base: './..' , config: {}});
  // var dir_assets = web.bp.dirHost({ url: '/assets/*', base: './..' , config: {}});

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
  webr.a(file_assets);
  file_assets.a(reply);
  file_assets.a(rejected,null,'rej');

  var file = http.request({
   hostname: '127.0.0.1',
   port: 3001,
   path: "/assets/web.grid.js",
   method: "get",
  },function(res){
    $('can i succeed in getting a 202 reply for slog',function(k){
      k.sync(function(d,guard){
	_.Expects.truthy(d);
	_.Expects.is(d.statusCode,200);
	_.Expects.is(d.socket._host,'127.0.0.1');
      });
    }).use(res);
  }).on('error',function(e){
    console.log('error',e);
    process.exit(0);
  });

  file.end();

  // var dir = http.request({
  //  hostname: '127.0.0.1',
  //  port: 3001,
  //  path: "/assets/.",
  //  method: "get",
  // },function(res){
  //   $('can i succeed in getting a 202 reply for slog',function(k){
  //     k.sync(function(d,guard){
	// _.Expects.truthy(d);
	// _.Expects.is(d.statusCode,200);
	// _.Expects.is(d.socket._host,'127.0.0.1');
  //     });
  //   }).use(res);
  // }).on('error',function(e){
  //   console.log('error',e);
  //   process.exit(0);
  // });

  // dir.end();

});
