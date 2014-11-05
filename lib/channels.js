var stacks = require('stackq');

var Channel = exports.Channel = stacks.Stream.extends({});

var SelectedChannel = exports.SelectedChannel = Channel.extends({
  init: function(id,picker){
    this.$super();
    this.contract = stacks.Contract(id,picker);
    this.contract.onPass(stacks.Funcs.bind(this.mutts.emit,this.mutts));
  },
  emit: function(){
    this.contract.interogate(d);
  }
});
