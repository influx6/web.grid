/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stackq');
var plug = require('../plugd.js');
var structs = stacks.structs;
var expects = stacks.Expects;

stacks.Jazz('plate specification', function (_){

  var plate = plug.createPlate();
  var route = plate.plug('routes');
  var mplug = plate.plugQueue();

  route.listen(function(f){
    var m = plug.createMessage('43-12');
    route.dispatch(m);
  });

  var wc = mplug.queue('routes','43-12');
  mplug.peek(function(f){
    mplug.emit(f);
  });

  var am = plate.task('route','124345-322','/home.index');
  var reply =  plate.dispatchMessage('124345-322');

  var mesg = plate.createMessage('routes');
  mesg.pack({'uuid':'124-32','data': 'yes!'});
  mesg.ok();

  var home = plate.dispatchMessage('routes');
  home.pack({'uuid':'124-32','data': 'yes!'});

  _('can create a plate plug workqueue',function($){
    $.sync(function(d,g){
      expects.truthy(d);
    });
    $.for(mplug);
  });

  _('can use a plate plug workqueue',function($){
    $.async(function(d,next,g){
      route.listen(stacks.Funcs.bind(d.emit,d));
      home.ok();
      next();
    });
    $.for(mplug);
  });

  _('can create a plate for streams',function($){

    $.sync(function(d,g){
      expects.truthy(d);
      expects.isFunction(d.plug);
      expects.isFunction(d.plugQueue);
    });

    $.for(plate);

  });

  _('can i create a plug into the plate',function($){
    $.sync(function(d,g){
      expects.isInstanceOf(d,plug.plug.Plug);
    });
    $.for(route);
  });

  _('can get a response based on a plug',function($){

    $.async(function(d,next,g){
      am.bind(g(function(f){
        expects.truthy(f);
        expects.isInstanceOf(f,plug.message.MessagePack);
      }));
      next();
      am.task.ok();
      reply.ok();
    });

    $.for(am);
  });


});
