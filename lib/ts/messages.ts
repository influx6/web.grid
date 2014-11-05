/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />

import stacks = require('stacks');

export class MessagePack{
  private ispack: boolean;
  private streams: any;
  private readyBus: any;
  message: string;

  static createMessagePack = function(message): MessagePack{
    var pack = new MessagePack(message);
    return pack;
  }

  constructor(message){
    this.ispack = false;
    this.message = message;
    this.readyBus = stacks.as.Distributors();
    this.streams = stacks.streams.Streamable();
    this.streams.pause();
  }

  pack(f: Plug.MessagePack): void{
    this.streams.emit(f);
  }

  ready(f: (g?: any) => void): void{
    this.readyBus.add(f);
  }

  ok(): void{
    if(stacks.ascontrib.valids.isTrue(this.ispack))
      return null;
    this.ispack = true;
    this.readyBus.distributeWith(this,true);
    this.streams.resume();
  }

}
