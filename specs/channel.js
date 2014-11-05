/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stackq');
var plug = require('../plugd.js');
var expects = stacks.Expects;

stacks.JzGroup('plug channel specification', function (_){
    var ch = plug.Channel.make();

    _('can i create a channel',function($) {
        $.sync(function (c) {
            expects.isObject(c);
        });

        $.sync(function (c) {
            expects.truthy(c);
        });

        $.asyncCount(3,function (c,next) {
            expects.truthy(c);
            next(); next(); next();
        });

        $.for(ch);
    });

    _('can i emit data within a channel',function($){
      $.async(function(c,next,g){
        c.once(g(function(f){
          expects.isObject(f);
        }));
        c.emit({'name':'alex'});
        return next();
      });

      $.for(ch);
    });

});
