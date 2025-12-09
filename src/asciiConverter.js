/**
 * asciiConverter.js (画面からAAを取得してシリアル送信)
 */

// 最終的なアスキーアートのサイズ
const OUTPUT_WIDTH = 64; // 元の画像の幅
const OUTPUT_HEIGHT = 32; // 元の画像の高さ

// 輝度（明るさ）に応じた文字の配列 (8段階)
const DENSITY_MAP = [
    "@", "G", "*", "P", "O", "o", ".", " " // 0: 最も明るい -> 7: 最も暗い
];
const DENSITY_STEP = 256 / DENSITY_MAP.length; 

let animationFrameId = null; // requestAnimationFrame のID
let isConverting = false;
let isSending = false;

/**
 * 動画フレームをキャンバスにキャプチャし、アスキーアートに変換して表示するメインの処理
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

    // 転置ロジック (48行 x 32文字の形式で画面に出力):
    // 新しい行 (48行) = 元の X 座標 (0〜47)
    // 新しい列 (32文字) = 元の Y 座標 (0〜31)
    for (let X_orig = 0; X_orig < OUTPUT_WIDTH; X_orig++) { 
        let line = '';
        for (let Y_orig = 0; Y_orig < OUTPUT_HEIGHT; Y_orig++) { 
            
            // ピクセルデータは元の (X_orig, Y_orig) でアクセス
            const i = (Y_orig * OUTPUT_WIDTH + X_orig) * 4; 

            // 輝度計算
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = Math.floor(0.2126 * r + 0.7152 * g + 0.0722 * b);

            // 文字の選択
            const charIndex = Math.floor(brightness / DENSITY_STEP);
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

export function startAsciiConversion(videoElement, outputElement, canvasElement) {
    if (isConverting) return;
    currentThreshold = threshold; // 新しい閾値を設定
    isConverting = true;
    console.log('▶️ アスキーアート変換を開始します (画面表示)。');
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

/**
 * 印刷用のAAデータをDOMから取得し、初期化コマンドを付加してシリアルポートに送信する関数
 */
export async function printAsciiArt(asciiOutputElement) {
    if (isSending) {
        alert("既にシリアル送信中です。完了を待ってください。");
        return false;
    }
    
    // 1. DOMから現在表示されているAA文字列を直接取得
    const asciiArtData = asciiOutputElement.textContent;
    
    // 取得した文字列が空の場合は処理を中断
    if (!asciiArtData || asciiArtData.trim().length < 50) { // 簡易的なデータチェック
        console.error("AAデータが空か、または初期状態です。");
        return false;
    }

    isSending = true;
    let success = false;
    
    try {
        // 2. 初期化コマンドの付加と送信
        const initializationCommand = '\x1B@'; 
        const dataToSend = initializationCommand + asciiArtData;
        
        console.log(`📠 印刷データ (${asciiArtData.length} 文字) のシリアル送信を開始します...`);

        success = await sendData(dataToSend);
        
        if (success) {
            console.log('✅ 印刷データ送信完了！');
        } else {
            // エラーは sendData 内部で処理されているはず
        }
    } catch (e) {
        console.error('致命的な送信エラー:', e);
    } finally {
        isSending = false;
    }

    return success;
}