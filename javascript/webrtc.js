var dbg = [];
var peerConnection;

var iceServers = {'iceServers': [{url: 'stun:stun.l.google.com:19302'}]};
var optionalRtpDataChannels = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };

var endpoint = "signalingsocket"

var dataChannel;


// ----------------------------------------------------

var startCallButton = document.getElementById('startCallButton');
startCallButton.disabled = false;


var chatTextInput = document.getElementById('chatTextInput');
chatTextInput.disabled = true;


var chatTextResponses = document.getElementById('chatTextResponses');

// ----------------------------------------------------


startCallButton.addEventListener('click', function () {
  startRTCCall();
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
    var ws = io.connect('http://localhost');
    ws.addEventListener = ws.on;
    return ws;
  }
}

// ----------------------------------------------------

var getAndSendMessage = function (input) {
  var messageText = chatTextInput.value;
  rtcSendChannel.send(messageText);
  chatTextInput.value = '';
}

chatTextInput.addEventListener('keypress', function (k) {
  if (k.which===13) {
    getAndSendMessage(chatTextInput);				
  }
});

var parseAndDisplayMessage = function (messageEvent) {
  // var message = JSON.parse(messageEvent.data);
  var message = messageEvent.data;

  var messageNode = document.createElement('li');
  var messageText = document.createElement('p');

  messageText.innerHTML = message;

  messageNode.appendChild(messageText);

  chatTextResponses.appendChild(messageNode);


}

// ----------------------------------------------------


var localDescriptionCreated = function (description) {

  peerConnection.setLocalDescription(description);

  signalingChannel.send(JSON.stringify({
    "sdp" : peerConnection.localDescription
  }));

}


var logErrors = function (error) {
  // console.log("Error: ", error);
  // console.log(error);
}

// ----------------------------------------------------


var startRTCCall = function () {

  // console.log("start the call");

  peerConnection = new RTCPeerConnection(iceServers, optionalRtpDataChannels);

  peerConnection.ondatachannel = function(event) {
    console.log('ondatachannel event fired', event);
    debugger;
  }


  // var iceServers = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};

  // // manually setting configuration here to test
  // var optionalRtpDataChannels = {
  //   optional: [{ RtpDataChannels: true}]};

  // peerConnection = new RTCPeerConnection(iceServers, optionalRtpDataChannels)

  dataChannel = peerConnection.createDataChannel('RTCDataChannel', {
    reliable: false
  });

  dataChannel.onmessage = parseAndDisplayMessage;


  // the peerConnection will immediately start gathering Ice candidates

  peerConnection.addEventListener('icecandidate', function (evt) {
    // console.log(evt.candidate);
    if (evt.candidate) {
      signalingChannel.send(JSON.stringify({
        "candidates": evt.candidate
      }));
    }
  });


  peerConnection.addEventListener('datachannel', function (evt) {
    console.log("data channel ready");
  });

  peerConnection.createOffer(localDescriptionCreated, logErrors);




  /*
   *  'negotiationneeded' is only fired when there are media streams
   *  being attached that NEED TO NEGOTIATE an arrangement.  Just data
   *  channels DO NOT FIRE THE EVENT
   *
   */
  
    peerConnection.addEventListener('negotiationneeded', function () {
      console.log('negotiationneeded fired');
      peerConnection.createOffer(localDescriptionCreated, logErrors);
    });
}


// ----------------------------------------------------

var signalingChannel = createSignalingChannel('signalsocket');

signalingChannel.addEventListener('open', function () {
  startCallButton.disabled = false;
  console.log('open signalingChannel');
});



signalingChannel.addEventListener('message', function (event) {
  console.log('signalingChannel got message', event);
  if (!peerConnection) {
    startRTCCall();
  }

  var message = JSON.parse(event.data);

  if (message.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp), 
      function () {
        if (peerConnection.remoteDescription.type==="offer") {
          peerConnection.createAnswer(localDescriptionCreated, logErrors);
        };
      }, logErrors);
  } else if (message.candidates) {
    // console.log("remote icecandidate coming in");
    var icecandidate = new RTCIceCandidate(message.candidates);
    peerConnection.addIceCandidate(icecandidate);

  } else {
    console.log('some error');
  }

});


