//detailed here are the types used within these projects

declare module Plug{

  export interface ListFunction<T>{
    (data:T): void;
  }

  export interface OneArgFunction<T>{
    (t: T): void;
  }

  export interface SingleFunctionArgs<T>{
    (t: OneArgFunction<T>): void;
  }

  export interface TaskPack{
    uuid: string;
    data: {};
  }

  export interface GreedPack{
    choice: string;
    adapter: AdapterInterface;
  }

  export interface MessagePack{
    message: string;
    data?: {};
    task?: TaskPack;
  }

  export interface PlugListener{
    (t: MessagePack): void;
  }

  export interface AdapterFunction{
    (f: any, apt: AdapterInterface): void;
  }

  export class AdapterInterface{
    delegate: (t: any) => void;
    attachPlug: (p: PlugInterface) => void;
    detachPlug: (p: PlugInterface) => void;
  }

  export class Pluggable{
    dispatch: (t: MessagePack) => void;
    listen: (f: PlugListener) => void;
    unlisten: (f: PlugListener) => void;
    listenOnce: (f: PlugListener) => void;
    unlistenOnce: (f: PlugListener) => void;
  }

  export class PlateInterface extends Pluggable{}
  export class PlugInterface extends Pluggable{}

  export class AdapterQueueInterface{
    queue: (id: AdapterInterface) => void;
    unqueue: (id: AdapterInterface) => void;
  }

  export class PlugQueueInterface{
    queue: (id: string) => void;
    unqueue: (id: string) => void;
  }

  export class ChannelInterface<T>{
    emit: OneArgFunction<T>;
    bind: SingleFunctionArgs<T>;
    unbind: SingleFunctionArgs<T>;
    link:() => ChannelLinkInterface<T>;
  }

  export class ChannelLinkInterface<T>{
    listen: SingleFunctionArgs<T>;
    die:() => void;
  }

}
