/* This file provides functionality to load an OASIS XML file 
    and convert it into JavaScript data structures that are easier to work with. */

export class Header {
  constructor({
    schemaVersion,
    layerNum,
    layerThickness,
    absoluteHeight,
    dosingFactor,
    buildDescription,
  }) {
    this.schemaVersion = schemaVersion;
    this.layerNum = layerNum;
    this.layerThickness = layerThickness;
    this.absoluteHeight = absoluteHeight;
    this.dosingFactor = dosingFactor;
    this.buildDescription = buildDescription;
  }
}

// Representation of a SegmentStyle, which helps us stay organized
export class SegmentStyle {
  constructor({
    id,
    velocityProfileID,
    laserMode,
    travelerID,
    syncDelay,
    power,
    spotSize,
  }) {
    this.id = id;
    this.velocityProfileID = velocityProfileID;
    this.laserMode = laserMode;
    this.travelerID = travelerID;
    this.syncDelay = syncDelay;
    this.power = power;
    this.spotSize = spotSize;
  }
}

// Representation of a VelocityProfile, which helps us stay organized
export class VelocityProfile {
  constructor({
    id,
    velocity,
    mode,
    laserOnDelay,
    laserOffDelay,
    jumpDelay,
    polygonDelay,
  }) {
    this.id = id;
    this.velocity = velocity;
    this.mode = mode;
    this.laserOnDelay = laserOnDelay;
    this.laserOffDelay = laserOffDelay;
    this.jumpDelay = jumpDelay;
    this.polygonDelay = polygonDelay;
  }
}

export class Trajectory {
  constructor({ id, pathProcessingMode, path }) {
    this.id = type;
    this.pathProcessingMode = pathProcessingMode;
    this.path = path;
  }
}

// Contains data for a point as well as the segment style id used to get *to* that point (which is 'null' if it's the first one)
export class Segment {
  constructor({ x1, y1, x2, y2, segmentStyleID }) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.segmentStyleID = segmentStyleID;
  }
}

export class Path {
  constructor({ type, tag, numSegments, skyWritingMode, segments }) {
    this.type = type;
    this.tag = tag;
    this.numSegments = numSegments;
    this.skyWritingMode = skyWritingMode;
    this.segments = segments;
  }
}

// Header = 'Header' Object
// segmentSyles = [SegmentStyle] (array of SegmentStyle objects)
// velocityProfiles = [VelocityProfile] (array of VelocityProfile objects)
// trajectories = [Trajectory] (array of Trajectory objects)
export class Build {
  constructor({ header, segmentStyles, velocityProfiles, trajectories }) {
    this.header = header;
    this.segmentStyles = segmentStyles;
    this.velocityProfiles = velocityProfiles;
    this.trajectories = trajectories;
  }
}

function getHeader(xmlDoc) {
  return new Header({
    schemaVersion: xmlDoc.getElementsByTagName("AmericaMakesSchemaVersion")[0]
      .textContent,
    layerNum: xmlDoc.getElementsByTagName("LayerNum")[0].textContent,
    layerThickness:
      xmlDoc.getElementsByTagName("LayerThickness")[0].textContent,
    absoluteHeight:
      xmlDoc.getElementsByTagName("AbsoluteHeight")[0].textContent,
    dosingFactor: xmlDoc.getElementsByTagName("DosingFactor")[0].textContent,
    buildDescription:
      xmlDoc.getElementsByTagName("BuildDescription")[0].textContent,
  });
}

function getVelocityProfiles(xmlDoc) {
  let output = [];
  let velocityProfiles = xmlDoc.getElementsByTagName("VelocityProfile");
  velocityProfiles.forEach((style) => {
    output.append(
      new VelocityProfile({
        id: style.getElementsByTagName("ID")[0].textContent,
        mode: style.getElementsByTagName("Mode")[0].textContent,
        laserOnDelay: style.getElementsByTagName("LaserOnDelay")[0].textContent,
        laserOffDelay:
          style.getElementsByTagName("LaserOffDelay")[0].textContent,
        jumpDelay: style.getElementsByTagName("JumpDelay")[0].textContent,
        polygonDelay: style.getElementsByTagName("PolygonDelay")[0].textContent,
      })
    );
  });
  return output;
}

// TODO: Not every segment style / velocity profile has a value for every one of these; set those fields instead to an N/A or something
function getSegmentStyles(xmlDoc) {
  let output = [];
  let segmentStyles = xmlDoc.getElementsByTagName("SegmentStyle");
  segmentStyles.forEach((style) => {
    output.append(
      new SegmentStyle({
        ID: style.getElementsByTagName("ID")[0].textContent,
        velocityProfileID:
          style.getElementsByTagName("VelocityProfileID")[0].textContent,
        laserMode: style.getElementsByTagName("LaserMode")[0].textContent,
        travelerID: style.getElementsByTagName("TravelerID")[0].textContent,
        syncDelay: style.getElementsByTagName("SyncDelay")[0].textContent,
        power: style.getElementsByTagName("Power")[0].textContent,
        spotSize: style.getElementsByTagName("SpotSize")[0].textContent,
      })
    );
  });
  return output;
}

// Returns an array of 'Trajectory' objects
function getTrajectories(doc) {
  let trajectories = doc.getElementsByTagName("Trajectory");
  let output = [];
  trajectories.forEach((trajectoryXML) => {
    let trajectory = new Trajectory();
    trajectory.id =
      trajectoryXML.getElementsByTagName("TrajectoryID")[0].textContent;
    trajectory.pathProcessingMode =
      trajectoryXML.getElementsByTagName("PathProcessingMode")[0].textContent;

    let pathXML = trajectoryXML.getElementsByTagName("Path")[0];
    let path = new Path({
      type: pathXML.getElementsByTagName("Type")[0].textContent,
      tag: pathXML.getElementsByTagName("Tag")[0].textContent,
      numSegments: pathXML.getElementsByTagName("NumSegments")[0].textContent,
      skyWritingMode:
        pathXML.getElementsByTagName("SkyWritingMode")[0].textContent,
      segments: [],
    });

    // We save this as a line segment rather than the points themselves to make drawing easier later
    // Just generally saves us a ton of work later and feels more readable and less confusing
    let start = pathXML.getElementsByTagName("Start")[0].textContent;

    // First segment will go from <Start> node to first actual Segmen
    // Subsequent ones will go from current node to cached x/y from last node
    let lastX = start.getElementsByTagName("X")[0].textContent,
      lastY = start.getElementsByTagName("Y")[0].textContent;

    let segmentsXML = pathXML.getElementsByTagName("Segment");
    segmentsXML.forEach((segmentXML) => {
      let segment = new Segment({
        x1: lastX,
        y1: lastY,
        x2: segmentXML.getElementsByTagName("X")[0].textContent,
        y2: segmentXML.getElementsByTagName("Y")[0].textContent,
        segmentStyleID:
          segmentXML.getElementsByTagName("SegmentStyleID")[0].textContent,
      });
      path.segments.append(segment);
      lastX = segment.x2;
      lastY = segment.y2;
    });
    trajectory.path = path;
    output.append(trajectory);
  });
  return output;
}

export default function LoadXML(xmlStr) {
  const xmlDoc = parser.parseFromString(xmlStr, "text/xml");

  // 2a. Form 'Header' object
  let header = getHeader(xmlDoc);

  // 2b. Form 'SegmentStyle' objects
  let segmentStyles = getSegmentStyles(xmlDoc);

  // 2c. Form 'VelocityProfile' objects
  let velocityProfiles = getVelocityProfiles(xmlDoc);

  // 2d. Form 'Trajectory' objects
  let trajectories = getTrajectories(xmlDoc);

  // 3. Form and return 'Build' object
  return new Build({
    header: header,
    segmentStyles: segmentStyles,
    velocityProfiles: velocityProfiles,
    trajectories: trajectories,
  });
}

export function ExportXML(jsonObj) {}

fetch("xml/scan_099.xml")
  .then((response) => response.text())
  .then((xmlStr) => console.log(LoadXML(xmlStr)));
