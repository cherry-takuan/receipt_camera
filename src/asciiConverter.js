/**
 * asciiConverter.js (二値化修正版)
 */

import { sendData } from './serialSender.js'; 

// 最終的なアスキーアートのサイズ
const OUTPUT_WIDTH = 48; // 元の画像の幅
const OUTPUT_HEIGHT = 32; // 元の画像の高さ

// 輝度（明るさ）に応じた文字の配列 (二値化: 2文字のみ使用)
// 輝度が高ければ「明るい」= スペース、輝度が低ければ「暗い」= アスタリスク
// DENSITY_MAP[0] = 暗い文字, DENSITY_MAP[1] = 明るい文字 
// ※ 輝度 (0-255) は 0が暗い、255が明るい
// 閾値未満 (暗い) -> *
// 閾値以上 (明るい) -> " "

// ここでは DENSITY_MAP は使用せず、閾値で直接判定します。
const DARK_CHAR = '*';
const LIGHT_CHAR = ' ';

let animationFrameId = null; 
let isConverting = false;
let isSending = false;
let currentThreshold = 128; // 初期閾値 (0-255)

/**
 * 動画フレームをキャンバスにキャプチャし、閾値に基づいて二値化AAに変換して表示するメインの処理
 */
function convertFrameToAscii(videoElement, outputElement, canvasElement) {
    if (!isConverting || videoElement.paused || videoElement.ended) {
        return; 
    }

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });

    // 1. 映像をリアルタイムに48*32ピクセルに縮小
    canvasElement.width = OUTPUT_WIDTH;
    canvasElement.height = OUTPUT_HEIGHT;
    ctx.drawImage(videoElement, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    const imageData = ctx.getImageData(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    const data = imageData.data;
    let asciiArt = '';

    // 転置ロジック (48行 x 32文字の形式で画面に出力):
    for (let X_orig = 0; X_orig < OUTPUT_WIDTH; X_orig++) { 
        let line = '';
        for (let Y_orig = 0; Y_orig < OUTPUT_HEIGHT; Y_orig++) { 
            
            const i = (Y_orig * OUTPUT_WIDTH + X_orig) * 4; 

            // 輝度計算 (0:暗 〜 255:明)
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = Math.floor(0.2126 * r + 0.7152 * g + 0.0722 * b); 

            // ** 二値化処理 **
            // 輝度 > 閾値 (明るい) -> LIGHT_CHAR (スペース)
            // 輝度 <= 閾値 (暗い) -> DARK_CHAR (アスタリスク)
            const char = (brightness > currentThreshold) ? LIGHT_CHAR : DARK_CHAR;

            line += char; 
        }
        asciiArt += line + '\n'; 
    }

    outputElement.textContent = asciiArt;
    animationFrameId = requestAnimationFrame(() => convertFrameToAscii(videoElement, outputElement, canvasElement));
}

/**
 * アスキーアート変換を開始する関数
 * @param {HTMLVideoElement} videoElement 
 * @param {HTMLElement} outputElement 
 * @param {HTMLCanvasElement} canvasElement 
 * @param {number} threshold 二値化に使用する閾値 (0-255)
 */
export function startAsciiConversion(videoElement, outputElement, canvasElement, threshold = 128) {
    if (isConverting) return;
    currentThreshold = threshold; // 新しい閾値を設定
    isConverting = true;
    console.log(`▶️ アスキーアート変換を開始します (閾値: ${currentThreshold})。`);
    convertFrameToAscii(videoElement, outputElement, canvasElement);
}

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
    // ... (関数内容は変更なし。DOMから取得するため、二値化ロジックに影響はない)
    if (isSending) {
        alert("既にシリアル送信中です。完了を待ってください。");
        return false;
    }
    
    // 1. DOMから現在表示されているAA文字列を直接取得
    const asciiArtData = asciiOutputElement.textContent;
    
    if (!asciiArtData || asciiArtData.trim().length < 50) { 
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
        }
    } catch (e) {
        console.error('致命的な送信エラー:', e);
    } finally {
        isSending = false;
    }

    return success;
}