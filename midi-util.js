var toReface, fromReface;
var toCircuit, fromCircuit;
var outputMode = 'INTERN'; // INTERN, EXTERN1, EXTERN2, EXTERN10

start();

function main() {
    if (fromReface) {
        // Disable local control
        toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x06, 0x00, 0xf7]);

        fromReface.onmidimessage = send;
    }
}


function start() {
    navigator.requestMIDIAccess({sysex: true}).then(midi => {
        var outputs = midi.outputs.values();
        for (var output = outputs.next(); output && !output.done; output = outputs.next()) {
            if (output.value.name.includes('reface'))
                toReface = output.value;
            if (output.value.name.includes('Circuit'))
                toCircuit = output.value;
        }
        var inputs = midi.inputs.values();
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            if (input.value.name.includes('reface'))
                fromReface = input.value;
            if (input.value.name.includes('Circuit'))
                fromCircuit = input.value;  }
        main();
    });
}

function send(msg) {
    var output, channel;
    if (outputMode == 'INTERN') {
        output = toReface;
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

intern.addEventListener('mousedown', internHandler, false);
intern.addEventListener('touchstart', internHandler, false);
extern1.addEventListener('mousedown', extern1Handler, false);
extern1.addEventListener('touchstart', extern1Handler, false);
extern2.addEventListener('mousedown', extern2Handler, false);
extern2.addEventListener('touchstart', extern2Handler, false);
extern10.addEventListener('mousedown', extern10Handler, false);
extern10.addEventListener('touchstart', extern10Handler, false);

function internHandler(e) {
    outputMode = 'INTERN';
    releaseNotes();
    intern.classList.add('enabled');
    extern1.classList.remove('enabled');
    extern2.classList.remove('enabled');
    extern10.classList.remove('enabled');
    // stops touch events from double triggering
    e.preventDefault();
}

function extern1Handler(e) {
    outputMode = 'EXTERN1';
    releaseNotes();
    intern.classList.remove('enabled');
    extern1.classList.add('enabled');
    extern2.classList.remove('enabled');
    extern10.classList.remove('enabled');
    e.preventDefault();
}

function extern2Handler(e) {
    outputMode = 'EXTERN2';
    releaseNotes();
    intern.classList.remove('enabled');
    extern1.classList.remove('enabled');
    extern2.classList.add('enabled');
    extern10.classList.remove('enabled');
    e.preventDefault();
}

function extern10Handler(e) {
    outputMode = 'EXTERN10';
    releaseNotes();
    intern.classList.remove('enabled');
    extern1.classList.remove('enabled');
    extern2.classList.remove('enabled');
    extern10.classList.add('enabled');
    e.preventDefault();
}

function releaseNotes() {
    toReface.send([0xb0, 0x7b, 0x00]);
    toCircuit.send([0xb0, 0x7b, 0x00]); // Channel 1
    toCircuit.send([0xb1, 0x7b, 0x00]); // Channel 2
    toCircuit.send([0xb9, 0x7b, 0x00]); // Channel 10
}
