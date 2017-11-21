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
        channel = 0x00;
    } else {
        return;
    }

    if (msg.data == 0xfe || msg.data == 0xf8) {
        return;
    }
    // TODO set channel
    output.send(msg.data);
}

intern.onclick = function() {
    outputMode = 'INTERN';
};

extern1.onclick = function() {
    outputMode = 'EXTERN1';
};

extern2.onclick = function() {
    outputMode = 'EXTERN2';
};

extern10.onclick = function() {
    outputMode = 'EXTERN10';
};
