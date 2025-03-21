document.addEventListener("DOMContentLoaded", function() {

  // ==========================
  // 言語設定・翻訳
  // ==========================
  const TEXT = {
    ja: {
      title: "エニグマ暗号機・ボンベシミュレータ",
      enigmaTitle: "エニグマ暗号機シミュレータ",
      bombeTitle: "ボンベマシン（総当たり解析）",
      rotorSelection: "ローター選択 (Rotors I–V):",
      initialPositions: "初期位置:",
      plugboardLabel: "プラグボード (各文字をクリックしてペアを作成)",
      plaintextLabel: "平文:",
      ciphertextLabel: "暗号文:",
      encryptBtn: "暗号化",
      decryptBtn: "復号",
      bombeBtn: "鍵探索開始",
      clearPlugboardBtn: "クリア",
      helpBtn: "ヘルプ",
      languageLabel: "言語:",
      plugboardResult: "推測されたプラグボード設定:",
      bombeProgress: "現在の設定: ローター {rotors} / 初期位置 {positions} で試行中...",
      inputError: "平文と暗号文の両方を入力してください。",
      lengthError: "平文と暗号文の長さが一致している必要があります。",
      notFound: "一致する設定が見つかりませんでした。"
    },
    en: {
      title: "Enigma Machine & Bombe Simulator",
      enigmaTitle: "Enigma Machine Simulator",
      bombeTitle: "Bombe Machine (Brute-Force Analysis)",
      rotorSelection: "Rotor Selection (I–V):",
      initialPositions: "Initial Positions:",
      plugboardLabel: "Plugboard (Click letters to pair)",
      plaintextLabel: "Plaintext:",
      ciphertextLabel: "Ciphertext:",
      encryptBtn: "Encrypt",
      decryptBtn: "Decrypt",
      bombeBtn: "Find Key",
      clearPlugboardBtn: "Clear",
      helpBtn: "Help",
      languageLabel: "Language:",
      plugboardResult: "Detected Plugboard Settings:",
      bombeProgress: "Trying setting: Rotors {rotors} / Positions {positions}..."
    }
  };

  let currentLang = 'ja';
  function updateLanguage(lang) {
    currentLang = lang;
    const t = TEXT[lang];
    document.title = t.title;
    document.getElementById('app-title').textContent = t.title;
    document.getElementById('enigma-title').textContent = t.enigmaTitle;
    document.getElementById('bombe-title').textContent = t.bombeTitle;
    document.getElementById('rotor-selection-label').textContent = t.rotorSelection;
    document.getElementById('initial-positions-label').textContent = t.initialPositions;
    document.getElementById('plugboard-label').textContent = t.plugboardLabel;
    document.getElementById('plaintext-label').textContent = t.plaintextLabel;
    document.getElementById('ciphertext-label').textContent = t.ciphertextLabel;
    document.getElementById('encrypt-btn').textContent = t.encryptBtn;
    document.getElementById('decrypt-btn').textContent = t.decryptBtn;
    document.getElementById('bombe-btn').textContent = t.bombeBtn;
    document.getElementById('clear-plugboard-btn').textContent = t.clearPlugboardBtn;
    document.getElementById('help-btn').textContent = t.helpBtn;
  }
  document.getElementById('languageSelect').addEventListener('change', function() {
    updateLanguage(this.value);
  });
  updateLanguage(currentLang);

  // ==========================
  // 初期位置セレクトの生成 (A～Z)
  // ==========================
  const posSelectIds = ['pos1-select','pos2-select','pos3-select'];
  for (let selId of posSelectIds) {
    const sel = document.getElementById(selId);
    sel.innerHTML = "";
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      const opt = document.createElement('option');
      opt.value = letter;
      opt.textContent = letter;
      sel.appendChild(opt);
    }
    sel.value = 'A';
  }

  // ==========================
  // プラグボードボタン生成 (A～Z, 2行・中央配置・均等間隔)
  // ==========================
  function createPlugboardButtons() {
    const container = document.getElementById('plugboard-buttons');
    container.innerHTML = "";
    let row1 = document.createElement('div');
    row1.className = "plugboard-row";
    let row2 = document.createElement('div');
    row2.className = "plugboard-row";
    for (let code = 65; code <= 90; code++){
      let letter = String.fromCharCode(code);
      let btn = document.createElement('button');
      btn.className = 'plug-letter btn btn-outline-secondary';
      btn.textContent = letter;
      btn.dataset.letter = letter;
      btn.addEventListener('click', plugButtonClick);
      if (code <= 77) {
        row1.appendChild(btn);
      } else {
        row2.appendChild(btn);
      }
    }
    container.appendChild(row1);
    container.appendChild(row2);
  }
  createPlugboardButtons();

  // ==========================
  // プラグボード接続状態の初期化 (各文字が自分自身)
  // ==========================
  let plugboardMapping = {};
  function initPlugboardMapping() {
    for (let code = 65; code <= 90; code++){
      let letter = String.fromCharCode(code);
      plugboardMapping[letter] = letter;
    }
  }
  initPlugboardMapping();

  // ==========================
  // ペアの色管理
  // ==========================
  const availableColors = ["#ff5722", "#4caf50", "#2196f3", "#9c27b0", "#ff9800", "#3f51b5", "#e91e63", "#00bcd4", "#8bc34a", "#607d8b"];
  let usedPairColors = {};
  function getUnusedColor() {
    const used = Object.values(usedPairColors);
    for (let color of availableColors) {
      if (!used.includes(color)) {
        return color;
      }
    }
    return availableColors[0];
  }

  // ==========================
  // プラグボードボタンのクリック処理
  // ==========================
  let selectedPlug = null;
  function plugButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    let btn = e.currentTarget;
    let letter = btn.dataset.letter;
    if (plugboardMapping[letter] !== letter) {
      removePlugPair(letter);
      return;
    }
    if (!selectedPlug) {
      selectedPlug = btn;
      btn.classList.add('selected');
    } else {
      if (selectedPlug === btn) {
        selectedPlug.classList.remove('selected');
        selectedPlug = null;
        return;
      }
      setPlugPair(selectedPlug, btn);
      selectedPlug.classList.remove('selected');
      selectedPlug = null;
    }
  }
  function setPlugPair(btn1, btn2) {
    let a = btn1.dataset.letter;
    let b = btn2.dataset.letter;
    plugboardMapping[a] = b;
    plugboardMapping[b] = a;
    let color = getUnusedColor();
    usedPairColors[a] = color;
    usedPairColors[b] = color;
    btn1.classList.remove('btn-outline-secondary');
    btn1.style.backgroundColor = color;
    btn1.style.color = "#fff";
    btn2.classList.remove('btn-outline-secondary');
    btn2.style.backgroundColor = color;
    btn2.style.color = "#fff";
  }
  function removePlugPair(letter) {
    let partner = plugboardMapping[letter];
    if (letter === partner) return;
    let btn1 = document.querySelector(`.plug-letter[data-letter="${letter}"]`);
    let btn2 = document.querySelector(`.plug-letter[data-letter="${partner}"]`);
    if (btn1) {
      btn1.classList.remove('btn-primary');
      btn1.classList.add('btn-outline-secondary');
      btn1.style.backgroundColor = "";
      btn1.style.color = "";
    }
    if (btn2) {
      btn2.classList.remove('btn-primary');
      btn2.classList.add('btn-outline-secondary');
      btn2.style.backgroundColor = "";
      btn2.style.color = "";
    }
    delete usedPairColors[letter];
    delete usedPairColors[partner];
    plugboardMapping[letter] = letter;
    plugboardMapping[partner] = partner;
  }
  document.getElementById('clear-plugboard-btn').addEventListener('click', function() {
    initPlugboardMapping();
    usedPairColors = {};
    document.querySelectorAll('.plug-letter').forEach(btn => {
      btn.classList.remove('btn-primary', 'selected');
      btn.classList.add('btn-outline-secondary');
      btn.style.backgroundColor = "";
      btn.style.color = "";
    });
  });

  // ==========================
  // ローター定義
  // ==========================
  const rotors = {
    "I":  { wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
    "II": { wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
    "III":{ wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
    "IV": { wiring: "ESOVPZJAYQUIRHXLNFTGKDCMWB", notch: "J" },
    "V":  { wiring: "VZBRGITYUPSDNHLXAWMJQOFECK", notch: "Z" }
  };
  for (let key in rotors) {
    let wiringStr = rotors[key].wiring;
    rotors[key].forwardMap = [];
    rotors[key].backwardMap = [];
    for (let i = 0; i < 26; i++) {
      let c = wiringStr.charCodeAt(i) - 65;
      rotors[key].forwardMap[i] = c;
      rotors[key].backwardMap[c] = i;
    }
    rotors[key].notchIndex = rotors[key].notch.charCodeAt(0) - 65;
  }
  const reflectorStr = "YRUHQSLDPXNGOKMIEBFZCWVJAT";
  const reflectorMap = [];
  for (let i = 0; i < 26; i++) {
    reflectorMap[i] = reflectorStr.charCodeAt(i) - 65;
  }

  // ==========================
  // ローターのステップ処理（ダブルステップ対応）
  // ==========================
  function stepRotors(pos1, pos2, pos3, r1, r2, r3, applyStep) {
    if (applyStep) {
      pos3 = (pos3 + 1) % 26;
      let middleStep = ((pos3 === r3.notchIndex) || (pos2 === r2.notchIndex));
      if (middleStep) {
        pos2 = (pos2 + 1) % 26;
        if (pos2 === r2.notchIndex) {
          pos1 = (pos1 + 1) % 26;
        }
      }
    }
    return [pos1, pos2, pos3];
  }

  // ==========================
  // 1文字の処理
  // ==========================
  function processChar(ch, pos1, pos2, pos3, r1, r2, r3, plugMapArr) {
    let c = plugMapArr[ch.charCodeAt(0) - 65];
    c = r3.forwardMap[(c + pos3) % 26];
    c = (c - pos3 + 26) % 26;
    c = r2.forwardMap[(c + pos2) % 26];
    c = (c - pos2 + 26) % 26;
    c = r1.forwardMap[(c + pos1) % 26];
    c = (c - pos1 + 26) % 26;
    c = reflectorMap[c];
    c = r1.backwardMap[(c + pos1) % 26];
    c = (c - pos1 + 26) % 26;
    c = r2.backwardMap[(c + pos2) % 26];
    c = (c - pos2 + 26) % 26;
    c = r3.backwardMap[(c + pos3) % 26];
    c = (c - pos3 + 26) % 26;
    c = plugMapArr[c];
    return String.fromCharCode(c + 65);
  }

  // ==========================
  // enigmaProcess(): 暗号化／復号（各文字処理前に必ずステップ）
  // ==========================
  function enigmaProcess(inputText) {
    const rotor1 = document.getElementById('rotor1-select').value;
    const rotor2 = document.getElementById('rotor2-select').value;
    const rotor3 = document.getElementById('rotor3-select').value;
    let pos1 = document.getElementById('pos1-select').value.charCodeAt(0) - 65;
    let pos2 = document.getElementById('pos2-select').value.charCodeAt(0) - 65;
    let pos3 = document.getElementById('pos3-select').value.charCodeAt(0) - 65;
    const r1 = rotors[rotor1];
    const r2 = rotors[rotor2];
    const r3 = rotors[rotor3];
    const ignorePlugboard = document.getElementById("ignore-plugboard");
    const plugMapArr = [];
    for (let i = 0; i < 26; i++){
      if (ignorePlugboard && ignorePlugboard.checked) {
        plugMapArr[i] = i;
      } else {
        let letter = String.fromCharCode(65 + i);
        plugMapArr[i] = plugboardMapping[letter].charCodeAt(0) - 65;
      }
    }
    let output = "";
    for (let ch of inputText.toUpperCase()) {
      if (ch < 'A' || ch > 'Z') {
        output += ch;
        continue;
      }
      [pos1, pos2, pos3] = stepRotors(pos1, pos2, pos3, r1, r2, r3, true);
      output += processChar(ch, pos1, pos2, pos3, r1, r2, r3, plugMapArr);
    }
    return output;
  }

  document.getElementById('encrypt-btn').addEventListener('click', () => {
    let plain = document.getElementById('plaintext').value;
    if (!plain) return;
    let result = enigmaProcess(plain);
    document.getElementById('ciphertext').value = result;
  });
  document.getElementById('decrypt-btn').addEventListener('click', () => {
    let cipher = document.getElementById('ciphertext').value;
    if (!cipher) return;
    let result = enigmaProcess(cipher);
    document.getElementById('plaintext').value = result;
  });

  // ==========================
  // タブ切替処理 (Enigma / Bombe)
  // ==========================
  document.getElementById('tab-enigma').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('enigmaTab').style.display = "block";
    document.getElementById('bombeTab').style.display = "none";
    this.classList.add('active');
    document.getElementById('tab-bombe').classList.remove('active');
  });
  document.getElementById('tab-bombe').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('enigmaTab').style.display = "none";
    document.getElementById('bombeTab').style.display = "block";
    this.classList.add('active');
    document.getElementById('tab-enigma').classList.remove('active');
  });

  // ==========================
  // Bombe用候補復号関数（プラグボード不明モードの場合はidentityで処理）
  // ==========================
  function enigmaProcessCandidate(fullText, rotorOrder, positions) {
    const rotor1 = rotorOrder[0];
    const rotor2 = rotorOrder[1];
    const rotor3 = rotorOrder[2];
    let pos1 = positions[0], pos2 = positions[1], pos3 = positions[2];
    const r1 = rotors[rotor1];
    const r2 = rotors[rotor2];
    const r3 = rotors[rotor3];
    const ignorePlugboard = document.getElementById("ignore-plugboard");
    const plugMapArr = [];
    for (let i = 0; i < 26; i++){
      if (ignorePlugboard && ignorePlugboard.checked) {
        plugMapArr[i] = i;
      } else {
        let letter = String.fromCharCode(65 + i);
        plugMapArr[i] = plugboardMapping[letter].charCodeAt(0) - 65;
      }
    }
    let output = "";
    for (let ch of fullText.toUpperCase()) {
      if (ch < 'A' || ch > 'Z') {
        output += ch;
        continue;
      }
      [pos1, pos2, pos3] = stepRotors(pos1, pos2, pos3, r1, r2, r3, true);
      output += processChar(ch, pos1, pos2, pos3, r1, r2, r3, plugMapArr);
    }
    return output;
  }

  // ==========================
  // Bombe用：Crib部分から推測されるプラグボード設定を算出する関数
  // ==========================
  function computePlugboardMapping(candidateSubstr, cribPlain) {
    let mapping = {};
    for (let i = 0; i < cribPlain.length; i++) {
      mapping[candidateSubstr[i]] = cribPlain[i];
      mapping[cribPlain[i]] = candidateSubstr[i];
    }
    return mapping;
  }

  // Bombe用：プラグボード設定を整形して表示用文字列に変換
  function formatPlugboardMapping(mapping) {
    let pairs = [];
    let used = {};
    for (let key in mapping) {
      if (mapping[key] !== key && !used[key] && !used[mapping[key]]) {
        pairs.push(key + " ↔ " + mapping[key]);
        used[key] = true;
        used[mapping[key]] = true;
      }
    }
    return pairs.length ? pairs.join(", ") : "なし";
  }

  // ==========================
  // Bombeマシン処理 (総当たり探索) – 部分一致対応（Cribが文中の任意位置に出現する場合）
  // さらに、探索中のログもリアルタイムに表示
  // ==========================
  document.getElementById('bombe-btn').addEventListener('click', () => {
    const cribCipher = document.getElementById('crib-cipher').value.toUpperCase().replace(/\s/g, "");
    const cribPlain = document.getElementById('crib-text').value.toUpperCase().replace(/\s/g, "");
    const fullCipher = document.getElementById('full-cipher').value.toUpperCase().replace(/\s/g, "");
    const bombeStatus = document.getElementById('bombe-progress');
    const bombeResults = document.getElementById('bombe-results');
    const bombeLog = document.getElementById('bombe-log');
    bombeResults.innerHTML = "";
    bombeStatus.textContent = "";
    bombeLog.innerHTML = "";

    if (!cribPlain || !cribCipher || !fullCipher) {
      bombeStatus.textContent = TEXT[currentLang].inputError;
      bombeStatus.classList.add('error-msg');
      return;
    }
    if (cribPlain.length > cribCipher.length) {
      bombeStatus.textContent = "Cribの平文が、対応する暗号文より長いです。";
      bombeStatus.classList.add('error-msg');
      return;
    }

    bombeStatus.classList.remove('error-msg','success-msg');
    bombeStatus.textContent = "鍵探索中…";
    bombeLog.innerHTML += "探索開始<br>";

    const rotorOrder = [
      document.getElementById('rotor1-select').value,
      document.getElementById('rotor2-select').value,
      document.getElementById('rotor3-select').value
    ];
    const total = 26 * 26 * 26;
    let foundResults = [];
    let processed = 0;

    /**
     * testBombeSetting():
     * 指定された暗号文 text について、全オフセットを試し、
     * そのオフセットで生成された部分文字列（長さ = cribPlain.length）が expected と完全一致するかを判定する。
     */
    function testBombeSetting(text, expected, rotorOrder, positions, fullMode) {
      let [pos1, pos2, pos3] = positions;
      const r1 = rotors[rotorOrder[0]];
      const r2 = rotors[rotorOrder[1]];
      const r3 = rotors[rotorOrder[2]];
      const ignorePlugboard = document.getElementById("ignore-plugboard");
      const plugMapArr = [];
      for (let i = 0; i < 26; i++){
        if (ignorePlugboard && ignorePlugboard.checked) {
          plugMapArr[i] = i;
        } else {
          let letter = String.fromCharCode(65 + i);
          plugMapArr[i] = plugboardMapping[letter].charCodeAt(0) - 65;
        }
      }
      if (text.length < expected.length) return false;
      for (let offset = 0; offset <= text.length - expected.length; offset++) {
        let p1 = pos1, p2 = pos2, p3 = pos3;
        let candidateOutput = "";
        for (let i = 0; i < offset; i++) {
          [p1, p2, p3] = stepRotors(p1, p2, p3, r1, r2, r3, true);
        }
        for (let i = offset; i < offset + expected.length; i++) {
          [p1, p2, p3] = stepRotors(p1, p2, p3, r1, r2, r3, true);
          candidateOutput += processChar(text[i], p1, p2, p3, r1, r2, r3, plugMapArr);
        }
        if (candidateOutput === expected) {
          return true;
        }
      }
      return false;
    }

    function processChunk(start) {
      const chunkSize = 500;
      for (let i = start; i < Math.min(start + chunkSize, total); i++) {
        let pos1 = Math.floor(i / (26 * 26));
        let pos2 = Math.floor(i / 26) % 26;
        let pos3 = i % 26;
        if (testBombeSetting(cribCipher, cribPlain, rotorOrder, [pos1, pos2, pos3], false)) {
          let fullPlain = enigmaProcessCandidate(fullCipher, rotorOrder, [pos1, pos2, pos3]);
          let predictedPlugboard = null;
          let index = fullPlain.indexOf(cribPlain);
          if (index !== -1) {
            let candidateSegment = fullPlain.substr(index, cribPlain.length);
            predictedPlugboard = computePlugboardMapping(candidateSegment, cribPlain);
          }
          foundResults.push({
            rotors: rotorOrder.slice(),
            positions: String.fromCharCode(65 + pos1) + String.fromCharCode(65 + pos2) + String.fromCharCode(65 + pos3),
            plaintext: fullPlain,
            plugboard: predictedPlugboard
          });
          bombeLog.innerHTML += `候補発見: ${String.fromCharCode(65 + pos1)}${String.fromCharCode(65 + pos2)}${String.fromCharCode(65 + pos3)}<br>`;
        }
        processed++;
      }
      bombeStatus.textContent = TEXT[currentLang].bombeProgress
        .replace("{rotors}", rotorOrder.join("-"))
        .replace("{positions}",
          String.fromCharCode(65 + Math.floor((processed - 1) / (26 * 26))) +
          String.fromCharCode(65 + (Math.floor((processed - 1) / 26) % 26)) +
          String.fromCharCode(65 + ((processed - 1) % 26))
        ) + ` (${Math.floor((processed / total) * 100)}% 完了)`;
      bombeLog.innerHTML += `処理済み: ${processed} / ${total} 候補<br>`;
      if (processed < total) {
        setTimeout(() => processChunk(start + chunkSize), 0);
      } else {
        if (foundResults.length === 0) {
          bombeStatus.textContent = TEXT[currentLang].notFound;
        } else {
          bombeStatus.textContent = "解読候補が見つかりました。";
          foundResults.forEach(res => {
            let card = document.createElement("div");
            card.className = "card mb-2";
            let cardBody = document.createElement("div");
            cardBody.className = "card-body";
            let header = document.createElement("h6");
            header.className = "card-title";
            header.textContent = `Rotors: ${res.rotors.join("-")} / Positions: ${res.positions}`;
            let plugInfo = document.createElement("p");
            if (res.plugboard) {
              plugInfo.textContent = TEXT[currentLang].plugboardResult + " " + formatPlugboardMapping(res.plugboard);
            }
            let pre = document.createElement("pre");
            pre.textContent = res.plaintext;
            cardBody.appendChild(header);
            if (plugInfo.textContent) cardBody.appendChild(plugInfo);
            cardBody.appendChild(pre);
            card.appendChild(cardBody);
            bombeResults.appendChild(card);
          });
        }
      }
    }
    processChunk(0);
  });

  // ==========================
  // Bombe用候補復号関数（プラグボードは常に identity で処理）
  // ==========================
  function enigmaProcessCandidate(fullText, rotorOrder, positions) {
    const rotor1 = rotorOrder[0];
    const rotor2 = rotorOrder[1];
    const rotor3 = rotorOrder[2];
    let pos1 = positions[0], pos2 = positions[1], pos3 = positions[2];
    const r1 = rotors[rotor1];
    const r2 = rotors[rotor2];
    const r3 = rotors[rotor3];
    const ignorePlugboard = document.getElementById("ignore-plugboard");
    const plugMapArr = [];
    for (let i = 0; i < 26; i++){
      if (ignorePlugboard && ignorePlugboard.checked) {
        plugMapArr[i] = i;
      } else {
        let letter = String.fromCharCode(65 + i);
        plugMapArr[i] = plugboardMapping[letter].charCodeAt(0) - 65;
      }
    }
    let output = "";
    for (let ch of fullText.toUpperCase()) {
      if (ch < 'A' || ch > 'Z') {
        output += ch;
        continue;
      }
      [pos1, pos2, pos3] = stepRotors(pos1, pos2, pos3, r1, r2, r3, true);
      output += processChar(ch, pos1, pos2, pos3, r1, r2, r3, plugMapArr);
    }
    return output;
  }

  // ==========================
  // ヘルプモーダル処理
  // ==========================
  function populateHelpContent() {
    const t = TEXT[currentLang];
    const helpContent = document.getElementById('help-content');
    helpContent.innerHTML = `
      <p>${t.helpOverview}</p>
      <p>${t.helpRotor1}</p>
      <p>${t.helpRotor2}</p>
      <p>${t.helpRotor3}</p>
      <p>${t.helpRotor4}</p>
      <p>${t.helpRotor5}</p>
    `;
  }
  document.getElementById('help-btn').addEventListener('click', () => {
    populateHelpContent();
    let modal = new bootstrap.Modal(document.getElementById('help-modal'));
    modal.show();
  });
  document.getElementById('help-close').addEventListener('click', () => {
    let modalEl = document.getElementById('help-modal');
    let modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();
  });
});
