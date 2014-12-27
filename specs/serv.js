/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stackq');
var plug = require('plugd');
var web = require('../web.plug.js');
var url = require('url');
var expects = stacks.Expects;

stacks.Jazz('plate specification', function (_){

  var net = plug.Network.make('test.com');
  net.crate(web);
  net.use('web.plug/compose/web.basic','serv.com');

  var serv = net.get('serv.com');

  serv.get('app.route./*').attachPoint(function(p,sm){
      _('can i get a request from the server',function($){
        $.async(function(d,next,g){
          next();
          expects.truthy(d);
          expects.truthy(d.body);
        });
        $.for(p);
      });
  },null,'check');

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
      stacks.funcs.doIn(process.exit,3000)
    });
    $.for(serv.Task('web.server',{ port: 3000, address: '127.0.0.1'}));
  });

});
