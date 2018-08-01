var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('keys pressed locally', function(msg){
    console.log('p' + convertKey(msg))
    io.emit('keys changed remotely', msg);
  });

  socket.on('keys unpressed locally', function(msg){
    console.log('u' + convertKey(msg))
    io.emit('keys changed remotely', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

function convertKey (key) {
  if (key === 37) {
    return '<<'
  } else if (key === 39) {
    return '>>'
  }
}
