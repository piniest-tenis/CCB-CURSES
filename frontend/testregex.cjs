var tests = ['2d12', '2d12+1d4', 'd12', 'd12+d12', 'd4+d6'];
tests.forEach(function(t) {
  var dr0 = /\s*(\d*)([a-z]+)(\d+)(\s*(\+|-)\s*(\d+)){0,1}\s*(\+|$)/gi;
  var matches = [];
  var res;
  while ((res = dr0.exec(t))) {
    var count = res[1] === '' ? 1 : parseInt(res[1]);
    var type = 'd' + res[3];
    for (var i = 0; i < count; i++) matches.push(type);
  }
  console.log(t + ' -> ' + JSON.stringify(matches));
});
