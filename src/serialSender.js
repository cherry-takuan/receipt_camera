/**
 * serialSender.js
 * Web Serial API を使用してシリアルポートにデータを送信するモジュール
 */

// 接続されたシリアルポートオブジェクトを保持する変数
let port = null;
let writer = null;

/**
 * 1. シリアルポートの選択と接続を行う関数
 * @returns {Promise<boolean>} 接続が成功したかどうか
 */
export async function connectSerialPort() {
    // Web Serial API がサポートされているか確認
    if (!('serial' in navigator)) {
        console.error('⚠️ Web Serial API はこのブラウザでサポートされていません。');
        alert('Web Serial API がサポートされている Chrome、Edge などのブラウザを使用してください。');
        return false;
    }

    try {
        // ユーザーにポートを選択させる
        // 適切な baudRate などの設定を加えてください (ここでは 9600 を例としています)
        port = await navigator.serial.requestPort({
            // フィルタを適用したい場合はここに記述
            // filters: [{ usbVendorId: 0x1A86, usbProductId: 0x7523 }]
        });

        // 接続を開始
        await port.open({ baudRate: 9600 });
        console.log(`✅ シリアルポートに接続しました。baudRate: 9600`);

        // データの書き込みに使用する Writer を取得
        // 文字列を送信するためには TextEncoder が必要
        const encoder = new TextEncoderStream();
        writer = encoder.writable.getWriter();
        
        // Writer をポートに接続
        encoder.readable.pipeTo(port.writable);

        return true;

    } catch (error) {
        // ユーザーがポート選択をキャンセルした場合などもここに含まれる
        console.error('❌ シリアルポートへの接続中にエラーが発生しました:', error);
        port = null;
        writer = null;
        return false;
    }
}

/**
 * 2. 接続中のシリアルポートに文字列データを送信する関数
 * @param {string} dataToSend 送信する文字列データ
 * @returns {Promise<boolean>} 送信が成功したかどうか
 */
export async function sendData(dataToSend) {
    if (!writer) {
        console.error('❌ シリアルポートに接続されていません。sendData() の前に connectSerialPort() を実行してください。');
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
        // Writer をクローズ
        await writer.close();
        writer = null;
    }
    if (port) {
        // ポートをクローズ
        await port.close();
        port = null;
        console.log('🔌 シリアルポートから切断しました。');
    }
}

// 切断処理を忘れずに行うためのイベントリスナー
window.addEventListener('beforeunload', async () => {
    if (port && port.close) {
        // ページのアンロード時にポートを閉じる (ベストエフォート)
        // writer.abort() も検討しますが、ここではシンプルな close のみ
        await port.close().catch(e => console.error("アンロード時のポートクローズエラー:", e));
    }
});