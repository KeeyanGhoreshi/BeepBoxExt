var a = "w6oP8jgi0Q4wd0";
a = "w61zcx0Q4w0Q4w0Q";
// Basic conversion from ASCII code to base 64 char code
var base64CharCodeToInt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0];
var commandOrder = ['n', 's', 'k', 'l', 'e', 't', 'm', 'a', 'g', 'j', 'i', 'r', 'o', ['T', 'd', 'c', 'A', 'F', 'B', 'V', 'Q', 'P', 'E', 'w', 'f', 'h', 'v'], 'b', 'p']
// the characters are 6 bits but the songs structure 
// is variable (based on pattern per channel)
function convertStringToBits(string){
    bits = [];
    for (const c of string) {
        // Shift all 6 bits into an array 
        var value = base64CharCodeToInt[c.charCodeAt(0)];
        bits.push((value >> 5) & 0x1); // shift 5 bits, use AND to pop target bit (MSB)
        bits.push((value >> 4) & 0x1); 
        bits.push((value >> 3) & 0x1);
        bits.push((value >> 2) & 0x1);
        bits.push((value >> 1) & 0x1);
        bits.push(value & 0x1);
    }
    return bits;
}


function chunkArray(array, chunk) {
    var i,j,temparray;
    var returnArr = [];
    for (i=0,j=array.length; i<j; i+=chunk) {
        temparray = array.slice(i,i+chunk);
        returnArr.push(temparray);
    }
    return returnArr;
}

function unchunkArray(array, flatten = true) {
    if( flatten ) {
        array = [].concat.apply([],array);
    }
    var merged = [].concat.apply([], array);
    return merged;
}
function convertBitsToString(bits){
    // take groups of 6 bits and convert to char
    var chunked = chunkArray(bits,6);
    returnArr=[];
    for (temparray of chunked) {
        value = parseInt(temparray.join(''),2);
        value = value?String.fromCharCode(base64CharCodeToInt.indexOf(value)):0;
        returnArr.push(value);
    }
    return returnArr.join('');
}

function insertColumns(bits,bars,start,patternsPerChannel) {

    sigBits = Math.floor(Math.log2(patternsPerChannel))+1;
    bits = chunkArray(bits,sigBits);
    organized = chunkArray(bits,bars);
    organized.map(function(element) {
        element.splice(start,0,new Array(sigBits).fill(0))
    })
    console.log(organized);
    var bitArray = unchunkArray(organized);
    return convertBitsToString(bitArray);
}


function deleteColumns(bits,bars,start,patternsPerChannel) {

    sigBits = Math.floor(Math.log2(patternsPerChannel))+1;
    bits = chunkArray(bits,sigBits);
    organized = chunkArray(bits,bars);

    organized.map(function(element) {

        element.splice(start,1);
    })

    var bitArray = unchunkArray(organized);
    return convertBitsToString(bitArray);
}

function insertColumnsEasy(compressed,start) {

    var uncompressed = parseEncoded(compressed);
    // get bits
    var bits = convertStringToBits(uncompressed.b);
    // get patterns per channel 
    var ppc = base64CharCodeToInt[uncompressed.j.charCodeAt(0)]+1
    // get bars
    var bars = base64CharCodeToInt[uncompressed.g.charCodeAt(0)]*64 + base64CharCodeToInt[uncompressed.g.charCodeAt(1)]+1 

    var newB = insertColumns(bits,bars,start,ppc);

    var top =Math.floor(bars/64);
    var bottom = bars%64;

    top = top?String.fromCharCode(base64CharCodeToInt.indexOf(top)):0
    bottom = bottom?String.fromCharCode(base64CharCodeToInt.indexOf(bottom)):0

    // update barcount
    uncompressed.g = top+bottom;
    // update song structure
    uncompressed.b = newB;
    return encodeUrl(uncompressed);
}

function deleteColumnsEasy(compressed,start) {

    var uncompressed = parseEncoded(compressed);
    // get bits
    var bits = convertStringToBits(uncompressed.b);
    // get patterns per channel 
    var ppc = base64CharCodeToInt[uncompressed.j.charCodeAt(0)]+1
    // get bars
    var bars = base64CharCodeToInt[uncompressed.g.charCodeAt(0)]*64 + base64CharCodeToInt[uncompressed.g.charCodeAt(1)]
    var newB = deleteColumns(bits,bars,start,ppc);

    bars = bars-1;
    var top =Math.floor((bars)/64);
    var bottom = (bars)%64;

    top = top?String.fromCharCode(base64CharCodeToInt.indexOf(top)):0
    bottom = bottom?String.fromCharCode(base64CharCodeToInt.indexOf(bottom)):0

    // update barcount
    uncompressed.g = top+bottom;
    // update song structure
    uncompressed.b = newB;
    return encodeUrl(uncompressed);
}

function parseEncoded(compressed) {
    // the commands can collide with 
    // encoding characters so we have 
    // to move through the string
    // till we get to the structure
    // command
    var charIndex = 0;
    var barCount, patternsPerChannel, channelCount;
    var uncompressed = {};

    while (compressed.charCodeAt(charIndex) != 35)
        charIndex++;
    if (compressed.charCodeAt(charIndex) == 35)
        charIndex++;
    // first number is version
    var version = compressed.charCodeAt(charIndex++);

    while (charIndex < compressed.length) {
        // we only need to move the appropriate number
        // of steps forward for commands we don't care about
        var commandLetter = compressed[charIndex];
        var command = compressed.charCodeAt(charIndex++);

        if (command == 110) {
            // channel count, needed for later
            // encoded by 2 characters
            uncompressed[commandLetter] = compressed.substr(charIndex, 2);
            var pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
            var drumChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
            channelCount = pitchChannelCount + drumChannelCount;
        }
        else if (command == 115) {
            // the scale
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            charIndex++;
        }
        else if ( command == 107) {
            // the key
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            charIndex++;
        }
        else if ( command == 108) {
            // loop start needs 2 char
            uncompressed[commandLetter] = compressed.substr(charIndex, 2);
            charIndex +=2;
        }
        else if (command == 101) {
            // loop length, 2 char
            uncompressed[commandLetter] = compressed.substr(charIndex, 2);
            charIndex +=2;
        }
        else if (command == 116) {
            // tempo
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            charIndex++;
        }
        else if( command == 109 ) {
            // reverb
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            charIndex++;
        }
        else if ( command == 97) {
            // beats per bar
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            charIndex++;
        }
        else if ( command == 103) {
            uncompressed[commandLetter] = compressed.substr(charIndex, 2);
            // we actually care about this one.
            barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
        }
        else if ( command == 106) {
            // also care about this
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
        }
        else if (command == 105) {
            // instruments per channel
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            charIndex++;
        }
        else if (command == 114) {
            // parts per beat
            uncompressed[commandLetter] = compressed.substr(charIndex, 1);
            charIndex++;
        }
        else if (command == 111) {
            // octave location for channels
            uncompressed[commandLetter] = compressed.substr(charIndex, channelCount);
            charIndex+= channelCount;
        }
        // instrument stuff
        // looks like before ver 6 there was only
        // a single command but now every instrument
        // is preceeded by a command
        else if (command == 84) {
            // intstruments number?
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if (command == 119) {
            // wave/drum for the instrument
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if (command == 102) {
            // filter for each instrument
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if (command == 100) {
            // instrument's transition
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if (command == 99) {
            // instrument's effect
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if (command == 104) {
            // instument's chorus
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if (command == 118) {
            // instument volume
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }

        // FM instruments
        else if(command == 65) {
            // algorithm
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if(command == 70) {
            // feedbackType
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if(command == 66) {
            // feedbackAmp
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if(command == 86) {
            // feedbackEnv
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 1));
            charIndex++;
        }
        else if(command == 81) {
            // there's 4 operators
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 4));
            charIndex+=4;
        }
        else if(command == 80) {
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 4));
            charIndex+=4;
        }
        else if(command == 69) {
            if(!uncompressed[commandLetter]){
                uncompressed[commandLetter]=[];
            }
            uncompressed[commandLetter].push(compressed.substr(charIndex, 4));
            charIndex+=4;
        }
        else if (command == 98) {
            // finally
            sigBits = Math.floor(Math.log2(patternsPerChannel))+1;
            var subStringLength = Math.ceil(channelCount * barCount * sigBits / 6);
            uncompressed[commandLetter] = compressed.substr(charIndex, subStringLength);
            charIndex+=subStringLength;
        }
        else if(command == 112){
            // song info, dump this.
            uncompressed[commandLetter] = compressed.substr(charIndex, compressed.length-charIndex);
            charIndex+=compressed.length-charIndex;
            // var bitStringLength = 0;
            // channel = 0;
            // var bitStringLengthLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
            // while (bitStringLengthLength > 0) {
            //     bitStringLength = bitStringLength << 6;
            //     bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
            //     bitStringLengthLength--;
            // }

        }
    }

    return uncompressed;
}

function encodeUrl(uncompressed) {
    var url =['#6'];
    //fm
    var type1c = ['d','c','A','F','B','V','Q','P','E'];
    //chip
    var type0c = ['w','f','d','c','h','v'];
    //drum
    var type2c = ['w','d','v'];
    for(command of commandOrder) {
        if(command instanceof Array) {
            for( type of uncompressed.T) {
                for (instC of command) {
                    if(instC == 'T'){
                        url.push(instC + type);
                    }
                    if(type == '1') {
                        if(type1c.indexOf(instC)!=-1){
                            url.push(instC + uncompressed[instC].shift());
                        }
                    }
                    else if(type == '2') {
                        if(type2c.indexOf(instC)!=-1){
                            url.push(instC + uncompressed[instC].shift());
                        }
                    }
                    else if(type == '0'){
                        if(type0c.indexOf(instC)!=-1){
                            url.push(instC + uncompressed[instC].shift());
                        }
                    }
                }
            }
        }else{
            url.push(command+uncompressed[command]);
        }
    }

    return url.join('');
}

function createHeader(insert) {

    var uncompressed = parseEncoded(window.location.href);
    var totalBars = base64CharCodeToInt[uncompressed.g.charCodeAt(0)]*64 + base64CharCodeToInt[uncompressed.g.charCodeAt(1)]+1
    var neededBars;
    if(totalBars > 15) {
        // we only need to display 15 buttons
        neededBars = 15;
    } else{
        neededBars = totalBars;
    }
    var trackContainer = document.getElementsByClassName('trackContainer')[0];
    var div, divbool,divDelete;
    if(document.getElementsByClassName("insertion-header").length >0 && insert){
        div = document.getElementsByClassName("insertion-header")[0]
        divbool = true;
    }else if(document.getElementsByClassName("deletion-header").length >0 && !insert){
        if(totalBars < 16) {
            divDelete = document.getElementsByClassName("deletion-header")[0]
            divDelete.parentNode.removeChild(divDelete);
            divDelete = document.createElement("div");
            divDelete.className = "deletion-header";
            divbool = false;

        }else{
            divDelete = document.getElementsByClassName("deletion-header")[0]
            divbool = true;
        }

    }else{
        div = document.createElement("div");
        div.className = "insertion-header";
        divbool = false;
        divDelete = document.createElement("div");
        divDelete.className = "deletion-header";
    }
    if(document.getElementsByClassName("insertion-header").length >0 && !insert){
        document.getElementsByClassName("insertion-header")[0].parentNode.removeChild(document.getElementsByClassName("insertion-header")[0]);
    }
    if(document.getElementsByClassName("deletion-header").length >0 && insert){
        document.getElementsByClassName("deletion-header")[0].parentNode.removeChild(document.getElementsByClassName("deletion-header")[0]);
    }
    var i;
    for(i=0; i<neededBars+1; i++){
        var a = document.createElement('a');
        if(i===0){
            var divArrow = document.createElement('div');
            a.className="first-button";
            a.id = i
        }else{
                var divArrow = document.createElement('div');
                divArrow.className = "arrow-down";
                a.appendChild(divArrow);
                a.className="add-column";
            a.id = i
        }

        var deleteButton = document.createElement('a');
        if(i===neededBars) {
                deleteButton.className="last-delete-button";
        }else{
                deleteButton.className="delete-button";
        }

        deleteButton.id = i + neededBars+17;

        a.addEventListener('click',function(event) {
            shiftThis(event, totalBars);
        })
        deleteButton.addEventListener('click',function(event) {
            deleteThis(event, totalBars, neededBars);
        })

        if(divbool && document.getElementById(i)!=null){
                div.replaceChild(a,document.getElementById(i));
                // divDelete.replaceChild(deleteButton,document.getElementById(i+neededBars+17));
        }else if(insert){
                div.appendChild(a);
                // divDelete.appendChild(deleteButton);
        }

    if(divbool && document.getElementById(i+neededBars+17)!=null && totalBars > 15){
            divDelete.replaceChild(deleteButton,document.getElementById(i+neededBars+17));
    }else if(!insert && !divbool){
            divDelete.appendChild(deleteButton);
    }

    }
    if(insert) {
        trackContainer.parentNode.insertBefore(div, trackContainer);

    }else{
        trackContainer.parentNode.insertBefore(divDelete, trackContainer);
    }


}

function shiftThis(n, bars) {
    n=parseInt(n.currentTarget.id);
    var tracker = document.getElementsByClassName('barScrollBar')[0];
    var rect = tracker.childNodes[0].childNodes[1];
    var location = rect.getAttribute('x');
    // width is 511 with 1px border on the right (left has a negative x? Negates left border taking up a pixel of space)
    var step = 511/bars;
    var offset = location/step;
    window.location.href = insertColumnsEasy(window.location.href,n+offset);
    createHeader(true);
    var scrollBarScroll = document.getElementsByClassName('trackContainer')[0]
    scrollBarScroll.scrollLeft = offset*32;
    var newLocation = offset * (511/(bars+1));
    rect.setAttribute('x',newLocation);
}

function deleteThis(n, bars, neededBars) {

    n=parseInt(n.currentTarget.id)-neededBars -17;
    console.log("n: " + n);
    var tracker = document.getElementsByClassName('barScrollBar')[0];
    var rect = tracker.childNodes[0].childNodes[1];
    var location = rect.getAttribute('x');
    // width is 511 with 1px border on the right (left has a negative x? Negates left border taking up a pixel of space)
    var step = 511/bars;
    var offset = location/step;
    console.log("offset: " + offset);
    window.location.href = deleteColumnsEasy(window.location.href,n+offset);
    createHeader(false);
    // var scrollBarScroll = document.getElementsByClassName('trackContainer')[0]
    // scrollBarScroll.scrollLeft = offset*32;
    // var step2 = 511/(bars-1);
    // var location2 = step2 * offset;
    // // var newLocation = offset * (511/(bars-1));
    // rect.setAttribute('x',location2);
}

function makeInsertHeader() {
    createHeader(true);
}
function makeDeleteHeader() {
    createHeader(false);
}
var editorSettings = document.getElementsByClassName('editor-settings')[0];
var div = document.createElement('div');
div.className = "button-holder";
var insertButton = document.createElement('a');
insertButton.className="insert-button-editor";
insertButton.addEventListener('click',makeInsertHeader);
// insertButton.innerHTML = "insert";
div.appendChild(insertButton);
var deleteButton = document.createElement('a');
deleteButton.className="delete-button-editor";
deleteButton.addEventListener('click',makeDeleteHeader);

// deleteButton.innerHTML="delete";
div.appendChild(deleteButton);
editorSettings.parentNode.insertBefore(div,editorSettings);
createHeader(true);
// var stringA = 'https://www.beepbox.co/#6n42sbk0l0we07t7m0a7g0_jvi0r3o221200T0w4f1d0c0h2v0T1d0c0A0F0BaV1Q0100Pcc00E0111T1d1c0AcF0B9V0Q0100Pb300E0111T1d1c0A4FhBfV1QbcdeP8fffE0111T2w0d0v2T2w4d1v2b000000001234165789abcdef000000000000000011111111111111111111111112341234556655671234cdg489ab89abefihjklm111111111111111111111111000012345566556712349af456585658bcdehgij111111111111111111111111000040021111111136337733555555555555555511111111111111111111111111111111411141114511361111111111111111111111111111111111111111111212121213121312421356121212121212121212111111111111111111111111p2kOAQMQ4QukwojiUOcz8U5SQQZ2hAaCRsuEFDEOdc1jj0kQQ-h4SG0OewewphjziYNcL4NYOqr3QAd7mglnxfd-lqwCxTR2L76uE1ehYkE1dDFWxdbDOH0d0joc18GaCRstmCvIzjtjjnjjjJwEaCGCGDGAwoMf8kQIWkA69dcIrycz8YA4SbDK-9UHyu0u9YiCRo2rwZ93gCDPU0i2xc-GkSf0FFK5PVhEfAxt8FI0BkVS720X1FkxkieqjoKsD9GsXjPaquzTAGsoZSA560vAp7p6lmhkVQvZjoZ3NZdbDGXWxjzbzQPZGYGIFJvukFPK3tg00aoYOtldldldldldldldldldldldldldldle3FGFGFGFGFGFGFGFGFGFGFGFGFGFGFGFMsBnjljljljljljljljljljljljljljljIAp2CGCGCGCGCGC-GCKiFGFGFGFGFGFGFITwNz_3rpK7arnvoAXqqGqGqGqGqE2ChFKJFGFGFGFGFGFGFRQOddldldldldlBJlltBdldldldldldleGWWCGCGCGCGCGWCW2FJFIFGFIJHFHKAqttABjljljljljljnlrlpjljljtjtjljljGJKFGFGFGFGFGFFLFGHFGFGFGFGFGFGFRQRkRkRkRkRkRkQRQRlQRkRkRkRkRkRkUmOGKCGKCGKCGKCGK1HwqqGWqGWqGWqGWszpjvvjlnjlnjlnjln8RO5dltdltdltdluGhKFGFGFGFGFGFFwqqGWqGqGqWqGqWqGtA30QRitdltdltdltdkzjlnjlnjlnjlnjlAHqo2WCGKCGKCGKCG1FGHFGHFGHFGHFGHRTi5dk5jlnjlnjlnj0SkRlQRlQRlQRlQRp21KwWqGWqGWqGWqGV2GKOCGKCGKCGKCGL9kTMldltdltdltdlsBnpjlnjlnjlnjlnjwboaCGhFGHFGHFGHFGHFwo2CGKCGKCGCGQ0aAeQQagXATs6MxUMobkxT1w9mF3L0TquakR8tQrR8txMfgaAezmF5K1rTd4W3SQoezvhIEWDKq5AqczhAqc38w09dddwDgjE9QjxEFAk99A99IkP87P6gf8O1V6gf8F_1AphcAuNA3jeyx8SdzycwuhWwuhA3OaacwuhO1V6gd1fz87Ip0Yw0001crcq04Am4kO37IPIr4NXcX1HOpOdyoZCtxiyi0ga99XtX74momwcC8w3DcVzC37IPIr4NXcX6MO1P6b4hDepP7cj7IPIu6YAChP7dTP6M0000kPe9Q6KwPW2t1HEbQ3Q4W3ngnicz8Q4W2t1uwLA3V1ewNQ3E7gnQ4W2-hA3EbQ300000';
// console.log(parseEncoded("#6n10sbkbl00e00t0m0a2g00j0i0r1o4T0w0f4d2c4h7v0bwp14FHV6",4));