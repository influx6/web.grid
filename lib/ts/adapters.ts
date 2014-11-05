/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />

import stacks = require("stacks");
import messages = require("./messages");

export class Adapter{
  private adaptive: Plug.AdapterFunction;
  private plugs: Array<Plug.PlugInterface>;
  private job: any;
  jobState: any

  constructor(f: Plug.AdapterFunction){
    this.job = stacks.as.Distributors();
    this.jobState = stacks.structs.Choice();
    this.plugs = new Array<Plug.PlugInterface>();
    this.adaptive = f;
  }

  attachPlug(t: Plug.PlugInterface): void{
    if(this.hasPlug(t)) return null;
    this.plugs.push(t);
    this.listen(t.dispatch);
  }

  detachPlug(t: Plug.PlugInterface): void{
    if(!this.hasPlug(t)) return null;
    this.plugs[this.plugs.indexOf(t)] = null;
    this.unlisten(t.dispatch);
    stacks.as.Util.normalizeArray(this.plugs);
  }

  delegate(t): void{
    this.adaptive(t,this);
  }

  send(t: Plug.MessagePack): void{
    this.job.distributeWith(this,[t]);
  }

  hasPlug(t: Plug.PlugInterface): boolean{
    return this.plugs.indexOf(t) != -1;
  }

  listen(t): void{
    this.job.add(t);
  }

  listenOnce(t): void{
    this.job.addOnce(t);
  }

  unlisten(t): void{
    this.job.remove(t);
  }

  unlistenOnce(t): void{
    this.unlisten(t);
  }

}

export class Adapters{
  private registry: any;
  id: string;

  constructor(id: string){
    this.id = id;
    this.registry = stacks.as.MapDecorator({});
  }

  add(sid: string ,f: Plug.AdapterFunction): void{
    this.registry.add(sid,f);
  }

  remove(sid: string): void{
    this.registry.remove(sid);
  }

  has(sid: string): boolean{
    return this.registry.exists(sid);
  }

  Q(sid: string): Adapter{
    if(!this.has(sid)) return null;
    return new Adapter(this.registry.fetch(sid));
  }
}

export class AdapterWorkQueue implements Plug.AdapterQueueInterface{
  private adaptors: Adapter[];

  constructor(){
    this.adaptors = new Array<Adapter>();
  }

  queue(q: Adapter): void{
    var first = stacks.ascontrib.enums.last(this.adaptors);
    this.adaptors.push(q);
    if(!!first){
      first.listen(q.delegate);
    }
  }

  unqueue(q: Adapter): void{
    if(!this.has(q)) return null;
    var index = this.adaptors.indexOf(q),
    pid = index - 1,
    nid = index + 1,
    pa = this.adaptors[pid],
    na = this.adaptors[nid];

    if(!!pa){
      pa.unlisten(q.delegate);
      if(!!na){
        q.unlisten(na.delegate);
        pa.listen(na.delegate);
      }
    }

    this.adaptors[index] = null;
    stacks.as.Util.normalizeArray(this.adaptors);
  }

  has(q: Adapter): boolean{
    return this.adaptors.indexOf(q) != -1;
  }

  isEmpty(): boolean{
    return this.adaptors.length <= 0;
  }

  emit(d: Plug.MessagePack): void{
    if(this.isEmpty) return null;
    var fst = stacks.ascontrib.enums.first(this.adaptors);
    fst.delegate(d);
  }
}

export class AdapterGreedQueue implements Plug.AdapterQueueInterface{
  private workQ: any;
  private qa: Plug.GreedPack[];

  constructor(){
    this.qa = new Array<Plug.GreedPack>();
    this.workQ = stacks.structs.GreedQueue();
  }

  queue(q: Adapter): void{
    this.has(q,function(e){},function(e){
      var choice = this.qa.queue(function(f){});
      q.listen(function(m){
        return choice.ok(m);
      });
      this.qa.push({'choice': choice, 'adapter': q});
    });
  }

  has(q: Adapter,done: (f:any) => void,fail:(f: any) => void): void{
    this.workQ.each(function(e,next){
      if(e['adapter'] === q) return done(e);
      return next(e);
    },function(q){
      return fail(q);
    });
  }

  unqueue(q: Adapter): void{
  }

  emit(d: Plug.MessagePack): void{

  }
}
