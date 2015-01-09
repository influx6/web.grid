/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stackq');
var plug = require('plugd');
var web = require('../web.plug.js');
var url = require('url');
var expects = stacks.Expects;

stacks.Jazz('plate specification', function (_){

  var webr = web.ioBasic;
  webr.use(web.Plug('web.resource','http.server.request'),'webr');

  webr.Task('web.resource.new',{ model: 'admins', conf:{
    has: 'comments', 'params': {
      'id':'digits'
    }
  }});

  webr.Task('web.resource.update',{ model: 'admins', map:{
    find: function(map,payload,method){
      _('can i get a find request',function($){
        $.sync(function(d,g){
          expects.truthy(map);
          expects.isObject(map);
          expects.truthy(payload);
        });
      }).use(true);
    },
    findOne: function(map,payload,method){
      _('can i get a findOne request',function($){
        $.sync(function(d,g){
          expects.truthy(map);
          expects.isObject(map);
          expects.truthy(payload);
        });
      }).use(true);
    },
    create: function(map,payload,method){
      _('can i get a create request',function($){
        $.sync(function(d,g){
          expects.truthy(map);
          expects.isObject(map);
          expects.truthy(payload);
        });
      }).use(true);
    },
    proxyComments: function(map,payload,method){
      _('can i get a /admins/comments request',function($){
        $.sync(function(d,g){
          expects.truthy(map);
          expects.isObject(map);
          expects.truthy(payload);
        });
      }).use(true);
    }
  }});

  webr.get('app.route./*').attachPoint(function(p,sm){
      _('can i get a request from the webrer',function($){
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
    $.for(webr.get('app'));
  });

  _('can i send webrer config as tasks?',function($){

    $.async(function(d,next,g){
      next();
      expects.truthy(d);
      expects.truthy(plug.Packets.isPacket(d));
      stacks.funcs.doIn(process.exit,3000);
    });
    $.for(webr.Task('io.server',{ port: 3000, address: '127.0.0.1'}));
  });

});
