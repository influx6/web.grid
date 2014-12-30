/*
  Released under the MIT license
*/

var http = require('http'),
    mx = require('routd'),
    url = require('url'),
    engineio = require('engine.io'),
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

excom.registerPlug('engineio.server',function(){
  var by,self = this;
  var server,hs = http.createServer(this.$closure(function(req,res){
    req.res = res;
    if(req.url.substring(1,3) !== by){
      this.Task('http.server.request',req);
    }
  }));

  hs.on('error',function(e){
    this.Task('http.server.errors',{'e': e});
  });

  this.pub('io.Up');
  this.on('io.Up',this.$bind(function(){
    server = engineio.attach(hs,this.getConfigAttr('ops'));
    self.config({ httpServer: hs, ioServer: server });
    server.on('connection',function(socket){
      socket.send('yay!');
    });
  }));

  var done = false;
  this.tasks().on(this.$closure(function(p){
      if(done || stacks.valids.not.exists(p.body)) return;
      var body = p.body, addr = body.addr, port = body.port, fn = body.fn;
      by = body.by || 'io';
      if(stacks.valids.not.exists(port)) return;
      hs.listen.call(hs,port,addr || '127.0.0.1',fn);
      this.config({'address': addr, 'port': port, by: by, ops: body.ops });
      this.tasks().lock();
      this.tasks().flush();
      this.emit('io.Up',this);
      done = true;
  }));


});

excom.registerPlug('http.request',function(){
  this.tasks().on(this.$closure(function(p){
    this.Reply('http.request',p.body);
  }));
});

excom.registerPlug('web.router',function(){
  var px = mx.Router.make();

  var routes = this.newTaskChannel('route','web.router.route');
  var unroutes = this.newTaskChannel('unroute','web.router.unroute');

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

  unroutes.on(function(p){
    var body = p.body, url = body.url;
      if(stacks.valids.not.exists(body) || stacks.valids.not.isString(url)) return;
      px.unroute(url);
  });

  this.tasks().on(this.$closure(function(p){
    var req = p.body;
    if(req && req.res){
      px.analyze(req.url,req.method,req);
    }
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

  this.on('close',this.$bind(function(){
    this.Task('web.router.unroute',{ url: this.id });
  }));
});

excom.registerPlug('web.resource',function(){
  this.config({
    resources: _.Storage.make('web.resources.processor'),
    router: mx.Router.make()
  });
  var resd = this.getConfigAttr('resources');


  this.newTaskChannel('res.new','web.resource.new');
  this.newTaskChannel('res.rm','web.resource.remove');


  this.tasks().on(this.$bind(function(p){
    //we handle the resource request comming in here
    var body = p.body, url = body.url, method = body.method;
    this.getConfigAttr('router').analyze(url,null,p);
  }));


});


excom.registerCompose('web.basic',function(){

  this.use(excom.Plug('http.server','io.server'),'app');
  this.use(excom.Plug('http.request','http.server.request'),'app.console');
  this.use(excom.Plug('web.router','http.server.request'),'app.router');
  this.use(excom.Plug('web.request','/*'),'app.route./*');
  this.use(excom.Plug('web.request','404'),'app.route.404');

  this.get('app.console').attachPoint(function(q,sm){
    var req = q.body;
    var head = stacks.Util.String(' ','[WebRequest]'.red,'Method:'.grey,req.method.green,','.grey);
    var body = stacks.Util.String(' ','Url:'.grey,req.url.green);
    console.log(head,body);
  },null,'web.console');

  this.get('app.route./*').attachPoint(function(q,sm){
    var req = q.body.req, res = req.res;
      res.writeHead(200);
      return res.end('welcome to /\n');
  },null,'home.all');

  this.get('app.route.404').attachPoint(function(q,sm){
    var req = q.body.req, res = req.res;
      res.writeHead(200);
      return res.end('Sorry 404 to '+req.url+'\n');
  },null,'home.404');

  this.Task('web.router.route',{url:'/*'});


});

excom.registerCompose('web.engineio',function(){

  var ereg = /(\/*)io(\/?)([\w+\W+]*)?/;

  this.use(excom.Plug('engineio.server','io.server'),'app');
  this.use(excom.Plug('http.request','http.server.request'),'app.console');
  this.use(excom.Plug('web.router','http.server.request'),'app.router');
  // this.use(excom.Plug('web.request','/*'),'app.route./*');
  // this.use(excom.Plug('web.request','404'),'app.route.404');

  this.get('app.console').attachPoint(function(q,sm){
    var req = q.body;
    var head = stacks.Util.String(' ','[WebRequest]'.red,'Method:'.grey,req.method.green,','.grey);
    var body = stacks.Util.String(' ','Url:'.grey,req.url.green);
    console.log(head,body);
  },null,'web.console');

  // this.get('app.route./*').attachPoint(function(q,sm){
  //   var req = q.body.req, res = req.res, path = url.parse(req.url);
  //   if(!ereg.test(path.path)){
  //     res.writeHead(200);
  //     return res.end('welcome to /\n');
  //   }
  // },null,'home.all');

  // this.get('app.route.404').attachPoint(function(q,sm){
  //   var req = q.body.req, res = req.res;
  //     res.writeHead(200);
  //     return res.end('Sorry 404 to '+req.url+'\n');
  // },null,'home.404');
  //
  // this.Task('web.router.route',{url:'/*'});


});
