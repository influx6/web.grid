/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stackq');
var plug = require('plugd');
var express = require('../web.plug.js');
var url = require('url');
var expects = stacks.Expects;

stacks.Jazz('plate specification', function (_){

  var net = express.createComposer('test.com').use('serv.com','webplug.web');
  var serv = net.get('serv.com');


  serv.get('app.route./*').attachPoint(function(p,sm){
    conole.log('point:',p);
      _('can i get a request from the server',function($){
        $.async(function(d,next,g){
          expects.truthy(d);
          expects.truthy(d.body);
          expects.truthy(d.body.res);
          expects.truthy(d.body.url);
          next();
        });
        $.for(p);
      });
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
      next();
      expects.truthy(d);
      expects.truthy(plug.Packets.isPacket(d));
      // stacks.funcs.doIn(process.exit,300)
    });
    $.for(serv.Task('web.server',{ port: 3000, address: '127.0.0.1'}));
  });

});
