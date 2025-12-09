/**
 * cameraFeed.js
 * MediaDevices.getUserMedia() を使用してカメラの映像を取得し、露出/コントラストを制御するモジュール
 */

let currentStream = null;

/**
 * 動画トラックを取得するヘルパー関数
 */
function getVideoTrack() {
    if (currentStream) {
        return currentStream.getVideoTracks()[0];
    }
    return null;
}

/**
 * カメラの映像ストリームを取得し、指定された video 要素に表示する関数
 * @param {HTMLVideoElement} videoElement 映像を表示する HTML の <video> 要素
 */
export async function startCamera(videoElement) {
    if (currentStream) return true;

    const constraints = {
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'environment' // 背面カメラを優先
        },
        audio: false
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        videoElement.srcObject = stream;
        await videoElement.play();
        console.log('✅ カメラ起動完了。');
        return true;

    } catch (error) {
        if (error.name === 'NotAllowedError') {
            alert('❌ カメラへのアクセスが拒否されました。');
        } else if (error.name === 'NotFoundError') {
            alert('❌ 利用可能なカメラが見つかりませんでした。');
        } else {
            console.error('❌ カメラアクセス中に予期せぬエラーが発生しました:', error);
        }
        return false;
    }
}

/**
 * カメラのストリームを停止し、リソースを解放する関数
 */
export function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
        currentStream = null;
        console.log('🛑 カメラのストリームを停止しました。');
    }
}

/**
 * 1. カメラトラックの現在の設定（Constraints）と能力（Capabilities）を取得する関数
 */
export function getTrackInfo() {
    const track = getVideoTrack();
    if (track) {
        const settings = track.getSettings();
        const capabilities = track.getCapabilities();
        
        console.log('💡 現在の設定:', settings);
        console.log('💡 サポートされている能力:', capabilities);
        return { settings, capabilities };
    }
    return null;
}

/**
 * 2. カメラの露出時間とコントラストを設定する関数
 * @param {number | undefined} exposureTime 露出時間 (ms)
 * @param {number | undefined} contrast コントラスト値
 */
export async function applyCameraSettings(exposureTime, contrast) {
    const track = getVideoTrack();
    if (!track) {
        console.error('❌ カメラが起動していません。');
        return false;
    }

    const newConstraints = {};
    
    // exposureTime, contrast のプロパティ名はデバイス依存です
    if (exposureTime !== undefined) {
        newConstraints.exposureTime = exposureTime;
    }
    if (contrast !== undefined) {
        newConstraints.contrast = contrast;
    }

    if (Object.keys(newConstraints).length === 0) return true;

    try {
        await track.applyConstraints(newConstraints);
        console.log('✅ 新しいカメラ設定が適用されました。');
        // 適用後の設定を再確認
        getTrackInfo();
        return true;
    } catch (error) {
        console.error('❌ 設定の適用に失敗しました。このデバイス/ブラウザではサポートされていない可能性があります。', error);
        alert('設定適用失敗: このデバイス/ブラウザでは、そのプロパティまたは値の範囲がサポートされていない可能性があります。コンソールを確認してください。');
        return false;
    }
}

// ページのアンロード時にカメラを停止する
window.addEventListener('beforeunload', stopCamera);