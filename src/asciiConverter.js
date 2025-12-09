/**
 * asciiConverter.js
 * 映像をリアルタイムでキャプチャし、アスキーアートに変換して表示するモジュール
 */

// 最終的なアスキーアートのサイズ
const OUTPUT_WIDTH = 48;
const OUTPUT_HEIGHT = 32;

// 輝度（明るさ）に応じた文字の配列 (8段階)
// 配列の先頭が「明るい（高輝度）」、末尾が「暗い（低輝度）」に対応
const DENSITY_MAP = [
    "@",  // 0: 最も明るい
    "G",  // 1
    "*",  // 2
    "P",  // 3
    "O",  // 4
    "o",  // 5
    ".",  // 6
    " "   // 7: 最も暗い
];
const DENSITY_STEP = 256 / DENSITY_MAP.length; // 256 (輝度の最大値) / 8 = 32

let animationFrameId = null; // requestAnimationFrame のID
let isConverting = false;

/**
 * 動画フレームをキャンバスにキャプチャし、アスキーアートに変換するメインの処理
 * @param {HTMLVideoElement} videoElement 元の動画要素
 * @param {HTMLElement} outputElement アスキーアートを出力する要素（通常は <pre>）
 * @param {HTMLCanvasElement} canvasElement 描画に使用する一時的なキャンバス要素
 */
function convertFrameToAscii(videoElement, outputElement, canvasElement) {
    if (!isConverting || videoElement.paused || videoElement.ended) {
        return; // 変換が停止しているか、動画が終了している場合は終了
    }

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });

    // 1. 映像をリアルタイムに48*32ピクセルに縮小 (キャンバスへの描画時に実行)
    // キャンバスのサイズを最終出力サイズに合わせる
    canvasElement.width = OUTPUT_WIDTH;
    canvasElement.height = OUTPUT_HEIGHT;

    // 動画フレーム全体を、指定された48x32のサイズに縮小して描画
    ctx.drawImage(videoElement, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    // 縮小された画像からピクセルデータを取得
    // data配列は [R, G, B, A, R, G, B, A, ...] の順でピクセルデータを持つ
    const imageData = ctx.getImageData(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    const data = imageData.data;
    let asciiArt = '';

    // 3. 1で縮小した画像を2で設定した文字列で1ピクセルずつ文字に変換し、ブラウザに表示
    for (let y = 0; y < OUTPUT_HEIGHT; y++) {
        let line = '';
        for (let x = 0; x < OUTPUT_WIDTH; x++) {
            const i = (y * OUTPUT_WIDTH + x) * 4; // データ配列のインデックス (Rの場所)

            // RGBから輝度 (Luminance) を計算
            // 標準的な加重平均 (L = 0.2126R + 0.7152G + 0.0722B) を使用
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = Math.floor(0.2126 * r + 0.7152 * g + 0.0722 * b); // 0 (暗) 〜 255 (明)

            // 輝度に基づいて、DENSITY_MAPから対応する文字を選択
            // 2. 輝度に応じた文字の配列を設定
            // 輝度が高いほど配列の先頭（黒い文字）を選ぶ
            const charIndex = Math.floor(brightness / DENSITY_STEP);
            
            // 範囲をクリップし、文字を取得
            const char = DENSITY_MAP[Math.min(charIndex, DENSITY_MAP.length - 1)];

            line += char;
        }
        asciiArt += line + '\n'; // 行末に改行を追加
    }

    // アスキーアートを出力要素に書き込む
    outputElement.textContent = asciiArt;

    // 次のフレームで再帰的に実行
    animationFrameId = requestAnimationFrame(() => convertFrameToAscii(videoElement, outputElement, canvasElement));
}

/**
 * アスキーアート変換を開始する関数
 * @param {HTMLVideoElement} videoElement 
 * @param {HTMLElement} outputElement 
 * @param {HTMLCanvasElement} canvasElement 
 */
export function startAsciiConversion(videoElement, outputElement, canvasElement) {
    if (isConverting) return;
    isConverting = true;
    console.log('▶️ アスキーアート変換を開始します。');
    // 最初のフレーム変換を開始
    convertFrameToAscii(videoElement, outputElement, canvasElement);
}

/**
 * アスキーアート変換を停止する関数
 */
export function stopAsciiConversion() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    isConverting = false;
    console.log('⏸️ アスキーアート変換を停止しました。');
}