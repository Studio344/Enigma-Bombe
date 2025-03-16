// エニグマ機の設定：ローター配線とノッチ位置 定義
const rotorSpecs = {
  I:    { wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
  II:   { wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
  III:  { wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
  // 必要ならIV, Vなど追加可能
};
const reflectorSpec = { wiring: "YRUHQSLDPXNGOKMIEBFZCWVJAT" };  // リフレクターB

// ローターオブジェクト生成（配線マップと逆引きマップ、ノッチ位置の数値化）
function createRotor(spec) {
  const forwardMap = new Array(26);
  const reverseMap = new Array(26);
  for (let i = 0; i < 26; i++) {
    // A=0, B=1,...に変換してマップ作成
    const c = spec.wiring.charCodeAt(i) - 65;
    forwardMap[i] = c;
    reverseMap[c] = i;
  }
  return {
    forwardMap: forwardMap,
    reverseMap: reverseMap,
    notch: spec.notch.charCodeAt(0) - 65
  };
}
// 使うローター3つ作成（I, II, III固定）
const rotorLeft  = createRotor(rotorSpecs.I);
const rotorMid   = createRotor(rotorSpecs.II);
const rotorRight = createRotor(rotorSpecs.III);
// リフレクターのマップを作成
const reflectorMap = (() => {
  const map = new Array(26);
  for (let i = 0; i < 26; i++) {
    const c = reflectorSpec.wiring.charCodeAt(i) - 65;
    map[i] = c;
  }
  return map;
})();

// プラグボードの接続状況を表すマップ（例：{A: 'B', B: 'A', ...}）
let plugConnections = {};  // 現在の接続ペアを保持

// ボタンが押せない問題を修正するため、クリックイベントを適切に設定
const plugButtons = document.querySelectorAll('.plug-letter');
const plugboardSVG = document.getElementById('plugboard-svg');
let firstSelected = null;
let firstSelectedBtn = null;

// すべてのボタンにクリックイベントを適用
plugButtons.forEach(btn => {
  btn.addEventListener('click', (event) => {
    event.stopPropagation(); // 他のイベントと競合しないようにする
    const letter = btn.dataset.letter;

    console.log(`Plugboard button clicked: ${letter}`); // デバッグ用

    // ボンベ処理実行中は変更不可
    if (isBombeRunning) return;

    if (!firstSelected) {
      if (plugConnections[letter]) {
        // 既存のペアを解除
        unpairPlug(letter);
      } else {
        // 最初の文字を選択
        firstSelected = letter;
        firstSelectedBtn = btn;
        btn.classList.remove('btn-light');
        btn.classList.add('btn-warning');
      }
    } else {
      if (letter === firstSelected) {
        // 同じ文字を選んだ場合は選択キャンセル
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-light');
        firstSelected = null;
        firstSelectedBtn = null;
      } else if (plugConnections[letter]) {
        // 2つ目の選択が既にペア済みの場合は無効
      } else {
        // 新しいペアを作成
        pairPlug(firstSelected, letter);
        firstSelectedBtn.classList.remove('btn-warning');
        firstSelectedBtn.classList.add('btn-primary');
        btn.classList.remove('btn-light');
        btn.classList.add('btn-primary');

        firstSelected = null;
        firstSelectedBtn = null;
      }
    }
  });

  // ボタンが確実にクリック可能になるように調整
  btn.setAttribute('tabindex', '0');
  btn.style.pointerEvents = 'auto';
  btn.style.position = 'relative'; // 影響を受けにくくする
  btn.style.zIndex = '10'; // 他の要素より前面にする
});


// プラグボードで2文字を接続する処理
function pairPlug(letter1, letter2) {
  // 接続マップ更新（双方向登録）
  plugConnections[letter1] = letter2;
  plugConnections[letter2] = letter1;
  // 線を描画
  drawPlugLine(letter1, letter2);
}
// プラグボードで接続を解除する処理
function unpairPlug(letter) {
  const partner = plugConnections[letter];
  if (!partner) return;
  // 接続マップから削除
  delete plugConnections[letter];
  delete plugConnections[partner];
  // UIボタンの色を元に戻す
  const btn1 = document.querySelector(`.plug-letter[data-letter="${letter}"]`);
  const btn2 = document.querySelector(`.plug-letter[data-letter="${partner}"]`);
  if (btn1) { btn1.classList.remove('btn-primary', 'btn-warning'); btn1.classList.add('btn-light'); }
  if (btn2) { btn2.classList.remove('btn-primary', 'btn-warning'); btn2.classList.add('btn-light'); }
  // 線を削除
  const line = document.getElementById(`plug-line-${[letter, partner].sort().join('')}`);
  if (line) { line.remove(); }
}

// プラグボード接続線を前面に描画するよう修正
function drawPlugLine(letter1, letter2) {
    const btn1 = document.querySelector(`.plug-letter[data-letter="${letter1}"]`);
    const btn2 = document.querySelector(`.plug-letter[data-letter="${letter2}"]`);
    if (!btn1 || !btn2) return;

    const rect1 = btn1.getBoundingClientRect();
    const rect2 = btn2.getBoundingClientRect();
    const containerRect = document.getElementById('plugboard').getBoundingClientRect();

    // ボタンの中央を計算
    const x1 = rect1.left - containerRect.left + rect1.width / 2;
    const y1 = rect1.top - containerRect.top + rect1.height / 2;
    const x2 = rect2.left - containerRect.left + rect2.width / 2;
    const y2 = rect2.top - containerRect.top + rect2.height / 2;

    // SVGのサイズを適切に設定（動的に変更）
    plugboardSVG.setAttribute('width', containerRect.width);
    plugboardSVG.setAttribute('height', containerRect.height);

    // 線要素を作成
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('id', `plug-line-${[letter1, letter2].sort().join('')}`);
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#ff9800'); // 鮮明なオレンジ色の線
    line.setAttribute('stroke-width', '4'); // 太めにする
    line.setAttribute('stroke-linecap', 'round');

    // SVGの一番前面に追加
    plugboardSVG.appendChild(line);
    }
  

// ウィンドウリサイズ時に全てのプラグボード接続線を引き直し
window.addEventListener('resize', () => {
  document.querySelectorAll('#plugboard-svg line').forEach(line => {
    const l1 = line.getAttribute('id').slice(9, 10);
    const l2 = line.getAttribute('id').slice(10, 11);
    // 2文字の現在位置で線を更新
    const btn1 = document.querySelector(`.plug-letter[data-letter="${l1}"]`);
    const btn2 = document.querySelector(`.plug-letter[data-letter="${l2}"]`);
    if (btn1 && btn2) {
      const rect1 = btn1.getBoundingClientRect();
      const rect2 = btn2.getBoundingClientRect();
      const containerRect = document.getElementById('plugboard').getBoundingClientRect();
      const x1 = rect1.left - containerRect.left + rect1.width/2;
      const y1 = rect1.top - containerRect.top + rect1.height/2;
      const x2 = rect2.left - containerRect.left + rect2.width/2;
      const y2 = rect2.top - containerRect.top + rect2.height/2;
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
    }
  });
});

// エニグマ暗号機でのテキスト暗号化/復号関数
function enigmaEncryptText(inputText) {
  // 現在のローター初期位置（選択値）取得
  let posL = document.getElementById('rotorL').value.charCodeAt(0) - 65;
  let posM = document.getElementById('rotorM').value.charCodeAt(0) - 65;
  let posR = document.getElementById('rotorR').value.charCodeAt(0) - 65;
  const plugMap = { ...plugConnections };  // プラグボード接続のコピー

  inputText = inputText.toUpperCase();
  let outputText = "";
  for (let char of inputText) {
    if (char < 'A' || char > 'Z') {
      // A-Z以外（空白や数字等）はそのまま出力し、ローターも進めない
      outputText += char;
      continue;
    }
    // キー押下に伴うローターの回転（ステップ）処理
    let stepLeft = false;
    let stepMid = false;
    // 各ローターのノッチ位置チェック（押下前の位置で判定）
    if (posM === rotorMid.notch) {
      stepLeft = true;
    }
    if (posR === rotorRight.notch || posM === rotorMid.notch) {
      stepMid = true;
    }
    // 右ローターは常に回転
    posR = (posR + 1) % 26;
    if (stepMid) {
      posM = (posM + 1) % 26;
    }
    if (stepLeft) {
      posL = (posL + 1) % 26;
    }
    // プラグボードでの入れ替え
    let c = char;
    if (plugMap[c]) {
      c = plugMap[c];
    }
    // 配線を数値化
    let cIndex = c.charCodeAt(0) - 65;
    // エニグマ内部の電気信号伝達（ローター -> リフレクター -> ローター）
    // 右ローター順方向
    cIndex = rotorRight.forwardMap[(cIndex + posR) % 26];
    cIndex = (cIndex - posR + 26) % 26;
    // 中央ローター順方向
    cIndex = rotorMid.forwardMap[(cIndex + posM) % 26];
    cIndex = (cIndex - posM + 26) % 26;
    // 左ローター順方向
    cIndex = rotorLeft.forwardMap[(cIndex + posL) % 26];
    cIndex = (cIndex - posL + 26) % 26;
    // リフレクター
    cIndex = reflectorMap[cIndex];
    // 左ローター逆方向
    cIndex = rotorLeft.reverseMap[(cIndex + posL) % 26];
    cIndex = (cIndex - posL + 26) % 26;
    // 中央ローター逆方向
    cIndex = rotorMid.reverseMap[(cIndex + posM) % 26];
    cIndex = (cIndex - posM + 26) % 26;
    // 右ローター逆方向
    cIndex = rotorRight.reverseMap[(cIndex + posR) % 26];
    cIndex = (cIndex - posR + 26) % 26;
    // 出力文字を取得
    let outChar = String.fromCharCode(cIndex + 65);
    // プラグボードで再度入れ替え
    if (plugMap[outChar]) {
      outChar = plugMap[outChar];
    }
    outputText += outChar;
  }
  return outputText;
}

// 「暗号化/復号 実行」ボタンの処理
const runBtn = document.getElementById('run-btn');
runBtn.addEventListener('click', () => {
  const input = document.getElementById('message-input').value;
  const outputArea = document.getElementById('output-text');
  // メッセージをエニグマで変換
  const result = enigmaEncryptText(input);
  outputArea.value = result;
});

// ボンベマシン解読シミュレーション
const bombeBtn = document.getElementById('bombe-btn');
const statusElem = document.getElementById('bombe-status');
const resultsList = document.getElementById('bombe-results');
const graphCanvas = document.getElementById('bombe-graph');
const graphCtx = graphCanvas.getContext('2d');
let isBombeRunning = false;

bombeBtn.addEventListener('click', () => {
  // 入力の検証
  const cribPlain = document.getElementById('crib-plaintext').value.trim().toUpperCase();
  const cribCipher = document.getElementById('crib-cipher').value.trim().toUpperCase();
  if (!cribPlain || !cribCipher) {
    alert("平文と暗号文を入力してください。");
    return;
  }
  if (cribPlain.length !== cribCipher.length) {
    alert("平文と暗号文は同じ長さで入力してください。");
    return;
  }
  if (!/^[A-Z]+$/.test(cribPlain) || !/^[A-Z]+$/.test(cribCipher)) {
    alert("平文および暗号文はA-Zの英字のみを含めてください。");
    return;
  }

  // 解読処理の開始
  startBombeSimulation(cribPlain, cribCipher);
});

// ボンベシミュレーションを開始する関数
function startBombeSimulation(cribPlain, cribCipher) {
  // UIの状態更新（ボタン無効化、ステータス表示初期化など）
  isBombeRunning = true;
  bombeBtn.disabled = true;
  runBtn.disabled = true;
  plugButtons.forEach(btn => btn.disabled = true);
  document.getElementById('rotorL').disabled = true;
  document.getElementById('rotorM').disabled = true;
  document.getElementById('rotorR').disabled = true;
  resultsList.innerHTML = "";  // 前回の結果をクリア
  statusElem.textContent = "解読中...";
  // グラフ初期化
  graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
  graphCtx.beginPath();
  graphCtx.strokeStyle = "blue";
  graphCtx.lineWidth = 2;

  const totalCombos = 26 * 26 * 26;  // 3つのローター位置総組み合わせ (17,576通り)
  let comboIndex = 0;
  const foundSettings = [];
  const failCounts = new Array(cribPlain.length).fill(0);

  // ボンベ処理ループ（一定チャンクごとに分割実行してUI更新）
  function processChunk() {
    const startIndex = comboIndex;
    const endIndex = Math.min(comboIndex + 100, totalCombos);  // 一度に100通り試行
    const plugMap = { ...plugConnections };  // 現在のプラグボード設定（固定）
    // チャンク内で各組み合わせを試す
    for (let idx = startIndex; idx < endIndex; idx++) {
      // インデックスから3ローターの位置を算出 (0-25それぞれ)
      const posLInit = Math.floor(idx / (26 * 26));
      const posMInit = Math.floor(idx / 26) % 26;
      const posRInit = idx % 26;
      // 各組み合わせについて、既知の平文->暗号文が一致するかチェック
      let posL = posLInit, posM = posMInit, posR = posRInit;
      let match = true;
      // 平文文字列を1文字ずつエニグマで暗号化し、暗号文と比較
      for (let t = 0; t < cribPlain.length; t++) {
        const plainChar = cribPlain[t];
        const cipherChar = cribCipher[t];
        // (エニグマのステップ・変換処理を文字ごとに実行)
        // ローターの回転 (ノッチ判定は現在位置で)
        let stepLeft = false;
        let stepMid = false;
        if (posM === rotorMid.notch) {
          stepLeft = true;
        }
        if (posR === rotorRight.notch || posM === rotorMid.notch) {
          stepMid = true;
        }
        posR = (posR + 1) % 26;
        if (stepMid) posM = (posM + 1) % 26;
        if (stepLeft) posL = (posL + 1) % 26;
        // 1文字を暗号化
        // プラグボード初期変換
        let cIndex = plainChar.charCodeAt(0) - 65;
        const letter = String.fromCharCode(cIndex + 65);
        if (plugMap[letter]) {
          cIndex = plugMap[letter].charCodeAt(0) - 65;
        }
        // ローター順方向
        cIndex = rotorRight.forwardMap[(cIndex + posR) % 26];
        cIndex = (cIndex - posR + 26) % 26;
        cIndex = rotorMid.forwardMap[(cIndex + posM) % 26];
        cIndex = (cIndex - posM + 26) % 26;
        cIndex = rotorLeft.forwardMap[(cIndex + posL) % 26];
        cIndex = (cIndex - posL + 26) % 26;
        // リフレクター
        cIndex = reflectorMap[cIndex];
        // ローター逆方向
        cIndex = rotorLeft.reverseMap[(cIndex + posL) % 26];
        cIndex = (cIndex - posL + 26) % 26;
        cIndex = rotorMid.reverseMap[(cIndex + posM) % 26];
        cIndex = (cIndex - posM + 26) % 26;
        cIndex = rotorRight.reverseMap[(cIndex + posR) % 26];
        cIndex = (cIndex - posR + 26) % 26;
        // プラグボード最終変換
        let outLetter = String.fromCharCode(cIndex + 65);
        if (plugMap[outLetter]) {
          outLetter = plugMap[outLetter];
        }
        // 結果を期待する暗号文と比較
        if (outLetter !== cipherChar) {
          // 不一致の場合、該当文字位置で失敗カウントし、この組み合わせの試行終了
          failCounts[t] += 1;
          match = false;
          break;
        }
      }
      if (match) {
        // 全文字一致 -> 候補として保存
        const settingStr = `${String.fromCharCode(posLInit+65)}${String.fromCharCode(posMInit+65)}${String.fromCharCode(posRInit+65)}`;
        foundSettings.push(settingStr);
      }
    }

    comboIndex = endIndex;
    // 現在の進捗をステータス表示（ローター位置を表示）
    const currentL = String.fromCharCode(Math.floor((endIndex-1) / (26*26)) + 65);
    const currentM = String.fromCharCode(Math.floor((endIndex-1) / 26) % 26 + 65);
    const currentR = String.fromCharCode(((endIndex-1) % 26) + 65);
    statusElem.textContent = `試行中: ${currentL}${currentM}${currentR} ... (${Math.floor((endIndex/totalCombos)*100)}%完了)`;

    if (comboIndex < totalCombos) {
      // 続けて次のチャンクを処理
      setTimeout(processChunk, 0);
    } else {
      // 全組み合わせ試行完了
      finishBombeSimulation(cribPlain.length, totalCombos, foundSettings, failCounts);
    }
  }

  // 処理開始
  setTimeout(processChunk, 0);
}

// ボンベ処理完了後の結果表示とUI復旧
function finishBombeSimulation(cribLength, totalCombos, foundSettings, failCounts) {
  // 候補リスト表示
  if (foundSettings.length > 0) {
    foundSettings.forEach(setting => {
      const li = document.createElement('li');
      li.className = "list-group-item";
      li.textContent = `ローター初期位置: ${setting}`;
      resultsList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.className = "list-group-item text-danger";
    li.textContent = "該当する設定は見つかりませんでした";
    resultsList.appendChild(li);
  }
  // ステータス表示更新
  statusElem.textContent = `解読完了: 試行=${totalCombos}通り, 候補=${foundSettings.length}件`;
  // グラフ描画 (文字数ごとの生き残った候補数の推移)
  graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
  graphCtx.beginPath();
  graphCtx.strokeStyle = "blue";
  graphCtx.lineWidth = 2;
  const margin = 10;
  const graphW = graphCanvas.width - margin * 2;
  const graphH = graphCanvas.height - margin * 2;
  // 各ステップ(文字数ごと)の残存候補数を計算
  const survivors = [];
  let remaining = totalCombos;
  for (let i = 0; i < cribLength; i++) {
    remaining -= failCounts[i];
    survivors.push(remaining);
  }
  // X軸は0～文字数(cribLength)、Y軸は0～totalCombos
  // ポイント(0文字処理前, initial)も追加
  survivors.unshift(totalCombos);
  // グラフプロット
  for (let i = 0; i < survivors.length; i++) {
    const x = margin + (graphW * (i) / cribLength);
    // yは大きい値が上になるよう反転
    const y = margin + graphH - (survivors[i] / totalCombos) * graphH;
    if (i === 0) {
      graphCtx.moveTo(x, y);
    } else {
      graphCtx.lineTo(x, y);
    }
    // 点に小さい丸を描く
    graphCtx.fillStyle = "red";
    graphCtx.beginPath();
    graphCtx.arc(x, y, 3, 0, 2 * Math.PI);
    graphCtx.fill();
    graphCtx.beginPath();
    graphCtx.moveTo(x, y);
  }
  graphCtx.stroke();
  // UI操作を元に戻す
  isBombeRunning = false;
  bombeBtn.disabled = false;
  runBtn.disabled = false;
  plugButtons.forEach(btn => btn.disabled = false);
  document.getElementById('rotorL').disabled = false;
  document.getElementById('rotorM').disabled = false;
  document.getElementById('rotorR').disabled = false;
}
