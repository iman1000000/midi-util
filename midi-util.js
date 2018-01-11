// var toKeyboard, fromKeyboard;
var outputMode = 'INTERN'; // INTERN, EXTERN1, EXTERN2, EXTERN10
var midi;
var keysDown = [];
var portamentoDisabled = false;

var noSleep = new NoSleep();

var keyboards = {
    froms: [],
    tos: [],
    send(data) {
        for (var to of this.tos) {
            to.send(data);
        }
    },
    clear() {
        // removes devices
        this.setCallback(undefined);
        this.tos = [];
        this.froms = [];
    },
    setCallback(callback) {
        for (var from of this.froms) {
            from.onmidimessage = callback;
        }
    }
};

var circuit = {
    from: undefined,
    to: undefined,
    send(data) {
        if (this.to) {
            this.to.send(data);
        }
    },
    clear() {
        // removes device if connected
        this.setCallback(undefined);
        this.from = undefined;
        this.to = undefined;
    },
    setCallback(callback) {
        if (this.from) {
            this.from.onmidimessage = callback;
        }
    }
};

init();

function connect() {
    // clear existing inputs, if any
    circuit.clear();
    keyboards.clear();

    // obtain outputs
    var outputs = midi.outputs.values();
    for (var output = outputs.next(); output && !output.done; output = outputs.next()) {
        if (output.value.name.includes('Midi Through Port')) continue;
        if (output.value.name.includes('Circuit')) {
            circuit.to = output.value;
        } else {
            keyboards.tos.push(output.value);
        }
    }

    // obtain inputs
    var inputs = midi.inputs.values();
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        if (input.value.name.includes('Midi Through Port')) continue;
        if (input.value.name.includes('Circuit')) {
            circuit.from = input.value;
        } else {
            keyboards.froms.push(input.value);
        }
    }
    // bind input callbacks
    keyboards.setCallback(keyboardCallback);
    circuit.setCallback(circuitCallback);

    // Disable reface local control
    keyboards.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x06, 0x00, 0xf7]);
    // enable reface slider CCs
    keyboards.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x0e, 0x01, 0xf7]);

    // TODO leave until there's a connected device UI
    for (var k of keyboards.froms) {
        console.log(k.name);
    }
    if (circuit.from) {
        console.log('Novation Circuit');
    }

}


function init() {
    navigator.requestMIDIAccess({sysex: true}).then(midiAccess => {
        midi = midiAccess;
        connect();
    });
}

function keyboardCallback(msg) {
    // ignore system messages
    if ((msg.data[0] & 0xf0) == 0xf0) {
        return;
    }

    // enable portamento blocking when portamento is set to 1
    if ((msg.data[0] & 0xf0) == 0xb0 &&  // is a control change and
            msg.data[1] == 0x14          // is a portamento CC
            ){
        if (msg.data[2] == 1) { // is setting portamento to 1
            portamentoDisabled = true;
        } else {
            portamentoDisabled = false;
        }
    }

    trackKeys(msg);

    if (portamentoDisabled) {
        portamentoBlock(msg);
    } else {
        sendMsg(msg);
    }
}

// send a midi message to the current output
function sendMsg(msg) {
    var output, channel;

    if (outputMode == 'INTERN') {
        output = keyboards;
        channel = 0x00; // channel 1
    } else if (outputMode == 'EXTERN1') {
        output = circuit;
        channel = 0x00; // channel 1
    } else if (outputMode == 'EXTERN2') {
        output = circuit;
        channel = 0x01; // channel 2
    } else if (outputMode == 'EXTERN10') {
        output = circuit;
        channel = 0x09; // channel 10
    } else {
        return;
    }

    // always send control changes to the keyboards
    if ((msg.data[0] & 0xf0) == 0xb0) {
        output = keyboards;
        channel = 0x00; // channel 1
    }

    // set channel
    msg.data[0] &= 0xf0;
    msg.data[0] |= channel;

    if (outputMode == 'EXTERN10' && (msg.data[0] & 0b11100000) == 0b10000000) {
        // modulo the drum notes, so that they work on any octave
        msg.data[1] %= 12;
        msg.data[1] += 60;
    }

    output.send(msg.data);
}

function trackKeys(msg) {
    if (isKeyDown(msg)) {
        let key = msg.data[1];
        if (!keysDown.includes(key)) {
            keysDown.push(key);
        }
    } else if (isKeyUp(msg)) {
        let key = msg.data[1];
        if (keysDown.includes(key)) {
            keysDown.splice(keysDown.indexOf(key), 1);
        }
    }
}

function portamentoBlock(msg) {
    if (isKeyDown(msg)) {
        if (keysDown.length > 1) {
            // a midi message with a copy of the source message data
            var releaseMessage = {data: msg.data.slice()};
            // release the last note
            releaseMessage.data[1] = keysDown[keysDown.length-2];
            // set velocity to 0
            releaseMessage.data[2] = 0;

            sendMsg(releaseMessage);
        }
        sendMsg(msg);
    } else if (isKeyUp(msg)) {
        if (keysDown.length > 0) {
            // a midi message with a copy of the source message data
            var playMessage = {data: msg.data.slice()};
            // ensure it's a note on, not note off
            playMessage.data[0] |= 0b00010000;
            // play the last note
            playMessage.data[1] = keysDown[keysDown.length-1];
            // set velocity to 100
            // TODO: use the velocity of the note when it was first played
            // I mostly use synths without velocity, so it doesn't bother me
            playMessage.data[2] = 100;

            sendMsg(msg);
            sendMsg(playMessage);
        } else {
            sendMsg(msg);
        }
    } else {
        sendMsg(msg);
    }
}

function circuitCallback(msg) {
    if (msg.data[0] == 0xf8) { // timing clock
        keyboards.send(msg.data);
    }
}

function isKeyDown(msg) {
    if ((msg.data[0] & 0xf0) == 0x90 && // is note on message and...
            msg.data[2] !== 0) { // ... doesn't have velocity 0
        return true;
    }
    return false;
}

function isKeyUp(msg) {
    if ((msg.data[0] & 0xf0) == 0x80 || // is note off message, or
            ((msg.data[0] & 0xf0) == 0x90 && // is note on message and...
            msg.data[2] === 0) // ... has velocity 0
            ) {
        return true;
    }
    return false;
}

intern.addEventListener('click', internHandler, false);
extern1.addEventListener('click', extern1Handler, false);
extern2.addEventListener('click', extern2Handler, false);
extern10.addEventListener('click', extern10Handler, false);
reconnect.addEventListener('click', reconnectHandler, false);

function internHandler(e) {
    outputMode = 'INTERN';
    releaseNotes();
    intern.classList.add('enabled');
    extern1.classList.remove('enabled');
    extern2.classList.remove('enabled');
    extern10.classList.remove('enabled');
    // stops touch events from double triggering
    e.preventDefault();
    // stops screen from turning off while page is open
    // must be called from a button press
    noSleep.enable();
}

function extern1Handler(e) {
    // TODO: disable these buttons if the circuit is not connected
    outputMode = 'EXTERN1';
    releaseNotes();
    intern.classList.remove('enabled');
    extern1.classList.add('enabled');
    extern2.classList.remove('enabled');
    extern10.classList.remove('enabled');
    e.preventDefault();
    noSleep.enable();
}

function extern2Handler(e) {
    outputMode = 'EXTERN2';
    releaseNotes();
    intern.classList.remove('enabled');
    extern1.classList.remove('enabled');
    extern2.classList.add('enabled');
    extern10.classList.remove('enabled');
    e.preventDefault();
    noSleep.enable();
}

function extern10Handler(e) {
    outputMode = 'EXTERN10';
    releaseNotes();
    intern.classList.remove('enabled');
    extern1.classList.remove('enabled');
    extern2.classList.remove('enabled');
    extern10.classList.add('enabled');
    e.preventDefault();
    noSleep.enable();
}

function reconnectHandler(e) {
    connect();
}

function releaseNotes() {
    keyboards.send([0xb0, 0x7b, 0x00]);
    if (circuit) {
        circuit.send([0xb0, 0x7b, 0x00]); // Channel 1
        circuit.send([0xb1, 0x7b, 0x00]); // Channel 2
        circuit.send([0xb9, 0x7b, 0x00]); // Channel 10
    }
}
