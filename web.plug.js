/*
  Released under the MIT license
*/

var http = require('http'),
    express = require('express'),
    mx = require('routd'),
    url = require('url'),
    bp = require('body-parser'),
    // cp = require('cookieparser'),
    stacks = require("stackq"),
    plug = require("plugd");

var webRequestID = 0x32FFA5656;
var excom = module.exports = plug.Rack.make('web.plug');

excom.registerPlug('http.server',function(){
  var server = http.createServer(this.$closure(function(req,res){
    req.res = res;
    this.Task('http.server.request',req);
  }));

  server.on('error',function(e){
    this.Task('http.server.errors',{'e': e});
  });

  var done = false;

  this.tasks().on(this.$closure(function(p){
      if(done || stacks.valids.not.exists(p.body)) return;
      var body = p.body, addr = body.addr, port = body.port, fn = body.fn;
      if(stacks.valids.not.exists(port)) return;
      server.listen.call(server,port,addr || '127.0.0.1',fn);
      this.config({'address': addr, 'port': port});
      this.tasks().lock();
      this.tasks().flush();
      done = true;
  }));

});

excom.registerPlug('http.request',function(){
  this.tasks().on(this.$closure(function(p){
    this.Reply('http.request',p.body);
  }))
});

excom.registerPlug('web.router',function(){
  var px = mx.Router.make();

  var routes = this.newTaskChannel('routes','web.router.route');
  var rbind = this.channel.stream(routes);

  var self = this;
  px.on('404',function(c,m,p){
    self.Task('404',{
      'req': p,
      'method':p.method.toLowerCase(),
      'map':c,
      'gid': webRequestID
    });
  });

  routes.on(function(p){
    var body = p.body, url = body.url, method = body.method,conf = body.config;
      if(stacks.valids.not.exists(body) || stacks.valids.not.isString(url)) return;
      px.route(url,method,conf);
      px.on(url,function(c,m,p){
        self.Task(url,{
          'req': p,
          'method':p.method.toLowerCase(),
          'map':c,
          'gid': webRequestID
        });
      });
  });

  this.tasks().on(this.$closure(function(p){
    var req = p.body;
    if(req && req.res){ px.analyze(req.url,req.method,req); }
  }));

});

excom.registerPlug('web.request',function(){
  this.tasks().on(this.$bind(function(p){
    var body = p.body;
      if(body.gid && body.gid == webRequestID){
        var f = this.Reply(body.method,body);
        f.secret = 'web.request.root';
      }
  }));
});

excom.registerCompose('web.basic',function(){

  this.use(excom.Plug('http.server','web.server'),'app');
  this.use(excom.Plug('web.router','http.server.request'),'app.router');
  this.use(excom.Plug('web.request','/*'),'app.route./*');
  this.use(excom.Plug('web.request','404'),'app.route.404');


  this.get('app.route./*').attachPoint(function(q,sm){
    var req = q.body.req, res = req.res;
      res.writeHead(200);
      return res.end('welcome to /\n');
  },null,'home.all');

  this.Task('web.router.route',{url:'/*'});

});
