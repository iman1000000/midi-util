// var toKeyboard, fromKeyboard;
var toCircuit, fromCircuit;
var outputMode = 'INTERN'; // INTERN, EXTERN1, EXTERN2, EXTERN10
var midi;

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
    setCallback() {
        if (this.from) {
            this.from.onmidimessage = undefined;
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
        console.log(input.value.name);
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
    // TODO enable reface slider CCs

}


function init() {
    navigator.requestMIDIAccess({sysex: true}).then(midiAccess => {
        midi = midiAccess;
        connect();
    });
}

function keyboardCallback(msg) {
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

    // don't send system messages
    if ((msg.data[0] & 0xf0) == 0xf0) {
        return;
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

function circuitCallback(msg) {
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
    if (toCircuit) {
        toCircuit.send([0xb0, 0x7b, 0x00]); // Channel 1
        toCircuit.send([0xb1, 0x7b, 0x00]); // Channel 2
        toCircuit.send([0xb9, 0x7b, 0x00]); // Channel 10
    }
}
