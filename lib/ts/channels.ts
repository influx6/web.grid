/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />

import stacks = require("stacks");

export class ChannelLink<T> implements Plug.ChannelLinkInterface<T>{
  private channel: Plug.ChannelInterface<T>;
  private mutator: any;
  private distributor: any;

  constructor(channel: Plug.ChannelInterface<T>){
    this.distributor = stacks.as.Distributors();
    this.mutator = stacks.structs.Middleware(this.hook);
    this.channel.bind(this.mutator.emit);
  }

  addMutate(f: Plug.OneArgFunction<T>): void{
    this.mutator.add(f);
  }

  removeMutate(f: Plug.OneArgFunction<T>): void{
    this.mutator.remove(f);
  }

  listen(f: Plug.OneArgFunction<T>): void{
    this.distributor.add(f);
  }

  listenOnce(f: Plug.OneArgFunction<T>): void{
    this.distributor.add(f);
  }

  unlisten(f: Plug.OneArgFunction<T>): void{
    this.distributor.remove(f);
  }

  unlistenOnce(f: Plug.OneArgFunction<T>): void{
    this.distributor.remove(f);
  }

  die(): void{
    this.channel.unbind(this.hook);
  }

  hook(m): void{
    this.distributor.distributeWith(this,m);
  }

}

export class Channel<T> implements Plug.ChannelInterface<T>{
  streams:any;

  constructor(){
    this.streams = stacks.streams.Streamable();
  }

  emit(d: T): void{
    this.streams.emit(d);
  }

  bindOnce(g: Plug.OneArgFunction<T>): void{
    this.streams.tellOnce(g);
  }

  unbindOnce(g: Plug.OneArgFunction<T>): void{
    this.streams.untellOnce(g);
  }

  bind(g: Plug.OneArgFunction<T>): void{
    this.streams.tell(g);
  }

  unbind(g: Plug.OneArgFunction<T>): void{
    this.streams.untell(g);
  }

  link(): ChannelLink<T>{
    return new ChannelLink<T>(this);
  }
}

export class SelectedChannel<T> extends Channel<T>{
  private contract: any;

  constructor(id: any,picker: any){
    super();
    this.contract = stacks.structs.Contract(id,picker);
    this.contract.onPass(this.streams.emit);
  }

  emit(d: T): void{
    this.contract.interogate(d);
  }
}

export class Swi<T> extends SelectedChannel<T>{
  constructor(id,pick){
    super(id,pick);
  }

  emit(d):void{
    super.emit(d);
  }
}
