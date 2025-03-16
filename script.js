// Enigma & Bombe Simulator Script

// Rotor specifications (wiring and notch positions)
const rotorSpecs = {
    "I":  { wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
    "II": { wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
    "III":{ wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
    "IV": { wiring: "ESOVPZJAYQUIRHXLNFTGKDCMWB", notch: "J" },
    "V":  { wiring: "VZBRGITYUPSDNHLXAWMJQOFECK", notch: "Z" }
};
// Prepare rotor mapping arrays and notch indices
for (let key in rotorSpecs) {
    let spec = rotorSpecs[key];
    // Forward mapping array
    spec.map = [];
    for(let i=0; i<26; i++){
        spec.map[i] = spec.wiring.charCodeAt(i) - 65;
    }
    // Inverse mapping array (for reverse path)
    spec.inv = [];
    for(let i=0; i<26; i++){
        spec.inv[spec.map[i]] = i;
    }
    // Notch index (position of notch letter)
    spec.notchIndex = spec.notch.charCodeAt(0) - 65;
}
// Reflector (using Reflector B by default)
const reflectorMap = [];
const reflectorStr = "YRUHQSLDPXNGOKMIEBFZCWVJAT";
for(let i=0; i<26; i++){
    reflectorMap[i] = reflectorStr.charCodeAt(i) - 65;
}

// Plugboard mapping
let plugboardMap = {};             // char->char mapping for connected pairs
let plugboardPairs = [];           // list of connections {a:'A', b:'B', color:'#...'}
const plugboardColors = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
                         "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#469990"];
let nextColorIndex = 0;
let selectedBtn = null;            // currently selected letter button for pairing

// Helper: get numeric plugboard mapping array of length 26
function getPlugboardNumericMap() {
    const mapArr = [];
    for(let i=0; i<26; i++){ 
        mapArr[i] = i;
    }
    for(let [char, mappedChar] of Object.entries(plugboardMap)) {
        let i = char.charCodeAt(0) - 65;
        let j = mappedChar.charCodeAt(0) - 65;
        mapArr[i] = j;
    }
    return mapArr;
}

// Enigma encryption/decryption for a given text with current rotor configuration and plugboard
function enigmaEncrypt(text, rotorOrder, rotorPositions) {
    // Setup rotor state
    let left = rotorSpecs[rotorOrder[0]];
    let middle = rotorSpecs[rotorOrder[1]];
    let right = rotorSpecs[rotorOrder[2]];
    let leftPos = rotorPositions[0];
    let middlePos = rotorPositions[1];
    let rightPos = rotorPositions[2];
    const plugMapArr = getPlugboardNumericMap();  // plugboard substitution mapping (numeric)
    let result = "";
    for(let ch of text.toUpperCase()) {
        if(ch < 'A' || ch > 'Z') {
            // Non-alphabetic character: output as-is, no rotor movement
            result += ch;
            continue;
        }
        // Step rotors
        let leftStep = false;
        let middleStep = false;
        if(middlePos === middle.notchIndex) {
            leftStep = true;
            middleStep = true;
        }
        if(rightPos === right.notchIndex) {
            middleStep = true;
        }
        // Advance rotors
        rightPos = (rightPos + 1) % 26;
        if(middleStep) {
            middlePos = (middlePos + 1) % 26;
        }
        if(leftStep) {
            leftPos = (leftPos + 1) % 26;
        }
        // Plugboard substitution (in)
        let cIndex = ch.charCodeAt(0) - 65;
        cIndex = plugMapArr[cIndex];
        // Through rotors (right -> left)
        cIndex = (cIndex + rightPos) % 26;
        cIndex = right.map[cIndex];
        cIndex = (cIndex - rightPos + 26) % 26;
        cIndex = (cIndex + middlePos) % 26;
        cIndex = middle.map[cIndex];
        cIndex = (cIndex - middlePos + 26) % 26;
        cIndex = (cIndex + leftPos) % 26;
        cIndex = left.map[cIndex];
        cIndex = (cIndex - leftPos + 26) % 26;
        // Reflector
        cIndex = reflectorMap[cIndex];
        // Back through rotors (left -> right)
        cIndex = (cIndex + leftPos) % 26;
        cIndex = left.inv[cIndex];
        cIndex = (cIndex - leftPos + 26) % 26;
        cIndex = (cIndex + middlePos) % 26;
        cIndex = middle.inv[cIndex];
        cIndex = (cIndex - middlePos + 26) % 26;
        cIndex = (cIndex + rightPos) % 26;
        cIndex = right.inv[cIndex];
        cIndex = (cIndex - rightPos + 26) % 26;
        // Plugboard substitution (out)
        cIndex = plugMapArr[cIndex];
        result += String.fromCharCode(cIndex + 65);
    }
    return result;
}

// Test if given rotor config decrypts crib plaintext to crib ciphertext
function testCribSetting(rotorOrder, rotorPositions, cribPlain, cribCipher) {
    // Initialize rotor state
    let left = rotorSpecs[rotorOrder[0]];
    let middle = rotorSpecs[rotorOrder[1]];
    let right = rotorSpecs[rotorOrder[2]];
    let leftPos = rotorPositions[0];
    let middlePos = rotorPositions[1];
    let rightPos = rotorPositions[2];
    const plugMapArr = getPlugboardNumericMap();
    for(let i = 0; i < cribPlain.length; i++) {
        let plainCh = cribPlain[i].toUpperCase();
        let cipherCh = cribCipher[i].toUpperCase();
        if(plainCh < 'A' || plainCh > 'Z' || cipherCh < 'A' || cipherCh > 'Z') {
            // Non-letter: must match exactly, no rotor movement
            if(plainCh !== cipherCh) return false;
            continue;
        }
        // Step rotors
        let leftStep = false;
        let middleStep = false;
        if(middlePos === middle.notchIndex) {
            leftStep = true;
            middleStep = true;
        }
        if(rightPos === right.notchIndex) {
            middleStep = true;
        }
        rightPos = (rightPos + 1) % 26;
        if(middleStep) middlePos = (middlePos + 1) % 26;
        if(leftStep) leftPos = (leftPos + 1) % 26;
        // Encrypt one character of crib
        let cIndex = plainCh.charCodeAt(0) - 65;
        cIndex = plugMapArr[cIndex];
        cIndex = (cIndex + rightPos) % 26;
        cIndex = right.map[cIndex];
        cIndex = (cIndex - rightPos + 26) % 26;
        cIndex = (cIndex + middlePos) % 26;
        cIndex = middle.map[cIndex];
        cIndex = (cIndex - middlePos + 26) % 26;
        cIndex = (cIndex + leftPos) % 26;
        cIndex = left.map[cIndex];
        cIndex = (cIndex - leftPos + 26) % 26;
        cIndex = reflectorMap[cIndex];
        cIndex = (cIndex + leftPos) % 26;
        cIndex = left.inv[cIndex];
        cIndex = (cIndex - leftPos + 26) % 26;
        cIndex = (cIndex + middlePos) % 26;
        cIndex = middle.inv[cIndex];
        cIndex = (cIndex - middlePos + 26) % 26;
        cIndex = (cIndex + rightPos) % 26;
        cIndex = right.inv[cIndex];
        cIndex = (cIndex - rightPos + 26) % 26;
        cIndex = plugMapArr[cIndex];
        let outCh = String.fromCharCode(cIndex + 65);
        if(outCh !== cipherCh) {
            return false;
        }
    }
    return true;
}

// Get DOM elements
const rotorLSelect = document.getElementById("rotorL");
const rotorMSelect = document.getElementById("rotorM");
const rotorRSelect = document.getElementById("rotorR");
const posLSelect = document.getElementById("posL");
const posMSelect = document.getElementById("posM");
const posRSelect = document.getElementById("posR");
const plugboardContainer = document.getElementById("plugboardContainer");
const plugboardLinesSVG = document.getElementById("plugboardLines");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const encButton = document.getElementById("encButton");
const copyButton = document.getElementById("copyButton");
const cribTextInput = document.getElementById("cribText");
const cribCipherInput = document.getElementById("cribCipher");
const cipherTextInput = document.getElementById("cipherText");
const bombeButton = document.getElementById("bombeButton");
const bombeResultsDiv = document.getElementById("bombeResults");

// Create plugboard letter buttons A-Z
for(let code = 65; code <= 90; code++) {
    let letter = String.fromCharCode(code);
    let btn = document.createElement("button");
    btn.id = "plug-" + letter;
    btn.className = "plug-letter btn btn-outline-secondary";
    btn.textContent = letter;
    btn.addEventListener("click", function() {
        handlePlugboardClick(btn);
    });
    plugboardContainer.appendChild(btn);
}
// Update SVG size initially
updatePlugboardLines();

// Handle plugboard letter click
function handlePlugboardClick(btn) {
    let letter = btn.textContent;
    if(selectedBtn === null) {
        // No letter selected yet
        if(letter in plugboardMap) {
            // Remove existing connection
            removePlugConnection(letter);
            updatePlugboardLines();
        } else {
            // Select this letter for new connection
            selectedBtn = btn;
            btn.classList.add("active");
        }
    } else {
        // A letter is already selected
        if(btn === selectedBtn) {
            // Cancel selection
            btn.classList.remove("active");
            selectedBtn = null;
        } else if(letter in plugboardMap) {
            // Second letter is already connected to someone else - ignore
            return;
        } else {
            // Connect the two selected letters
            let letter1 = selectedBtn.textContent;
            let letter2 = letter;
            plugboardMap[letter1] = letter2;
            plugboardMap[letter2] = letter1;
            plugboardPairs.push({a: letter1, b: letter2, color: plugboardColors[nextColorIndex]});
            nextColorIndex = (nextColorIndex + 1) % plugboardColors.length;
            // Clear selection
            selectedBtn.classList.remove("active");
            selectedBtn = null;
            updatePlugboardLines();
        }
    }
}

// Remove a plugboard connection involving a given letter
function removePlugConnection(letter) {
    if(!(letter in plugboardMap)) return;
    let other = plugboardMap[letter];
    delete plugboardMap[letter];
    delete plugboardMap[other];
    plugboardPairs = plugboardPairs.filter(pair => !(pair.a === letter || pair.b === letter));
}

// Redraw plugboard connection lines
function updatePlugboardLines() {
    // Set SVG size to container size
    const rect = plugboardContainer.getBoundingClientRect();
    plugboardLinesSVG.setAttribute("width", rect.width);
    plugboardLinesSVG.setAttribute("height", rect.height);
    // Remove old lines
    while(plugboardLinesSVG.firstChild) {
        plugboardLinesSVG.removeChild(plugboardLinesSVG.firstChild);
    }
    // Draw each connection line
    plugboardPairs.forEach(pair => {
        let btn1 = document.getElementById("plug-" + pair.a);
        let btn2 = document.getElementById("plug-" + pair.b);
        if(!btn1 || !btn2) return;
        // Compute center coordinates
        let x1 = btn1.offsetLeft + btn1.offsetWidth/2;
        let y1 = btn1.offsetTop + btn1.offsetHeight/2;
        let x2 = btn2.offsetLeft + btn2.offsetWidth/2;
        let y2 = btn2.offsetTop + btn2.offsetHeight/2;
        // Shorten line to stop at button edges
        let dx = x2 - x1;
        let dy = y2 - y1;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if(dist === 0) return;
        let r = btn1.offsetWidth / 2;
        if(dist > 2*r) {
            // Adjust endpoints
            x1 += dx * (r / dist);
            y1 += dy * (r / dist);
            x2 -= dx * (r / dist);
            y2 -= dy * (r / dist);
        }
        // Draw line
        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", pair.color);
        line.setAttribute("stroke-width", "2");
        line.setAttribute("stroke-linecap", "round");
        plugboardLinesSVG.appendChild(line);
    });
}

// Update lines on window resize
window.addEventListener("resize", updatePlugboardLines);

// Encrypt/Decrypt button event
encButton.addEventListener("click", () => {
    // Get rotor choices and positions
    let rotorOrder = [rotorLSelect.value, rotorMSelect.value, rotorRSelect.value];
    let rotorPositions = [
        posLSelect.value.charCodeAt(0) - 65,
        posMSelect.value.charCodeAt(0) - 65,
        posRSelect.value.charCodeAt(0) - 65
    ];
    // Encrypt/Decrypt input text
    let plaintext = inputText.value || "";
    let output = enigmaEncrypt(plaintext, rotorOrder, rotorPositions);
    outputText.value = output;
});

// Copy output button event
copyButton.addEventListener("click", () => {
    let text = outputText.value;
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => {
        copyButton.textContent = "✓ コピー完了";
        setTimeout(() => { copyButton.textContent = "コピー"; }, 1000);
    });
});

// Bombe decode button event
bombeButton.addEventListener("click", () => {
    bombeResultsDiv.innerHTML = "";
    let cribPlain = (cribTextInput.value || "").replace(/\s+/g, "").toUpperCase();
    let cribCipher = (cribCipherInput.value || "").replace(/\s+/g, "").toUpperCase();
    let fullCipher = cipherTextInput.value || "";
    if(cribPlain.length === 0 || cribCipher.length === 0 || fullCipher.length === 0) {
        alert("全ての入力を行ってください。");
        return;
    }
    if(cribPlain.length !== cribCipher.length) {
        alert("クリップ文と暗号文セクションの文字数が一致していません。");
        return;
    }
    // Search all rotor combinations
    const rotorKeys = ["I","II","III","IV","V"];
    let foundSettings = [];
    for(let i = 0; i < rotorKeys.length; i++){
        for(let j = 0; j < rotorKeys.length; j++){
            if(j === i) continue;
            for(let k = 0; k < rotorKeys.length; k++){
                if(k === i || k === j) continue;
                let rotorCombo = [rotorKeys[i], rotorKeys[j], rotorKeys[k]];
                for(let a = 0; a < 26; a++){
                    for(let b = 0; b < 26; b++){
                        for(let c = 0; c < 26; c++){
                            if(testCribSetting(rotorCombo, [a, b, c], cribPlain, cribCipher)) {
                                foundSettings.push({ rotors: rotorCombo.slice(), positions: [a, b, c] });
                            }
                        }
                    }
                }
            }
        }
    }
    if(foundSettings.length === 0) {
        // No result
        let alertDiv = document.createElement("div");
        alertDiv.className = "alert alert-warning";
        alertDiv.textContent = "該当する設定が見つかりませんでした。";
        bombeResultsDiv.appendChild(alertDiv);
    } else {
        foundSettings.forEach(setting => {
            // Decrypt full ciphertext with this setting
            let plaintext = enigmaEncrypt(fullCipher, setting.rotors, setting.positions);
            // Create result card
            let card = document.createElement("div");
            card.className = "card mb-3";
            let cardHeader = document.createElement("div");
            cardHeader.className = "card-header";
            let rotorNames = setting.rotors.join("-");
            let posLetters = setting.positions.map(p => String.fromCharCode(p + 65)).join("");
            cardHeader.textContent = "ローター: " + rotorNames + " / 初期位置: " + posLetters;
            let cardBody = document.createElement("div");
            cardBody.className = "card-body";
            let pre = document.createElement("pre");
            pre.className = "plaintext-output m-0";
            // Highlight crib plaintext in output
            let idx = plaintext.toUpperCase().indexOf(cribPlain);
            if(idx !== -1 && cribPlain.length > 0) {
                let before = plaintext.substring(0, idx);
                let match = plaintext.substring(idx, idx + cribPlain.length);
                let after = plaintext.substring(idx + cribPlain.length);
                pre.textContent = before;
                let mark = document.createElement("mark");
                mark.textContent = match;
                pre.appendChild(mark);
                pre.appendChild(document.createTextNode(after));
            } else {
                pre.textContent = plaintext;
            }
            cardBody.appendChild(pre);
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            bombeResultsDiv.appendChild(card);
        });
    }
});

// Tab navigation functions
function showEnigma(event) {
    event.preventDefault();
    document.getElementById("enigmaSection").style.display = "";
    document.getElementById("bombeSection").style.display = "none";
    event.target.classList.add("active");
    event.target.parentElement.nextElementSibling.firstElementChild.classList.remove("active");
}
function showBombe(event) {
    event.preventDefault();
    document.getElementById("enigmaSection").style.display = "none";
    document.getElementById("bombeSection").style.display = "";
    event.target.classList.add("active");
    event.target.parentElement.previousElementSibling.firstElementChild.classList.remove("active");
}
