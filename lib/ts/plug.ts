/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />

import stacks = require("stacks");
import channels = require("./channels");
import adapters = require("./adapters");
import messages = require("./messages");

var MessagePicker = function(f: Plug.MessagePack): any{
  return f['message'];
};

export class Plug implements Plug.PlugInterface{
  private inChannel: channels.SelectedChannel<Plug.MessagePack>;
  private contractId:any;
  plate: Plug.PlateInterface;
  contract:any;
  mutator: any;

  constructor(id: any,pl: Plug.PlateInterface){
    this.plate = pl;
    this.contractId = id;
    this.inChannel = new channels.SelectedChannel<Plug.MessagePack>(this.contractId,MessagePicker);
    this.mutator = stacks.structs.Middleware(this.inChannel.emit);
    this.mutator.add(function(d,next,end){
        if(!d['task'])return null;
        return next(d['task']);
    });
    this.plate.listen(this.mutator.emit);
  }

  dispatch(t: Plug.MessagePack){
    this.plate.dispatch(t);
  }

  listen(t): void{
    this.inChannel.bind(t);
  }

  listenOnce(t): void{
    this.inChannel.bindOnce(t);
  }

  unlisten(t): void{
    this.inChannel.unbind(t);
  }

  unlistenOnce(t): void{
    this.inChannel.unbindOnce(t);
  }

  link(): channels.ChannelLink<Plug.MessagePack>{
    return this.inChannel.link();
  }
}

export class Plate implements Plug.PlateInterface{
  private messages: channels.Channel<Plug.MessagePack>;
  mutator: any;

  constructor(id){
    this.messages = new channels.Channel<Plug.MessagePack>();
    this.mutator = stacks.structs.Middleware(this.messages.emit);
  }

  task(id:string, uuid: string, data: any): void{
    return this.dispatch({
      'message': id,
      'task':{
        'uuid': uuid,
        'data': data
      }
    });
  }

  watchTask(id:string,uuid: string, data: any): channels.SelectedChannel<Plug.MessagePack>{
    var task = new channels.SelectedChannel<Plug.MessagePack>(uuid,MessagePicker);
    this.listen(task.emit);
    this.task(id,uuid,data);
    return task;
  }

  dispatch(t: Plug.MessagePack){
    this.mutator.emit(t);
  }

  listen(t): void{
    this.messages.bind(t);
  }

  listenOnce(t): void{
    this.messages.bindOnce(t);
  }

  unlisten(t): void{
    this.messages.unbind(t);
  }

  unlistenOnce(t): void{
    this.messages.unbindOnce(t);
  }

  link(): channels.ChannelLink<Plug.MessagePack>{
    return this.messages.link();
  }

}
