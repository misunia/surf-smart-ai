import { PoseKeypoint } from './poseDetection';

// -------- CONFIG --------
const FPS_SMOOTH = 0.9;   // EMA smooth factor for angles
const MIN_DET_FRAMES = 6; // minimum frames to accept a maneuver
const COOLDOWN_FRAMES = 12;

// Thresholds (from Python code)
const BT_KNEE_MIN = 70, BT_KNEE_MAX = 100;      // bottom turn compression
const BT_TORSO_MIN = 20, BT_TORSO_MAX = 40;     // lean into the face
const ROT_MIN = 15;                              // shoulders lead hips
const TT_TORSO_UPRIGHT_MAX = 20;                // top turn: upright torso
const KNEE_EXT_DELTA = 15;                      // extension change (deg) vs. bottom
const SMOOTH_STD_MAX = 8;                       // "flow" threshold (lower = smoother)

// -------- INTERFACES --------
export interface TurnScore {
  score: number;
  detail: Record<string, [number, number]>;
}

export interface TurnSnapshot {
  knee: number;
  torso: number;
  rot: number;
}

export interface TurnResult {
  bottom_turn: {
    score: number;
    detail: Record<string, [number, number]>;
    snapshot: TurnSnapshot;
    frames: number;
  };
  top_turn: {
    score: number;
    detail: Record<string, [number, number]>;
    frames: number;
  };
}

// -------- UTILS --------
function angleAt(a: PoseKeypoint, b: PoseKeypoint, c: PoseKeypoint): number {
  const pa = [a.x, a.y];
  const pb = [b.x, b.y];
  const pc = [c.x, c.y];
  
  const ba = [pa[0] - pb[0], pa[1] - pb[1]];
  const bc = [pc[0] - pb[0], pc[1] - pb[1]];
  
  const dotProduct = ba[0] * bc[0] + ba[1] * bc[1];
  const magBA = Math.sqrt(ba[0] * ba[0] + ba[1] * ba[1]);
  const magBC = Math.sqrt(bc[0] * bc[0] + bc[1] * bc[1]);
  
  const denom = magBA * magBC + 1e-9;
  const cosang = Math.max(-1, Math.min(1, dotProduct / denom));
  
  return Math.acos(cosang) * (180 / Math.PI);
}

function torsoAngle(keypoints: PoseKeypoint[]): number {
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return 0;
  }
  
  const shMid = [(leftShoulder.x + rightShoulder.x) / 2, (leftShoulder.y + rightShoulder.y) / 2];
  const hpMid = [(leftHip.x + rightHip.x) / 2, (leftHip.y + rightHip.y) / 2];
  
  const v = [shMid[0] - hpMid[0], shMid[1] - hpMid[1]];
  const vertical = [0, -1];
  
  const dotProduct = v[0] * vertical[0] + v[1] * vertical[1];
  const magV = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  const magVertical = Math.sqrt(vertical[0] * vertical[0] + vertical[1] * vertical[1]);
  
  const denom = magV * magVertical + 1e-9;
  const cosang = Math.max(-1, Math.min(1, dotProduct / denom));
  
  return Math.acos(cosang) * (180 / Math.PI);
}

function rotationDiff(keypoints: PoseKeypoint[]): number {
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return 0;
  }
  
  const shAng = Math.atan2(leftShoulder.y - rightShoulder.y, leftShoulder.x - rightShoulder.x) * (180 / Math.PI);
  const hpAng = Math.atan2(leftHip.y - rightHip.y, leftHip.x - rightHip.x) * (180 / Math.PI);
  
  let diff = Math.abs(shAng - hpAng);
  // normalize to [0,180]
  diff = diff <= 180 ? diff : 360 - diff;
  return diff;
}

function avgKneeFlex(keypoints: PoseKeypoint[]): number {
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const leftKnee = keypoints.find(kp => kp.name === 'left_knee');
  const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');
  const rightKnee = keypoints.find(kp => kp.name === 'right_knee');
  const rightAnkle = keypoints.find(kp => kp.name === 'right_ankle');
  
  if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
    return 90; // default
  }
  
  const lk = angleAt(leftHip, leftKnee, leftAnkle);
  const rk = angleAt(rightHip, rightKnee, rightAnkle);
  
  return (lk + rk) / 2.0;
}

class EMA {
  private a: number;
  private v: number | null = null;
  
  constructor(alpha: number = FPS_SMOOTH) {
    this.a = alpha;
  }
  
  update(x: number): number {
    if (this.v === null) {
      this.v = x;
    } else {
      this.v = this.a * this.v + (1 - this.a) * x;
    }
    return this.v;
  }
}

// -------- SCORING --------
function scoreBottomTurn(
  knee: number, 
  torso: number, 
  rot: number, 
  kneeSeries: number[], 
  torsoSeries: number[], 
  rotSeries: number[]
): [number, Record<string, [number, number]>] {
  let score = 0;
  const detail: Record<string, [number, number]> = {};

  // Compression (3 points max)
  let comp = 0;
  if (BT_KNEE_MIN <= knee && knee <= BT_KNEE_MAX) comp = 3;
  else if ((60 <= knee && knee < 70) || (100 < knee && knee <= 110)) comp = 2;
  else if ((50 <= knee && knee < 60) || (110 < knee && knee <= 120)) comp = 1;
  score += comp;
  detail["compression"] = [comp, knee];

  // Torso lean (3 points max)
  let lean = 0;
  if (BT_TORSO_MIN <= torso && torso <= BT_TORSO_MAX) lean = 3;
  else if ((15 <= torso && torso < 20) || (40 < torso && torso <= 50)) lean = 2;
  else if ((10 <= torso && torso < 15) || (50 < torso && torso <= 60)) lean = 1;
  score += lean;
  detail["torso_lean"] = [lean, torso];

  // Shoulders leading hips (2 points max)
  const rotPts = rot >= ROT_MIN ? 2 : (rot >= 10 ? 1 : 0);
  score += rotPts;
  detail["rotation"] = [rotPts, rot];

  // Smoothness (2 points max)
  const stdOr0 = (arr: number[]) => arr.length >= 5 ? Math.sqrt(arr.reduce((sum, val, _, array) => {
    const mean = array.reduce((a, b) => a + b) / array.length;
    return sum + Math.pow(val - mean, 2);
  }, 0) / arr.length) : 0;
  
  const smoothProxy = (stdOr0(kneeSeries) + stdOr0(torsoSeries) + stdOr0(rotSeries)) / 3.0;
  const smPts = smoothProxy <= SMOOTH_STD_MAX ? 2 : (smoothProxy <= SMOOTH_STD_MAX * 1.5 ? 1 : 0);
  score += smPts;
  detail["smoothness_std"] = [smPts, Math.round(smoothProxy * 100) / 100];

  return [score, detail];
}

function scoreTopTurn(
  kneeNow: number, 
  kneeBt: number | null, 
  torso: number, 
  rot: number, 
  kneeSeries: number[], 
  torsoSeries: number[], 
  rotSeries: number[]
): [number, Record<string, [number, number]>] {
  let score = 0;
  const detail: Record<string, [number, number]> = {};

  // Extension vs bottom turn knee (3 points max)
  const extDelta = kneeBt !== null ? kneeNow - kneeBt : 0;
  const extPts = extDelta >= KNEE_EXT_DELTA ? 3 : (extDelta >= 10 ? 2 : (extDelta >= 5 ? 1 : 0));
  score += extPts;
  detail["extension_delta_vs_bottom"] = [extPts, Math.round(extDelta * 10) / 10];

  // Upright torso at top (2 points max)
  const upPts = torso <= TT_TORSO_UPRIGHT_MAX ? 2 : (torso <= TT_TORSO_UPRIGHT_MAX + 10 ? 1 : 0);
  score += upPts;
  detail["upright_torso"] = [upPts, torso];

  // Rotation maintained/redirected (3 points max)
  const rotPts = rot >= ROT_MIN ? 3 : (rot >= 10 ? 2 : (rot >= 5 ? 1 : 0));
  score += rotPts;
  detail["rotation"] = [rotPts, rot];

  // Flow (2 points max)
  const stdOr0 = (arr: number[]) => arr.length >= 5 ? Math.sqrt(arr.reduce((sum, val, _, array) => {
    const mean = array.reduce((a, b) => a + b) / array.length;
    return sum + Math.pow(val - mean, 2);
  }, 0) / arr.length) : 0;
  
  const smoothProxy = (stdOr0(kneeSeries) + stdOr0(torsoSeries) + stdOr0(rotSeries)) / 3.0;
  const smPts = smoothProxy <= SMOOTH_STD_MAX ? 2 : (smoothProxy <= SMOOTH_STD_MAX * 1.5 ? 1 : 0);
  score += smPts;
  detail["smoothness_std"] = [smPts, Math.round(smoothProxy * 100) / 100];

  return [score, detail];
}

// -------- STATE MACHINE --------
enum TurnState {
  IDLE = 0,
  BOTTOM = 1,
  TRANSITION = 2,
  TOP = 3,
  COOLDOWN = 4
}

export class TurnFSM {
  private state = TurnState.IDLE;
  private framesInState = 0;
  private bottomSnapshot: TurnSnapshot | null = null;
  private bottomSeries = { knee: [] as number[], torso: [] as number[], rot: [] as number[] };
  private topSeries = { knee: [] as number[], torso: [] as number[], rot: [] as number[] };
  private btScore: [number, Record<string, [number, number]>] | null = null;
  private prevKnee: number | null = null;

  update(knee: number, torso: number, rot: number): TurnResult | null {
    this.framesInState++;

    // Add to rolling series for smoothness proxy (limit to 30 frames)
    if (this.state === TurnState.IDLE || this.state === TurnState.BOTTOM) {
      this.bottomSeries.knee.push(knee);
      this.bottomSeries.torso.push(torso);
      this.bottomSeries.rot.push(rot);
      if (this.bottomSeries.knee.length > 30) {
        this.bottomSeries.knee.shift();
        this.bottomSeries.torso.shift();
        this.bottomSeries.rot.shift();
      }
    }
    if (this.state === TurnState.TRANSITION || this.state === TurnState.TOP) {
      this.topSeries.knee.push(knee);
      this.topSeries.torso.push(torso);
      this.topSeries.rot.push(rot);
      if (this.topSeries.knee.length > 30) {
        this.topSeries.knee.shift();
        this.topSeries.torso.shift();
        this.topSeries.rot.shift();
      }
    }

    // State logic
    if (this.state === TurnState.IDLE) {
      // Look for compression + lean + rotation -> bottom turn onset
      const condComp = BT_KNEE_MIN <= knee && knee <= BT_KNEE_MAX;
      const condLean = BT_TORSO_MIN <= torso && torso <= BT_TORSO_MAX;
      const condRot = rot >= ROT_MIN;
      if (condComp && condLean && condRot) {
        this.state = TurnState.BOTTOM;
        this.framesInState = 1;
        this.bottomSnapshot = { knee, torso, rot };
      }
    } else if (this.state === TurnState.BOTTOM) {
      // Update snapshot to the "deepest" compression (closer to 85 deg)
      const prevBest = this.bottomSnapshot?.knee || knee;
      const target = 85.0;
      if (Math.abs(knee - target) < Math.abs(prevBest - target)) {
        this.bottomSnapshot = { knee, torso, rot };
      }

      // Detect exit of bottom: knee extending & torso getting more upright
      const extending = this.prevKnee !== null && (knee - this.prevKnee > 3.0);
      const moreUpright = torso < Math.max(BT_TORSO_MIN - 2, 10) || 
                         (this.bottomSnapshot && torso < this.bottomSnapshot.torso - 5);
      
      if (extending && moreUpright && this.framesInState >= MIN_DET_FRAMES && this.bottomSnapshot) {
        // Finalize bottom score
        const [btScore, btDetail] = scoreBottomTurn(
          this.bottomSnapshot.knee,
          this.bottomSnapshot.torso, 
          this.bottomSnapshot.rot,
          [...this.bottomSeries.knee],
          [...this.bottomSeries.torso],
          [...this.bottomSeries.rot]
        );
        this.btScore = [btScore, btDetail];
        
        // Move to transition
        this.state = TurnState.TRANSITION;
        this.framesInState = 0;
        
        // Reset top series
        this.topSeries = { knee: [], torso: [], rot: [] };
      }
    } else if (this.state === TurnState.TRANSITION) {
      // Wait a few frames to reach top; then enter TOP
      if (this.framesInState >= 3) {
        this.state = TurnState.TOP;
        this.framesInState = 0;
      }
    } else if (this.state === TurnState.TOP) {
      // Conditions for top turn: upright + rotation + extension vs bottom
      const kneeBt = this.bottomSnapshot?.knee || null;
      const condUp = torso <= TT_TORSO_UPRIGHT_MAX + 10;
      const condRot = rot >= 10;
      const condExt = kneeBt === null || (knee - kneeBt >= 5);
      
      if (condUp && condRot && condExt && this.framesInState >= MIN_DET_FRAMES) {
        // Finalize top score
        const [ttScore, ttDetail] = scoreTopTurn(
          knee, 
          kneeBt, 
          torso, 
          rot,
          [...this.topSeries.knee],
          [...this.topSeries.torso],
          [...this.topSeries.rot]
        );
        
        // Emit result (bottom + top pair)
        const result: TurnResult = {
          bottom_turn: {
            score: this.btScore?.[0] || 0,
            detail: this.btScore?.[1] || {},
            snapshot: this.bottomSnapshot || { knee: 0, torso: 0, rot: 0 },
            frames: this.bottomSeries.knee.length
          },
          top_turn: {
            score: ttScore,
            detail: ttDetail,
            frames: this.topSeries.knee.length
          }
        };
        
        // Enter cooldown
        this.state = TurnState.COOLDOWN;
        this.framesInState = 0;
        
        return result;
      }
    } else if (this.state === TurnState.COOLDOWN) {
      if (this.framesInState >= COOLDOWN_FRAMES) {
        // Reset for next cycle
        this.state = TurnState.IDLE;
        this.framesInState = 0;
        this.bottomSnapshot = null;
        this.btScore = null;
        this.bottomSeries = { knee: [], torso: [], rot: [] };
        this.topSeries = { knee: [], torso: [], rot: [] };
      }
    }

    this.prevKnee = knee;
    return null;
  }

  getState(): string {
    switch (this.state) {
      case TurnState.IDLE: return "Idle: looking for Bottom Turn";
      case TurnState.BOTTOM: return "Bottom Turn: compress/lean/rotate";
      case TurnState.TRANSITION: return "Transition: rising to lip";
      case TurnState.TOP: return "Top Turn: extend/redirect";
      case TurnState.COOLDOWN: return "Cooldown";
      default: return "Unknown";
    }
  }
}

export class TurnAnalyzer {
  private emaKnee = new EMA();
  private emaTorso = new EMA();
  private emaRot = new EMA();
  private fsm = new TurnFSM();
  private turnResults: TurnResult[] = [];

  processFrame(keypoints: PoseKeypoint[]): TurnResult | null {
    const knee = this.emaKnee.update(avgKneeFlex(keypoints));
    const torso = this.emaTorso.update(torsoAngle(keypoints));
    const rot = this.emaRot.update(rotationDiff(keypoints));

    const result = this.fsm.update(knee, torso, rot);
    
    if (result) {
      this.turnResults.push(result);
    }
    
    return result;
  }

  getCurrentState(): string {
    return this.fsm.getState();
  }

  getTurnResults(): TurnResult[] {
    return [...this.turnResults];
  }

  reset(): void {
    this.emaKnee = new EMA();
    this.emaTorso = new EMA();
    this.emaRot = new EMA();
    this.fsm = new TurnFSM();
    this.turnResults = [];
  }
}

export const turnAnalyzer = new TurnAnalyzer();