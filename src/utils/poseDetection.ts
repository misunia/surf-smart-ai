// MediaPipe Pose will be loaded via CDN script
declare global {
  interface Window {
    Pose: any;
  }
}

export interface PoseKeypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name: string;
}

export interface PoseResult {
  keypoints: PoseKeypoint[];
  confidence: number;
}

export interface FramePoseAnalysis {
  frameNumber: number;
  timestamp: number;
  imageData?: string; // base64 frame image
  poses: PoseResult[];
  metrics: {
    bodyRotation: number;
    centerOfGravity: { x: number; y: number };
    stanceWidth: number;
    kneeFlexion: number;
  };
  poseDetectionError?: string; // Error message when pose detection fails
}

class MediaPipePoseDetector {
  private pose: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load MediaPipe via CDN if not already loaded
      if (!window.Pose) {
        await this.loadMediaPipeScript();
      }

      // Wait a bit for the script to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!window.Pose) {
        throw new Error('MediaPipe Pose failed to load from CDN');
      }

      this.pose = new window.Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe Pose:', error);
      throw error;
    }
  }

  private async loadMediaPipeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MediaPipe script'));
      document.head.appendChild(script);
    });
  }

  async detectPose(canvas: HTMLCanvasElement): Promise<PoseResult | null> {
    if (!this.pose || !this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      if (!this.pose) {
        resolve(null);
        return;
      }

      this.pose.onResults((results) => {
        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
          const keypoints: PoseKeypoint[] = results.poseLandmarks.map((landmark, index) => ({
            x: landmark.x * 100, // Convert to percentage
            y: landmark.y * 100,
            z: landmark.z,
            confidence: landmark.visibility || 0.5,
            name: this.getLandmarkName(index)
          }));

          const confidence = keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length;

          resolve({
            keypoints,
            confidence
          });
        } else {
          resolve(null);
        }
      });

      this.pose.send({ image: canvas });
    });
  }

  private getLandmarkName(index: number): string {
    const landmarkNames = [
      'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
      'right_eye_inner', 'right_eye', 'right_eye_outer',
      'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
      'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
      'left_index', 'right_index', 'left_thumb', 'right_thumb',
      'left_hip', 'right_hip', 'left_knee', 'right_knee',
      'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
      'left_foot_index', 'right_foot_index'
    ];
    
    return landmarkNames[index] || `landmark_${index}`;
  }
}

// Calculate surf-specific metrics from pose keypoints
export const calculateSurfMetrics = (keypoints: PoseKeypoint[]): {
  bodyRotation: number;
  centerOfGravity: { x: number; y: number };
  stanceWidth: number;
  kneeFlexion: number;
} => {
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');
  const leftKnee = keypoints.find(kp => kp.name === 'left_knee');
  const rightKnee = keypoints.find(kp => kp.name === 'right_knee');
  const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');
  const rightAnkle = keypoints.find(kp => kp.name === 'right_ankle');

  // Body Rotation: angle between shoulder line and horizontal
  let bodyRotation = 0;
  if (leftShoulder && rightShoulder) {
    const shoulderAngle = Math.atan2(
      rightShoulder.y - leftShoulder.y,
      rightShoulder.x - leftShoulder.x
    );
    bodyRotation = Math.abs(shoulderAngle * (180 / Math.PI));
  }

  // Center of Gravity: average of hip positions
  let centerOfGravity = { x: 50, y: 50 };
  if (leftHip && rightHip) {
    centerOfGravity = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
  }

  // Stance Width: distance between ankles
  let stanceWidth = 0.5;
  if (leftAnkle && rightAnkle) {
    const distance = Math.sqrt(
      Math.pow(rightAnkle.x - leftAnkle.x, 2) + 
      Math.pow(rightAnkle.y - leftAnkle.y, 2)
    );
    stanceWidth = distance / 100; // Normalize to 0-1
  }

  // Knee Flexion: average angle of both knees
  let kneeFlexion = 45;
  if (leftHip && leftKnee && leftAnkle) {
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    kneeFlexion = 180 - leftKneeAngle; // Convert to flexion angle
  }

  return {
    bodyRotation,
    centerOfGravity,
    stanceWidth,
    kneeFlexion
  };
};

const calculateAngle = (
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): number => {
  const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) - 
                  Math.atan2(point1.y - point2.y, point1.x - point2.x);
  return Math.abs(radians * (180 / Math.PI));
};

export const poseDetector = new MediaPipePoseDetector();