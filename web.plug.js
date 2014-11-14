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
var excom = module.exports = plug.Composable.make('express');

excom.registerPlug('http.server',function(){
  var server = http.createServer(this.$closure(function(req,res){
    req.res = res;
    this.createTask('http.server.request').push(req).ok();
  }));

  server.on('error',function(e){
    this.createTask('http.server.errors').push(e).ok();
  });

  var done = false;

  this.channels.tasks.on(this.$closure(function(p){
    return p.stream.$.all().on(this.$closure(function(i){
      if(done) return;
      if(!stacks.valids.isObject(i.data)) return;
      if(stacks.valids.notExists(i.data.port)) return;
      server.listen.call(server,i.data.port,i.data.address,i.data.fn);
      this.config({'address': i.data.address, 'port': i.data.port});
      this.channels.tasks.lock();
      this.channels.tasks.flush();
      done = true;
    }));
  }));

});

excom.registerPlug('http.request',function(){
  this.channels.tasks.on(this.$closure(function(p){
    return p.stream.$.all().on(this.$closure(function(d){
      this.createReply('http.request').push(d.data).ok();
    }));
  }));
});

excom.registerPlug('web.router',function(){
  var px = mx.Router.make();

  var routes = plug.TaskChannel.make('web.router.route');
  var rbind = this.channels.packets.stream(routes);

  var self = this;
  routes.on(function(p){
    return p.stream.$.all().on(function(f){
      if(!stacks.valids.isObject(f.data)) return;
      if(!stacks.valids.exists(f.data.url)) return;
      px.route(f.data.url,f.data.method,f.data.config);
      px.on(f.data.url,function(c,m,p){
        self.createTask(f.data.url).push({
          'req': p,
          'method':p.method.toLowerCase(),
          'map':c,
          'gid': webRequestID
        }).ok();
      });
    });
  });

  this.channels.tasks.on(this.$closure(function(p){
    return p.stream.$.all().on(this.$closure(function(f){
      if(f.data && f.data.res){
        px.analyze(f.data.url,f.data.method,f.data);
      }
    }));
  }));

});

excom.registerPlug('web.request',function(){
  this.channels.tasks.on(this.$closure(function(p){
    return p.stream.$.all().on(this.$closure(function(f){
      if(f.data.gid && f.data.gid == webRequestID){
        this.createReply(f.data.method).push(f.data).ok();
      }
    }));
  }));
});

excom.registerCompose('web',function(){

  this.use('express.http.server','web.server','app');
  this.use('express.web.router','http.server.request','app.router');
  this.use('express.web.request','/','app.route./');

  this.get('app.route./').attachPoint(function(q,sm){
    q.stream.$.all().on(function(f){
      f.req.res.writeHead(200);
      return f.req.res.end('welcome to /');
    });
  },'get','home.get');

  this.createTask('web.router.route').push({url:'/'}).ok();

});
