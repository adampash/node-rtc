
// ----------------------------------------------------

var startCallButton = document.getElementById('startCallButton');
startCallButton.disabled = false;

var chatTextInput = document.getElementById('chatTextInput');
chatTextInput.disabled = true;

var chatTextResponses = document.getElementById('chatTextResponses');

var selfView = document.getElementById('selfView');
var remoteView = document.getElementById('remoteView');


// ----------------------------------------------------

startCallButton.addEventListener('click', function () {
  start(true);
  this.disabled = true;
});


// ----------------------------------------------------

var createSignalingChannel = function (endpoint) {
  if (!io) {
    var origin = document.location.origin;
    var wsurl = "ws" + origin.substring(4) + "/" + endpoint;
    var ws = new WebSocket(wsurl);

    return ws;
  } else {
    var ws = io.connect('/');
    ws.addEventListener = ws.on;
    return ws;
  }
}

// ----------------------------------------------------


var signalingChannel = createSignalingChannel();
var peerConnection;

var iceServers = {'iceServers': [{url: 'stun:stun.l.google.com:19302'}]};
var optionalRtpDataChannels = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };
var configuration = iceServers, optionalRtpDataChannels;

var endpoint = "signalingsocket"

var dataChannel;

// run start(true) to initiate a call
function start(isCaller) {
  peerConnection = new RTCPeerConnection(configuration, optionalRtpDataChannels);

  try {
    // Reliable Data Channels not yet supported in Chrome
    dataChannel = peerConnection.createDataChannel("sendDataChannel",
        {reliable: false});
    trace('Created send data channel');
  } catch (e) {
    alert('Failed to create data channel. ' +
        'You need Chrome M25 or later with RtpDataChannel enabled');
    trace('createDataChannel() failed with exception: ' + e.message);
  }

  // send any ice candidates to the other peer
  peerConnection.onicecandidate = function (evt) {
    signalingChannel.send(JSON.stringify({ "candidate": evt.candidate }));
  };

  dataChannel.onopen = handleSendChannelStateChange;
  dataChannel.onclose = handleSendChannelStateChange;
  dataChannel.onmessage = handleMessage;

  // once remote stream arrives, show it in the remote video element
  peerConnection.onaddstream = function (evt) {
    remoteView.src = URL.createObjectURL(evt.stream);
  };

  // get the local stream, show it in the local video element and send it
  navigator.webkitGetUserMedia({ "audio": true, "video": true }, function (stream) {
    selfView.src = URL.createObjectURL(stream);
    peerConnection.addStream(stream);

    if (isCaller)
      peerConnection.createOffer(gotDescription);
    else {
      peerConnection.createAnswer(gotDescription);
    }

  function gotDescription(desc) {
    peerConnection.setLocalDescription(desc);
    signalingChannel.send(JSON.stringify({ "sdp": desc }));
  }
  });
}

signalingChannel.addEventListener('message', function (evt) {
  if (!peerConnection)
    start(false);

  var signal = JSON.parse(evt.data);
  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    console.log(peerConnection.signalingState);
  } else if (signal.candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
  }
});

function handleSendChannelStateChange() {
  var readyState = dataChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState == "open") {
    console.log('ready to send data!');
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function handleMessage(event) {
  trace('Received message: ' + event.data);
}

function gotReceiveChannel(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleMessage;
  receiveChannel.onopen = handleReceiveChannelStateChange;
  receiveChannel.onclose = handleReceiveChannelStateChange;
}

function handleReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
