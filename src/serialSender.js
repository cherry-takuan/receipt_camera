/**
 * serialSender.js
 * Web Serial API を使用してシリアルポートにデータを送信するモジュール
 */

let port = null;
let writer = null;

/**
 * 1. シリアルポートの選択と接続を行う関数
 */
export async function connectSerialPort() {
    if (!('serial' in navigator)) {
        console.error('⚠️ Web Serial API はこのブラウザでサポートされていません。');
        alert('Web Serial API がサポートされている Chrome、Edge などのブラウザを使用してください。');
        return false;
    }

    try {
        // ユーザーにポートを選択させる (baudRate: 9600 を例とする)
        port = await navigator.serial.requestPort({});
        await port.open({ baudRate: 9600 });
        console.log(`✅ シリアルポートに接続しました。baudRate: 9600`);

        // データの書き込みに使用する Writer を取得
        const encoder = new TextEncoderStream();
        writer = encoder.writable.getWriter();
        encoder.readable.pipeTo(port.writable);

        return true;

    } catch (error) {
        console.error('❌ シリアルポートへの接続中にエラーが発生しました:', error);
        port = null;
        writer = null;
        return false;
    }
}

/**
 * 2. 接続中のシリアルポートに文字列データを送信する関数
 * @param {string} dataToSend 送信する文字列データ
 */
export async function sendData(dataToSend) {
    if (!writer) {
        console.error('❌ シリアルポートに接続されていません。');
        return false;
    }

    try {
        // データを送信
        await writer.write(dataToSend);
        console.log(`📤 データ送信完了: "${dataToSend.trim()}"`);
        return true;
    } catch (error) {
        console.error('❌ データの送信中にエラーが発生しました:', error);
        return false;
    }
}

/**
 * 3. シリアルポートから切断する関数
 */
export async function disconnectSerialPort() {
    if (writer) {
        await writer.close().catch(e => console.warn("Writer close failed:", e));
        writer = null;
    }
    if (port) {
        await port.close().catch(e => console.warn("Port close failed:", e));
        port = null;
        console.log('🔌 シリアルポートから切断しました。');
    }
}

// ページのアンロード時に切断処理を試みる
window.addEventListener('beforeunload', () => {
    if (port && port.close) {
        port.close().catch(e => console.error("アンロード時のポートクローズエラー:", e));
    }
});