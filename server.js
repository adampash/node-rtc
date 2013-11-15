var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8000);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.use('/javascript', express.static('javascript'));


io.sockets.on('connection', function (socket) {
  socket.on('message', function (data) {
    console.log(data);
    socket.broadcast.emit('message', {data: data});
  });
});
