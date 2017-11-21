var toReface, fromReface;
var toCircuit, fromCircuit;

navigator.requestMIDIAccess({sysex: true}).then(function(midi) {
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
    /*
    i.onmidimessage = msg => {
        o.send(msg.data);
        console.log(msg.data)
    }
    */
});

intern.onclick = function() {
    // Enable local control
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x06, 0x01, 0xf7]);
    // Disable midi out
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x00, 0x7f, 0xf7]);
};

extern1.onclick = function() {
    // Disable local control
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x06, 0x00, 0xf7]);
    // Enable midi out on Channel 1 (0x00)
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x00, 0x00, 0xf7]);
};

extern2.onclick = function() {
    // Disable local control
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x06, 0x00, 0xf7]);
    // Enable midi out on Channel 2 (0x01)
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x00, 0x01, 0xf7]);
};

extern10.onclick = function() {
    // Disable local control
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x06, 0x00, 0xf7]);
    // Enable midi out on Channel 10 (0x09)
    toReface.send([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x03, 0x00, 0x00, 0x00, 0x09, 0xf7]);
};
