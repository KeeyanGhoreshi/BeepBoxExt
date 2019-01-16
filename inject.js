var context=null;   // the Web Audio "context" object
var midiAccess=null;  // the MIDIAccess object.
var oscillator=null;  // the single oscillator
var envelope=null;    // the envelope for the single oscillator
var attack=0.05;      // attack speed
var release=0.08;   // release speed
var portamento=0.05;  // portamento/glide speed
var activeNotes = []; // the stack of actively-pressed keys
var synths = {}
var base64CharCodeToInt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0];


var pitches = [48,55,60,67,72,43,36]
window.addEventListener('load', function() {
  // patch up prefixes
  window.AudioContext=window.AudioContext||window.webkitAudioContext;

  context = new AudioContext();
  if (navigator.requestMIDIAccess)
    navigator.requestMIDIAccess().then( onMIDIInit, onMIDIReject );
  else
    alert("No MIDI support present in your browser.  You're gonna have a bad time.")

  // set up the basic oscillator chain, muted to begin with.
  oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(110, 0);
  envelope = context.createGain();
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  envelope.gain.value = 0.0;  // Mute the sound
  oscillator.start(0);  // Go ahead and start up the oscillator
} );

function onMIDIInit(midi) {
  midiAccess = midi;

  var haveAtLeastOneDevice=false;
  var inputs=midiAccess.inputs.values();
  for ( var input = inputs.next(); input && !input.done; input = inputs.next()) {
    input.value.onmidimessage = MIDIMessageEventHandler;
    haveAtLeastOneDevice = true;
  }
  if (!haveAtLeastOneDevice)
    alert("No MIDI input devices present.  You're gonna have a bad time.");
}

function onMIDIReject(err) {
  alert("The MIDI system failed to start.  You're gonna have a bad time.");
}

function MIDIMessageEventHandler(event) {
  // Mask off the lower nibble (MIDI channel, which we don't care about)
  switch (event.data[0] & 0xf0) {
    case 0x90:
	  if (event.data[2]!=0) {  // if velocity != 0, this is a note-on message
        noteOn(event.data[1]);
        return;
      }
      // if velocity == 0, fall thru: it's a note-off.  MIDI's weird, y'all.
	case 0x80:
      noteOff(event.data[1]);
      return;
  }
}

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}
// 101001101011111 001010110

// 001010110 -> interval of 20
// 0 -> not a pitch index
// 0 -> positive
// 1 -> +8, 4numbits
// 0 -> break loop
// 1011 -> +11, get 1 for free, +8 = 20
// 0 -> extra filler

// 10100
function noteOn(noteNumber) {
  if(synths[noteNumber]) {
    synths[noteNumber].play();
  }else{
    var encodingBits = [];
    var adjustedNoteNumber= noteNumber - 12;
  
    if(pitches.indexOf(adjustedNoteNumber)!==-1) {
      encodingBits.push(1);
      var pitchIndex = pitches.indexOf(adjustedNoteNumber);
      console.log(pitchIndex);
    }else{
      encodingBits.push(0);
      var difference = adjustedNoteNumber - 48;
      encodingBits.push(difference<0?1:0);
      var differenceAbs = Math.abs(difference);
      var pitch = 48;
      var interval = 0;
      for(var i = 0 ; i<differenceAbs; i++){
        if(difference < 0) {
          pitch--;
          if(pitches.indexOf(pitch)==-1){
            interval--;
          }
        }else{
          pitch++;
          if(pitches.indexOf(pitch)==-1){
            interval++;
          }
        }
      }
  
      interval = interval -1;
      console.log("interval: " + interval);
      interval = Math.abs(interval);
      var intervalCounter = interval;
      var numbits =3;
      for(var i = 0; i<6; i++){
        intervalCounter -= Math.pow(2,3+i);
        if(intervalCounter > 0) {
          encodingBits.push(1);
          numbits++;
        }else{
          // restore old counter
          intervalCounter += Math.pow(2,3+i);
          encodingBits.push(0);
          break;
        }
      }
      // finish the job
      console.log("counter: " + intervalCounter);
      var counterBin = (intervalCounter >>> 0).toString(2);
      if( counterBin.length < numbits) {
        for(var i = 0; i< numbits - counterBin.length; i++){
          encodingBits.push(0);
        }
      }
      for( bit of counterBin) {
        encodingBits.push(parseInt(bit));
      }
  
      if(encodingBits.length < 9 ) {
        console.log(encodingBits.length);
        var aa = encodingBits.length;
        for(var i =0; i<9-aa;i++){
          encodingBits.push(0);
        }
      }
      console.log(encodingBits);
      var bb = '111' + encodingBits.slice(0,3).join('');
      var digit = parseInt(bb, 2);
      var char1 = String.fromCharCode(base64CharCodeToInt.indexOf(digit));
      var digit2 = parseInt(encodingBits.slice(3,encodingBits.length).join(''),2);
      var char2 = String.fromCharCode(base64CharCodeToInt.indexOf(digit2));
  
      var url = "#6n10sbkbl00e00t7m0a2g00j0i0r1o3T0w3f3d0c2h3v0bwp14FH" + char1 + char2;
      var synth = new beepbox.Synth(url);
      synths[noteNumber] = synth;
      synth.play();
  
  }
 
  }


  

  // activeNotes.push( noteNumber );
  // oscillator.frequency.cancelScheduledValues(0);
  // oscillator.frequency.setTargetAtTime( frequencyFromNoteNumber(noteNumber), 0, portamento );
  // envelope.gain.cancelScheduledValues(0);
  // envelope.gain.setTargetAtTime(1.0, 0, attack);
}

function noteOff(noteNumber) {
  synths[noteNumber].pause();
  // var position = activeNotes.indexOf(noteNumber);
  // if (position!=-1) {
  //   activeNotes.splice(position,1);
  // }
  // if (activeNotes.length==0) {  // shut off the envelope
  //   envelope.gain.cancelScheduledValues(0);
  //   envelope.gain.setTargetAtTime(0.0, 0, release );
  // } else {
  //   oscillator.frequency.cancelScheduledValues(0);
  //   oscillator.frequency.setTargetAtTime( frequencyFromNoteNumber(activeNotes[activeNotes.length-1]), 0, portamento );
  // }
}

// function retrieveWindowVariables(variables) {
//   var ret = {};

//   var scriptContent = "";
//   for (var i = 0; i < variables.length; i++) {
//       var currVariable = variables[i];
//       scriptContent += "if (typeof " + currVariable + " !== 'undefined') $('body').attr('tmp_" + currVariable + "', JSON.stringify(" + currVariable + "));\n"
//   }

//   var script = document.createElement('script');
//   script.id = 'tmpScript';
//   script.appendChild(document.createTextNode(scriptContent));
//   (document.body || document.head || document.documentElement).appendChild(script);

//   for (var i = 0; i < variables.length; i++) {
//       var currVariable = variables[i];
//       ret[currVariable] = $.parseJSON($("body").attr("tmp_" + currVariable));
//       $("body").removeAttr("tmp_" + currVariable);
//   }

//    $("#tmpScript").remove();

//   return ret;
// }