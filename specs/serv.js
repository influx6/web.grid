/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stackq');
var plug = require('plugd');
var express = require('../web.plug.js');
var url = require('url');
var expects = stacks.Expects;

stacks.Jazz('plate specification', function (_){

  var net = express.createComposer('test.com').use('serv.com','express.web');
  var serv = net.get('serv.com');

  var dts = serv.createTask('web.server')
  .push({ port: 3000, address: '127.0.0.1'});

  serv.get('app.route./').attachPoint(function(p,sm){
    p.stream.$.one().on(this.bind(function(f){
      _('can i get a request from the server',function($){
        $.async(function(d,next,g){
          expects.truthy(d);
          expects.truthy(d.res);
          expects.truthy(d.url);
          next();
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
        stacks.funcs.doIn(process.exit,300)
      }));
      next();
      d.ok();
    });
    $.for(dts);
  });

});
