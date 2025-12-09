/**
 * cameraFeed.js
 */

let currentStream = null;

function getVideoTrack() {
    if (currentStream) {
        return currentStream.getVideoTracks()[0];
    }
    return null;
}

export async function startCamera(videoElement) {
    if (currentStream) return true;
    const constraints = {
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
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

export function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
        currentStream = null;
        console.log('🛑 カメラのストリームを停止しました。');
    }
}

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
 * 露出時間とコントラストをカメラに適用する関数
 * コントラストは非標準のため、特に適用後に設定値が反映されているかをチェックする。
 */
export async function applyCameraSettings(exposureTime, contrast) {
    const track = getVideoTrack();
    if (!track) {
        console.error('❌ カメラが起動していません。');
        return false;
    }

    const newConstraints = {};
    let isConstraintSupported = false;

    // 露出時間 (標準的な制約)
    if (exposureTime !== undefined) {
        newConstraints.exposureTime = exposureTime;
        isConstraintSupported = true;
    }
    
    // コントラスト (非標準、多くのカメラでサポートされていない可能性が高い)
    if (contrast !== undefined) {
        // コントラストは一部のブラウザ/OSでのみサポートされる非標準の制約です。
        newConstraints.contrast = contrast;
        isConstraintSupported = true;
    }

    if (!isConstraintSupported) {
        console.warn('⚠️ 適用する設定値がありません。');
        return true;
    }

    try {
        await track.applyConstraints(newConstraints);
        
        // 適用後の設定値を取得し、フィードバックを行う
        const currentSettings = track.getSettings();
        let feedback = '✅ 新しいカメラ設定が適用されました。';

        if (exposureTime !== undefined && currentSettings.exposureTime !== exposureTime) {
            feedback += `\n (⚠️ 露出時間 (${exposureTime}) は設定できませんでした。現在の値: ${currentSettings.exposureTime})`;
        }

        // コントラストは非標準なので、設定値の検証が難しい場合があります。
        // ここでは、設定を試みたことのみを通知します。
        if (contrast !== undefined && currentSettings.contrast === undefined) {
             feedback += `\n (⚠️ コントラストは、このカメラ/ブラウザではサポートされていない可能性があります。)`;
        }

        console.log(feedback);
        getTrackInfo();
        return true;

    } catch (error) {
        console.error('❌ 設定の適用に失敗しました。', error);
        alert('設定適用失敗: このデバイス/ブラウザでは、そのプロパティまたは値の範囲がサポートされていない可能性があります。コンソールを確認してください。');
        return false;
    }
}

window.addEventListener('beforeunload', stopCamera);