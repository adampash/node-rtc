
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

function gotStream(stream) {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  console.log('got stream');
  var audioContext = new AudioContext();

  // Create an AudioNode from the stream
  var mediaStreamSource = audioContext.createMediaStreamSource(stream);

  // Connect it to destination to hear yourself
  // or any other node for processing!
  mediaStreamSource.connect(audioContext.destination);
}

// ----------------------------------------------------

var signalingChannel = createSignalingChannel();
var peerConnection;

var iceServers = {'iceServers': [{url: 'stun:stun.l.google.com:19302'}]};
var optionalRtpDataChannels = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };
var configuration = iceServers;

var endpoint = "signalingsocket"

var dataChannel;

// run start(true) to initiate a call
function start(isCaller) {
  peerConnection = new RTCPeerConnection(configuration);

  // send any ice candidates to the other peer
  peerConnection.onicecandidate = function (evt) {
    signalingChannel.send(JSON.stringify({ "candidate": evt.candidate }));
  };

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
