export interface ExtractedFrame {
  frameNumber: number;
  timestamp: number;
  imageData: string; // base64 encoded
  canvas: HTMLCanvasElement;
}

export const extractFramesFromVideo = async (
  videoFile: File,
  numFrames: number = 5
): Promise<ExtractedFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: ExtractedFrame[] = [];
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.onloadedmetadata = () => {
      const duration = video.duration;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      let frameIndex = 0;
      const interval = duration / numFrames;
      
      const extractFrame = () => {
        if (frameIndex >= numFrames) {
          resolve(frames);
          return;
        }
        
        const timestamp = frameIndex * interval;
        video.currentTime = timestamp;
        
        video.onseeked = () => {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          frames.push({
            frameNumber: frameIndex + 1,
            timestamp,
            imageData,
            canvas: canvas.cloneNode(true) as HTMLCanvasElement
          });
          
          frameIndex++;
          extractFrame();
        };
      };
      
      extractFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Error loading video'));
    };
    
    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
};

export const resizeFrame = (canvas: HTMLCanvasElement, maxWidth: number = 640): HTMLCanvasElement => {
  const resizedCanvas = document.createElement('canvas');
  const ctx = resizedCanvas.getContext('2d');
  
  if (!ctx) {
    return canvas;
  }
  
  const scale = Math.min(maxWidth / canvas.width, maxWidth / canvas.height);
  resizedCanvas.width = canvas.width * scale;
  resizedCanvas.height = canvas.height * scale;
  
  ctx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
  
  return resizedCanvas;
};