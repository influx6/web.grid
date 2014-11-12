/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stackq');
var plug = require('plugd');
var express = require('../web.plug.js');
var url = require('url');
var expects = stacks.Expects;

stacks.Jazz('plate specification', function (_){

  var net = express.createComposer('http').use('serv.com');
  var serv = net.get('serv.com');
  var dts = serv.createTask('serv.server')
  .push({ port: 3000, address: '127.0.0.1'});

  serv.use('express.http.server','serv.server','app');
  serv.use('express.http.request','http.server.request','req');
  serv.use('express.web.router','http.server.request','router');
  serv.use('express.web.request','/','/');

  serv.createTask('web.router.route').push({'url':'/'}).ok();

  serv.plate.channels.packets.on(function(f){
    console.log('serv packet:',f.message);
  });
  serv.get('router').channels.packets.on(function(f){
    console.log('router packet:',f.message);
  });

  serv.get('router').channels.tasks.on(function(f){
    console.log('router task packet:',f.message);
  });

  serv.get('/').channels.tasks.on(function(f){
    console.log('/ task packet:',f.message);
  });

  serv.get('/').channels.replies.on(function(f){
    console.log('/ reply packet:',f.message);
    f.stream.$.all().on(console.log);
  });

  serv.get('req').attachPoint(function(p,sm){
    p.stream.$.one().on(this.bind(function(f){
      _('can i get a request from the server',function($){
        $.async(function(d,next,g){
          expects.truthy(d);
          expects.truthy(d.res);
          expects.truthy(d.url);
          next();
          d.res.end();
        });
        $.for(f);
      });
    }));
  },'http.request');

  _('can i get a added plug from the compose stack',function($){
    $.async(function(d,next,g){
      expects.truthy(d);
      expects.truthy(plug.Plug.isInstance(d));
      next();
    });
    $.for(serv.get('app'));
  });

  _('can i send server config as tasks?',function($){

    $.async(function(d,next,g){
      d.on(g(function(k){
        expects.truthy(k);
        expects.truthy(plug.Packets.isPacket(k));
        // stacks.funcs.doIn(process.exit,300)
      }));
      next();
      d.ok();
    });
    $.for(dts);
  });

});
