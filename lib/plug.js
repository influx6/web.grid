/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />
var stacks = require('stackq');
var channels = require("./channels");
var messages = require("./messages");
var uuids = require("./packuuid");
var valids = stacks.Valids;
var funcs = stacks.Funcs;
var structs = stacks.structs;

var MessagePicker = function (f) {
    return f.message;
};
exports.MessagePicker = MessagePicker;

var Plug = stacks.Class({
  init: function(id){
    structs.Asserted(valids.isString(id),"first argument must be a string");
    this.contractId = id;
    this.outChannel = new channels.Channel();
    this.inChannel = new channels.SelectedChannel(this.contractId, MessagePicker);
    this.mutator = stacks.structs.Middleware(funcs.bind(this.inChannel.emit,this.inChannel));
    this.mutator.add(function(d, next, end) {
        if (d.tag && d.tag != uuids.tasks()) return null;
        return next(d);
    });
  },
  bindPlate: function(plate){
      plate.listen(funcs.bind(this.mutator.emit,this.mutator));
      this.outChannel.bind(plate.$scoped('dispatch'));
  },
  removePlate: function(plate){
    plate.unlisten(this.mutator.emit);
    this.outChannel.unbind(plate.$scoped('dispatch'));
  },
  dispatchMessage: function(id){
    var self = this,cm = new messages.MessagePack(id);
    cm.ready(function(){
      self.dispatch(cm);
    });
    return cm.shell();
  },
  dispatch: function (t) {
    if(!(valids.isInstanceOf(t,messages.MessagePack))) return;
    this.outChannel.emit(t);
  },
  onOut: function (t) {
      this.inChannel.bind(t);
  },
  outOnce: function (t) {
      this.inChannel.bindOnce(t);
  },
  offOut: function (t) {
      this.inChannel.unbind(t);
  },
  offOutOnce: function (t) {
      this.inChannel.unbindOnce(t);
  },
  listen: function (t) {
      this.inChannel.bind(t);
  },
  listenOnce: function (t) {
      this.inChannel.bindOnce(t);
  },
  unlisten: function (t) {
      this.inChannel.unbind(t);
  },
  unlistenOnce: function (t) {
      this.inChannel.unbindOnce(t);
  },
  linkOut: function () {
      return this.outChannel.link();
  },
  linkIn: function () {
      return this.inChannel.link();
  }
});

exports.Plug = Plug;

var Plate = structs.Class({
  init: function(id) {
      this.messages = new channels.Channel();
      this.mutator = stacks.structs.Middleware(funcs.bind(this.messages.emit,this.messages));
  },
  plug: function(id){
    var pl =  new Plug(id);
    pl.bindPlate(this);
    return pl;
  },
  plugQueue: function(){
    return new PlugQueue(this);
  },
  createMessage: function(id){
     var self = this,
     mesg = new messages.MessagePack(id,uuids.tasks());
     mesg.streamMid.add(function(f,next,end){
        if(!valids.exists(f['uuid']) && !valids.exists(f['data'])) return;
        return next();
     });
     return mesg;
  },

  dispatchMessage:  function (id,uuid,data) {
    structs.Asserted(valids.exists(id),"one arguments is required (id)");
    var self = this, mesg = this.createMessage(id);
    if(valids.exists(data) && valids.exists(uuid)) mesg.pack({'uuid': uuid, data: data});
    mesg.ready(function(){
      self.dispatch(mesg);
    });
    return mesg.shell();
  },

  task: function (id, uuid, data) {
      var task = this.watch(uuid);
      task.task = this.dispatchMessage(id,uuid,data);
      return task;
  },
  watch: function(uuid){
    var channel = new channels.SelectedChannel(uuid, MessagePicker);
    this.listen(funcs.bind(channel.emit,channel));
    return channel;
  },
  dispatch: function (t) {
      this.mutator.emit(t);
  },
  listen: function (t) {
      this.messages.bind(t);
  },
  listenOnce: function (t) {
      this.messages.bindOnce(t);
  },
  unlisten: function (t) {
      this.messages.unbind(t);
  },
  unlistenOnce: function (t) {
      this.messages.unbindOnce(t);
  },
  link: function () {
      return this.messages.link();
  },
});

exports.Plate = Plate;

var PlugQueue = stacks.Class({
  init: function(pl){
    structs.Asserted(valids.isInstanceOf(pl,Plate),"argument must be an instance of plate");
    this.plate = pl;
    this.typeList = {};
    this.wq = stacks.structs.WorkQueue();
    this.active = stacks.structs.Switch();

    this.onDone = stacks.Funcs.bind(this.wq.done.add,this.wq.done);
    this.onDoneOnce = stacks.Funcs.bind(this.wq.done.addOnce,this.wq.done);
    this.offDone = stacks.Funcs.bind(this.wq.done.add,this.wq.done);
  },
  peek: function(fn){
    this.wq.queue(fn);
  },
  queue: function(name,uuid){
    var self = this,
    guid = uuid || [name,stacks.Util.guid()].join(':'),
    chan = this.plate.watch(guid);
    chan.__guid = guid;

    if(this.typeList[guid]) return guid;

    this.typeList[guid] = ({
      'plug':name,
      'uuid': guid,
      'index': this.typeList.length,
      'watch':chan,
      'fn': stacks.Funcs.bind(function(f){
        return this.plate.dispatchMessage(name,guid,f);
      },self)
    });

    return chan;
  },
  unqueue: function(pl){
    if(!this.has(pl)) return null;
    this.typeList[pl] = null;
  },
  has: function(n){
    return !!this.typeList[n];
  },
  __pack: function(){
    var self = this,e,m;
    for(m in this.typeList){
      e = this.typeList[m];
      if(stacks.Valids.notExists(e)) return;
      var plug = e['plug'],fn = e['fn'], chan = e['watch'];
      chan.bindOnce(function(f){ self.emit(f); });
      self.wq.queue(fn);
    };
    self.wq.queue(function(f){
      self.active.off();
    });
  },
  emit: function(f){
    if(!this.active.isOn()) this.__pack();
    this.active.on();
    return this.wq.emit(f);
  }
});
exports.PlugQueue = PlugQueue;
