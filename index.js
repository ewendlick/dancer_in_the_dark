const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const chalk = require('chalk')
const port = process.env.PORT || 3000;

const KEY_STATUS = {
  LEFT: false,
  UP: false,
  RIGHT: false,
  DOWN: false
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', function(socket){
  socket.on('keys pressed locally', function(msg){
    // console.log('p' + convertKey(msg))
    applyKeyStatus (msg, true)
    printKeyStatuses()

    io.emit('keys changed remotely', msg)
  })

  socket.on('keys unpressed locally', function(msg){
    // console.log('u' + convertKey(msg))
    applyKeyStatus (msg, false)
    printKeyStatuses()

    io.emit('keys changed remotely', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

// TODO: keyCode mapping in this file
function convertKey (key) {
  if (key === 37) {
    // left
    return '⟵'
  } else if (key === 38) {
    // up
    return '↑'
  } else if (key === 39) {
    // right
    return '⟶'
  } else if (key === 40) {
    // down
    return '↓'
  }
}

function applyKeyStatus (keyCode, status) {
  if (keyCode === 37) {
    KEY_STATUS.LEFT = status
  } else if (keyCode === 38) {
    KEY_STATUS.UP = status
  } else if (keyCode === 39) {
    KEY_STATUS.RIGHT = status
  } else if (keyCode === 40) {
    KEY_STATUS.DOWN = status
  }
}

function printKeyStatuses () {
  // TODO: stop with the magic numbers
  console.log(onOffHighlight(KEY_STATUS.LEFT, 37) +
              onOffHighlight(KEY_STATUS.UP, 38) +
              onOffHighlight(KEY_STATUS.RIGHT, 39) +
              onOffHighlight(KEY_STATUS.DOWN, 40))
}

function onOffHighlight (status, text) {
  return  status ? chalk.green(convertKey(text)) : chalk.red(convertKey(text))
}
