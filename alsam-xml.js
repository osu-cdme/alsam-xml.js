/* This file provides functionality to load an ALSAM XML file 
    and convert it into JavaScript data structures that are easier to work with. */
/* Based on ALSAM XML as of 2020-03-23 */

// Relevant RegExes
const isIntegerRegex = /^\d+$/;
const isFloatRegex = /^\d+\.?\d*$/; // Technically tests for float OR integer, as integers are also floats

// Header Information
class Header {
  constructor({
    americaMakesSchemaVersion, // TYPE: string of YYYY-MM-DD format
    layerNum, // TYPE: int
    layerThickness, // TYPE: float
    absoluteHeight, // TYPE: float
    dosingFactor, // TYPE: float
    buildDescription, // TYPE: string (arbitrary)
  }) {
    this.americaMakesSchemaVersion = americaMakesSchemaVersion;
    this.layerNum = layerNum;
    this.layerThickness = layerThickness;
    this.absoluteHeight = absoluteHeight;
    this.dosingFactor = dosingFactor;
    this.buildDescription = buildDescription;
  }
}

// Velocity Profiles
class VelocityProfile {
  constructor({
    id, // TYPE: string
    velocity, // TYPE: float
    mode, // TYPE: string from set { "Delay", "Auto" }
    laserOnDelay, // TYPE: float (microseconds)
    laserOffDelay, // TYPE: float (microseconds)
    jumpDelay, // TYPE: float (microseconds)
    markDelay, // TYPE: float (microseconds)
    polygonDelay, // TYPE: float (microseconds)
  }) {
    this.id = id;
    this.velocity = velocity;
    this.mode = mode;
    this.laserOnDelay = laserOnDelay;
    this.laserOffDelay = laserOffDelay;
    this.jumpDelay = jumpDelay;
    this.markDelay = markDelay;
    this.polygonDelay = polygonDelay;
  }
}

// Segment Styles
class SegmentStyle {
  constructor({ id, velocityProfileID, laserMode, traveler }) {
    this.id = id; // TYPE: string
    this.velocityProfileID = velocityProfileID; // TYPE: string
    this.laserMode = laserMode; // TYPE: string from set { "Independent", "FollowMe" }
    this.traveler = traveler; // TYPE: `Traveler` Instance
  }
}
class Traveler {
  constructor({ id, syncDelay, power, spotSize, wobble }) {
    this.id = id; // TYPE: int
    this.syncDelay = syncDelay; // TYPE: float (microseconds)
    this.power = power; // TYPE: float (watts)
    this.spotSize = spotSize; // TYPE: float (microns)
    this.wobble = wobble; // TYPE: `Wobble` Instance
  }
}
class Wobble {
  constructor({ on, freq, shape, transAmp, longAmp }) {
    this.on = on; // TYPE: bool
    this.freq = freq; // TYPE: float (Hz)
    this.shape = shape; // TYPE: int from set { -1, 0, 1 }
    this.transAmp = transAmp; // TYPE: float (mm)
    this.longAmp = longAmp; // TYPE: float (mm)
  }
}

// Trajectories
class Trajectory {
  constructor({ trajectoryID, pathProcessingMode, path }) {
    this.trajectoryID = trajectoryID; // TYPE: string
    this.pathProcessingMode = pathProcessingMode; // TYPE: string from set { Sequential, Concurrent }
    this.path = path; // TYPE: `Path` Instance
  }
}
class Segment {
  constructor({ x1, y1, x2, y2, segmentID, segStyle }) {
    this.x1 = x1; // TYPE: int
    this.y1 = y1; // TYPE: int
    this.x2 = x2; // TYPE: int
    this.y2 = y2; // TYPE: int
    this.segmentID = segmentID; // TYPE: string
    this.segStyle = segStyle; // TYPE: string
  }
}
class Path {
  constructor({ type, tag, numSegments, skyWritingMode, segments }) {
    this.type = type; // TYPE: string from set { Hatch, Contour }
    this.tag = tag; // TYPE: string
    this.numSegments = numSegments; // TYPE: int
    this.skyWritingMode = skyWritingMode; // TYPE: int from set { 0, 1, 2, 3 }
    this.segments = segments; // TYPE: list of [`Segment`] instances
  }
}

// Master object returned by LoadXML
class Build {
  constructor({ header, segmentStyles, velocityProfiles, trajectories }) {
    this.header = header; // TYPE: `Header` Instance
    this.segmentStyles = segmentStyles; // TYPE: list of `SegmentStyle` Instances
    this.velocityProfiles = velocityProfiles; // TYPE: list of `VelocityProfile` Instances
    this.trajectories = trajectories; // TYPE: list of `Trajectory` Instances
  }
}

// Utility function for retrieving an optional attribute; we get it if it exists, otherwise *return `null`* which we control for in the rest of the program
function getOptionalValue(xmlNode, tagName) {
  const node = xmlNode.getElementsByTagName(tagName)[0];
  if (node) {
    return node.textContent;
  }
  return null;
}

// Untility function for retrieving a mandatory attribute; we get it if it exists, otherwise *throw a fatal error*
function getMandatoryValue(xmlNode, tagName) {
  const node = xmlNode.getElementsByTagName(tagName)[0];
  console.log("node: ", node);
  if (node) {
    console.log("node.textContent: ", node.textContent);
    return node.textContent;
  }
  throw new Error(
    `INVALID SCHEMA: Mandatory tag ${tagName} not found in XML as child of tag ${xmlNode.tagName}`
  );
}

function getHeader(xmlDoc) {
  let output = new Header({
    americaMakesSchemaVersion: getMandatoryValue(
      xmlDoc,
      "AmericaMakesSchemaVersion"
    ),
    layerNum: getOptionalValue(xmlDoc, "LayerNum"),
    layerThickness: getMandatoryValue(xmlDoc, "LayerThickness"),
    absoluteHeight: getOptionalValue(xmlDoc, "AbsoluteHeight"),
    dosingFactor: getOptionalValue(xmlDoc, "DosingFactor"),
    buildDescription: getOptionalValue(xmlDoc, "BuildDescription"),
  });

  console.log("output: ", output);

  // Verify string adheres to YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(output.americaMakesSchemaVersion)) {
    throw new Error(
      `INVALID SCHEMA: Provided AmericaMakesSchemaVersion ${output.americaMakesSchemaVersion} must be in YYYY-MM-DD format`
    );
  }

  // Verify layerNum is more than zero
  if (output.layerNum !== null && parseInt(output.layerNum) < 0) {
    throw new Error(
      `INVALID SCHEMA: Provided LayerNum ${output.layerNum} must be an integer more than zero!`
    );
  }

  // Verify layerThickness is more than zero
  if (parseFloat(output.layerThickness) < 0) {
    throw new Error(
      `INVALID SCHEMA: Provided LayerThickness ${output.layerThickness} must be a real number more than zero!`
    );
  }

  // Verify AbsoluteHeight is more than zero
  if (output.absoluteHeight !== null && parseFloat(output.absoluteHeight) < 0) {
    throw new Error(
      `INVALID SCHEMA: Provided AbsoluteHeight ${output.absoluteHeight} must be a real number more than zero!`
    );
  }

  // Verify DosingFactor is more than zero
  if (output.dosingFactor !== null && parseFloat(output.dosingFactor) < 0) {
    throw new Error(
      `INVALID SCHEMA: Provided DosingFactor ${output.dosingFactor} must be a real number more than zero!`
    );
  }

  return output;
}

function getVelocityProfiles(xmlDoc) {
  let output = [];
  let velocityProfiles = xmlDoc.getElementsByTagName("VelocityProfile");
  for (let style of velocityProfiles) {
    let profile = new VelocityProfile({
      id: getMandatoryValue(style, "ID"),
      velocity: getMandatoryValue(style, "Velocity"),
      mode: getMandatoryValue(style, "Mode"),
      laserOnDelay: getMandatoryValue(style, "LaserOnDelay"),
      laserOffDelay: getMandatoryValue(style, "LaserOffDelay"),
      jumpDelay: getMandatoryValue(style, "JumpDelay"),
      polygonDelay: getMandatoryValue(style, "PolygonDelay"),
    });

    // Verify Velocity is more than zero
    if (parseFloat(profile.velocity) < 0) {
      throw new Error(
        `INVALID SCHEMA: Provided Velocity ${profile.velocity} must be a real number more than zero!`
      );
    }

    // Verify 'Mode' is either 'Delay' or 'Auto'
    if (profile.mode !== "Delay" && profile.mode !== "Auto") {
      throw new Error(
        `INVALID SCHEMA: Provided Mode ${profile.mode} must be either 'Delay' or 'Auto'!`
      );
    }

    output.push(profile);
  }
  return output;
}

function getSegmentStyles(xmlDoc) {
  let output = [];
  let segmentStyles = xmlDoc.getElementsByTagName("SegmentStyle");
  for (let style of segmentStyles) {
    let traveler = style.getElementsByTagName("Traveler");
    if (traveler.length > 0) {
      traveler = traveler[0];
      let wobble = traveler.getElementsByTagName("Wobble");
      if (wobble.length > 0) {
        wobble = wobble[0];
        wobble = new Wobble({
          on: getMandatoryValue(wobble, "On"),
          freq: getMandatoryValue(wobble, "Freq"),
          shape: getMandatoryValue(wobble, "Shape"),
          transAmp: getMandatoryValue(wobble, "TransAmp"),
          longAmp: getMandatoryValue(wobble, "LongAmp"),
        });

        // Verify 'On' is either 0 or 1
        if (parseInt(wobble.on) !== 0 && parseInt(wobble.on) !== 1) {
          throw new Error(
            `INVALID SCHEMA: Provided On ${wobble.on} must be either 0 or 1!`
          );
        }

        // Verify Freq is an integer
        if (!isIntegerRegex.test(wobble.freq)) {
          throw new Error(
            `INVALID SCHEMA: Provided Freq ${wobble.freq} must be an integer!`
          );
        }

        // Verify Shape is either -1, 0, or 1
        if (
          parseInt(wobble.shape) !== -1 &&
          parseInt(wobble.shape) !== 0 &&
          parseInt(wobble.shape) !== 1
        ) {
          throw new Error(
            `INVALID SCHEMA: Provided Shape ${wobble.shape} must be either -1, 0, or 1!`
          );
        }
      } else {
        wobble = null; // Don't throw an error, as this is just an optional field
      }

      traveler = new Traveler({
        id: getMandatoryValue(traveler, "ID"),
        syncDelay: getMandatoryValue(traveler, "SyncDelay"),
        power: getOptionalValue(traveler, "Power"),
        spotSize: getOptionalValue(traveler, "SpotSize"),
        wobble: wobble,
      });

      // Verify ID is an integer
      if (!isIntegerRegex.test(traveler.id)) {
        throw new Error(
          `INVALID SCHEMA: Provided Traveler ID ${traveler.id} must be an integer!`
        );
      }

      // Verify SyncDelay is an integer
      if (!isIntegerRegex.test(traveler.syncDelay)) {
        throw new Error(
          `INVALID SCHEMA: Provided SyncDelay ${traveler.syncDelay} must be an integer!`
        );
      }

      // Verify power is a number
      if (!isFloatRegex.test(traveler.power)) {
        throw new Error(
          `INVALID SCHEMA: Provided Power ${traveler.power} must be a real number!`
        );
      }

      // Verify spotSize is a number
      if (!isFloatRegex.test(traveler.spotSize)) {
        throw new Error(
          `INVALID SCHEMA: Provided SpotSize ${traveler.spotSize} must be a real number!`
        );
      }
    } else {
      throw new Error(
        'INVALID SCHEMA: Required "Traveler" tag not found in SegmentStyle of XML!'
      );
    }

    let newSegmentStyle = new SegmentStyle({
      id: getMandatoryValue(style, "ID"),
      velocityProfileID: getMandatoryValue(style, "VelocityProfileID"),
      laserMode: getMandatoryValue(style, "LaserMode"),
      traveler: traveler,
    });

    // Verify LaserMode is either Independent or FollowMe
    if (
      newSegmentStyle.laserMode !== "Independent" &&
      newSegmentStyle.laserMode !== "FollowMe"
    ) {
      throw new Error(
        `INVALID SCHEMA: Provided LaserMode ${newSegmentStyle.laserMode} must be either 'Independent' or 'FollowMe'!`
      );
    }

    output.push();
  }

  return output;
}

// Returns an array of 'Trajectory' objects
function getTrajectories(doc) {
  let trajectories = doc.getElementsByTagName("Trajectory");
  let output = [];
  trajectories.forEach((trajectoryXML) => {
    let trajectory = new Trajectory();

    // ID (required)
    trajectory.id = getRequiredValue(trajectoryXML, "TrajectoryID");

    // Path processing mode (required)
    trajectory.pathProcessingMode = getRequiredValue(
      trajectoryXML,
      "PathProcessingMode"
    );
    if (
      trajectory.pathProcessingMode !== "sequential" &&
      trajectory.pathProcessingMode !== "concurrent"
    ) {
      throw new Error(
        `INVALID SCHEMA: Provided PathProcessingMode ${trajectory.pathProcessingMode} must be either 'sequential' or 'concurrent'`
      );
    }

    let pathXML = trajectoryXML.getElementsByTagName("Path")[0];
    let path = new Path({
      type: getMandatoryValue(pathXML, "Type"),
      tag: getMandatoryValue(pathXML, "Tag"),
      numSegments: getMandatoryValue(pathXML, "NumSegments"),
      skyWritingMode: getMandatoryValue(pathXML, "SkyWritingMode"),
      segments: [],
    });

    if (path.type !== "hatch" && path.type !== "contour") {
      throw new Error(
        `INVALID SCHEMA: Provided Path type ${path.type} must be either 'hatch' or 'contour'`
      );
    }

    if (
      path.skyWritingMode !== "0" &&
      path.skyWritingMode !== "1" &&
      path.skyWritingMode !== "2" &&
      path.skyWritingMode !== "3"
    ) {
      throw new Error(
        `INVALID SCHEMA: Provided SkyWritingMode ${path.skyWritingMode} must be 0, 1, 2, or 3.`
      );
    }

    // We save this as a line segment rather than the points themselves to make drawing easier later
    // Just generally saves us a ton of work later and feels more readable and less confusing
    let start = pathXML.getElementsByTagName("Start")[0].textContent;

    // First segment will go from <Start> node to first actual Segment
    // Subsequent ones will go from current node to cached x/y from last node
    let lastX = start.getElementsByTagName("X")[0].textContent,
      lastY = start.getElementsByTagName("Y")[0].textContent;

    let segmentsXML = pathXML.getElementsByTagName("Segment");
    segmentsXML.forEach((segmentXML) => {
      let segment = new Segment({
        x1: lastX,
        y1: lastY,
        x2: getMandatoryValue(segmentXML, "X"),
        y2: getMandatoryValue(segmentXML, "Y"),
        segmentID: getOptionalValue(segmentXML, "SegmentID"),
        segStyle: getRequiredValue(segmentXML, "SegStyle"),
      });

      // Verify x2 and y2 are floats
      if (!isFloatRegex.test(segment.x2) || !isFloatRegex.test(segment.y2)) {
        throw new Error(
          `INVALID SCHEMA: Provided X and Y values ${segment.x2} and ${segment.y2} must be real numbers!`
        );
      }

      path.segments.push(segment);
      lastX = segment.x2;
      lastY = segment.y2;
    });
    trajectory.path = path;
    output.push(trajectory);
  });
  return output;
}

function LoadXML(xmlStr) {
  let parser = new DOMParser();
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

function ExportXML(jsonObj) {}

exports.LoadXML = LoadXML;
