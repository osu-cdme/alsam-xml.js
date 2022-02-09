export interface Layer {
    header: Header; 
    velocityProfiles: Set<VelocityProfile>; // Order doesn't matter, so Set used for better search performance
    segmentStyles: Set<SegmentStyle>;
    trajectories: Trajectory[]; // Need to preserve order of these
}
// Header Information
export interface Header {
    americaMakesSchemaVersion: string;
    layerNum?: number; 
    layerThickness: number; 
    absoluteHeight?: number; 
    dosingFactor?: number; 
    buildDescription?: string; 
}
export interface VelocityProfile {
    ID: string; 
    velocity: number; 
    mode: string; // Only "Delay" and "Auto" are permitted; checking at runtime is the only convenient way 
    laserOnDelay: number; 
    laserOffDelay: number;
    jumpDelay: number; 
    markDelay: number; 
    polygonDelay: number;
}
export interface SegmentStyle {
    ID: string;
    velocityProfileID: string; 
    laserMode?: string; // Only "Independent" | "FollowMe" allowed; checked at runtime
    travelers: Traveler[];
}
export interface Traveler {
    ID: number; 
    syncDelay?: number; 
    power?: number; 
    spotSize?: number; 
    wobble: Wobble | null; 
}
export interface Wobble {
    on: number; // 0 | 1; checked at runtime
    freq: number; 
    shape: number; // -1 | 0 | 1; checked at runtime
    transAmp: number;
    longAmp: number; 
}
export interface Trajectory {
    trajectoryID: string;
    pathProcessingMode: string; // Only "sequential" | "concurrent" allowed; checked at runtime
    paths: Path[];
}
export interface Path {
    type: string; // Only "hatch" and "contour" are permitted; checked at runtime
    tag: string; 
    numSegments: number; 
    skyWritingMode: number; // 0 | 1 | 2 | 3; checked at runtime
    segments: Segment[]; 
}
export interface Segment {
    segmentID?: string; 
    segStyle: string; 
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}