var toKeyboard, fromKeyboard;
var toCircuit, fromCircuit;
var outputMode = 'INTERN'; // INTERN, EXTERN1, EXTERN2, EXTERN10

var noSleep = new NoSleep();

connect();

function main() {
    if (fromKeyboard) {
        // Disable local control
        toKeyboard.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x06, 0x00, 0xf7]);

        fromKeyboard.onmidimessage = send;
    }
}


function connect() {
    toKeyboard = fromKeyboard = toCircuit = fromCircuit = undefined;
    navigator.requestMIDIAccess({sysex: true}).then(midi => {
        var outputs = midi.outputs.values();
        for (var output = outputs.next(); output && !output.done; output = outputs.next()) {
            if (output.value.name.includes('Circuit')) {
                toCircuit = output.value;
            } else {
                toKeyboard = output.value;
            }
        }
        var inputs = midi.inputs.values();
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            if (input.value.name.includes('Circuit')) {
                fromCircuit = input.value;
            } else {
                fromKeyboard = input.value;
            }
        }
        main();
    });
}

function send(msg) {
    var output, channel;
    if (outputMode == 'INTERN') {
        output = toKeyboard;
        channel = 0x00; // channel 1
    } else if (outputMode == 'EXTERN1') {
        output = toCircuit;
        channel = 0x00; // channel 1
    } else if (outputMode == 'EXTERN2') {
        output = toCircuit;
        channel = 0x01; // channel 2
    } else if (outputMode == 'EXTERN10') {
        output = toCircuit;
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
    if (!toCircuit) return;
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
    if (!toCircuit) return;
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
    if (!toCircuit) return;
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
    if (toKeyboard) {
        toKeyboard.send([0xb0, 0x7b, 0x00]);
    }
    if (toCircuit) {
        toCircuit.send([0xb0, 0x7b, 0x00]); // Channel 1
        toCircuit.send([0xb1, 0x7b, 0x00]); // Channel 2
        toCircuit.send([0xb9, 0x7b, 0x00]); // Channel 10
    }
}
