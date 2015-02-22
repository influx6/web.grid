/*
  Released under the MIT license
*/

var http = require('http'),
    _ = require("stackq"),
    url = require('url'),
    pm = require('pathmax'),
    routd = require('routd'),
    resq = require('resourcedjs'),
    utils = require('utils.grid'),
    fs = require('fs.grid'),
    grid = require("grids");

var web = module.exports = { bp:{}, mutators:{}, misc:{}};

web.misc.urlShift = function(url){
  if(_.valids.not.String(url)) return;
  var ps = url.split('/');
  if(_.enums.first(ps) === ''){
     return _.enums.nthRest(ps,2).join('/');
  }
  return _.enums.nthRest(ps,1).join('/')
};

web.bp.httpServer = grid.Blueprint('http.server',function(){
  if(!this.hasConfigAttr('address')) this.config({ address: '127.0.0.1' });
  if(!this.hasConfigAttr('port')) this.config({ port: '3001'});
	
  this.newIn('reload');
  this.newIn('close');

  this.newOut('connect');

  var server,address = this.getConfigAttr('address'),
      port = this.getConfigAttr('port');

  var creator = function(addr,port){ 
    var serv = http.createServer(this.$bind(function(req,res){
      req.res = res;
      var p = this.out().$.make(req);
      req.on('data',p.$emit);
      req.on('end',p.$end);
    }));

    serv.on('connect',function(req,socket,head){
       this.out('connect').$.make({ 
          req: req, 
          socket: socket,
          head:head  
       });
    });

    serv.on('error',function(e){
       this.out('err').$.make(e);
    });

    serv.listen(port,addr);
    return serv;
  };

  this.in('close').pause();

  this.in('reload').on(this.$bind(function(){
     server = creator.call(this,address,port);
     this.in('close').resume();
  }));

  this.in('close').on(this.$bind(function(){
     server.close();
  }));

  this.in('reload').$.make({});
});

web.bp.webRequest = grid.Blueprint('web.request',function(){
  _.Asserted(this.hasConfigAttr('url'),'supply a url property as arguments in the map eg. {url:..}');

  var iurl = this.getConfigAttr('url'), 
      config = this.getConfigAttr('config');

  this.newOut('rej');

  var solver = pm(iurl,config);

  this.in().on(this.$bind(function(p){
    if(_.valids.not.exists(p.body.res) && _.valids.not.exists(p.body.url)) return;

    var b = p.body, url = b.url, poll = solver.collect(url);
    p.config({ meta: poll });

    if(!!poll.state){
      this.out().emit(p);
    }else{
      this.out('rej').emit(p);
    }

  }));
});

web.bp.requestMethod = grid.Blueprint('request.method',function(){
  var method = this.getConfigAttr('method');

  this.in().on(this.$bind(function(p){
    if(_.valids.not.exists(p.body.method)) return;
    if(method){
      if(_.valids.RegExp(method) && !method.test(p.body.method)) return;
      if(_.valids.Function(method) && !method(p.body.method,p)) return;
      if(_.valids.String(method) && method !== p.body.method) return;
    }
    return this.out().emit(p);
  }));
});

web.bp.webReply = grid.Blueprint('web.reply',function(){
  var fn = this.getConfigAttr('fn');

  _.Asserted(_.valids.Function(fn),'you must pass in a "fn" attribute with a function as value eg. { fn:[Function]}');

  this.in().on(this.$bind(function(p){
    if(_.valids.not.exists(p.body.res)) return;
    return this.$bind(fn)(p);
  }));
});

web.bp.webConsole = grid.Blueprint('web.console',function(q,sm){
  this.in().on(this.$bind(function(p){
    var req = p.body;
    var head = _.Util.String(' ','[WebRequest]'.red,'Method:'.grey,req.method.green,','.grey);
    var body = _.Util.String(' ','Url:'.grey,req.url.green);
    console.log(head,body);
    this.out().emit(p);
  }));
});

web.bp.webResource = grid.Blueprint('web.resource',function(){
  if(!this.hasConfigAttr('model')) this.config({ model: 'model'});

  var model = this.getConfigAttr('model');
  this.config({ resource: resq.make(model) });

  var resd = this.getConfigAttr('resource');

  this.newIn('use');
  this.newIn('custom');

  this.in('use').on(this.$bind(function(p){
    var b = p.body, model = b.model, map = b.map;
    if(stacks.valids.not.Object(map)) return;
    return resd.use(map);
  }));

  this.in('custom').on(this.$bind(function(p){
    var b = p.body, model = b.model, map = b.map;
    if(stacks.valids.not.Object(map)) return;
    return resd.useCustom(map);
  }));

  this.in().on(this.$bind(function(p){
    //we handle the resource request coming in here
    var body = p.body, url = body.url, method = body.method;
    if(stacks.valids.not.exists(url)) return;
    rt.request(url,method,p);
  }));
});

web.bp.clientGet = grid.Blueprint('clientGet',function(){
 this.in().on(this.$bind(function(p){
  if(_.valids.not.contains(p.body,'url')) return;
  var req = http.get(p.body.url,this.$bind(function(res){
    this.out().$.make(res);
  }));
  req.on('error',this.$bind(function(e){
    this.out('err').$.make(e);
  }));
 }));
});

web.bp.clientRequest = grid.Blueprint('client.request',function(){
 this.newOut('socket');
 this.in().on(this.$bind(function(p){
  var stream = p.stream(),
  req = http.get(p.body,this.$bind(function(res){
    this.out().$.make(res);
  }));
	
  req.on('socket',this.$bind(function(socket){
    this.out('socket').emit(socket);
  }));

  req.on('error',this.$bind(function(e){
    this.out('err').$.make(e);
  }));
  
  stream.on(function(f){ req.write(f); });
  stream.on('dataEnd',function(){ req.end(); });
 }));
});

web.bp.fileHost = grid.Blueprint('file.Host',function(){
  var config = this.peekConfig();
  var pconf = this.getConfigAttr('config') || {};

  var reqs = this.pack(web.bp.webRequest(config));
  var gets = this.pack(web.bp.requestMethod({ method: /get/i }));
  var readcontrol = this.pack(fs.bp.ioReadDirector(config));
  var reader = this.pack(fs.bp.fileRead(config));

  this.ai(reqs);
  reqs.a(gets);
  readcontrol.a(reader,null,'file');

  gets.ao(this,'err','err');
  reqs.ao(this,'err','err');
  readcontrol.ao(this,'err','err');
  reader.ao(this,'err','err');
  reader.ao(this);

  this.out().on(function(p){
    var body = p.peekConfig();
    console.log('filehost-out',p,body);
  });

  gets.out().on(this.$bind(function(p){
    var b = p.body, url = b.url, shifted = web.misc.urlShift(url);
    if(shifted === ''){
      return this.out('err').$.clone(p,{ 
         err: new Error('incorrect url'),
	 url: url
      });
    };
    b.file = shifted;
    b.req = b;
    readcontrol.in('file').emit(p);
  }));
});

web.bp.dirHost = grid.Blueprint('dir.Host',function(){
  var config = this.peekConfig();
  var pconf = this.getConfigAttr('config') || {};

  var reqs = this.pack(web.bp.webRequest(config));
  var gets = this.pack(web.bp.requestMethod({ method: /get/i }));
  var readcontrol = this.pack(fs.bp.ioReadDirector(config));
  var reader = this.pack(fs.bp.dirRead(config));

  this.ai(reqs);
  reqs.a(gets);
  readcontrol.a(reader,null,'dir');
  reader.ao(this);

  gets.ao(this,'err','err');
  reqs.ao(this,'err','err');
  reader.ao(this,'err','err');
  readcontrol.ao(this,'err','err');

  gets.out().on(this.$bind(function(p){
    var b = p.body, url = b.url, shifted = web.misc.urlShift(url);
    if(shifted === ''){
      return this.out('err').$.clone(p,{ 
         err: new Error('incorrect url'),
         url: url
      });
    };
    b.file = shifted;
    readcontrol.in('dir').emit(p);
  }));
});

