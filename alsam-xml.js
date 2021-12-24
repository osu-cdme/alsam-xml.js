/* This file provides functionality to load an ALSAM XML file 
    and convert it into JavaScript data structures that are easier to work with. */
/* Based on ALSAM XML as of 2020-03-23 */

// Relevant RegExes
const isIntegerRegex = /^[0-9]*$/;
const isFloatRegex = /^[+-]?([0-9]*[.])?[0-9]+$/; // Technically tests for float OR integer, as integers are also floats

// Header Information
class Header {
  constructor({
    americaMakesSchemaVersion = null, // TYPE: string of YYYY-MM-DD format
    layerNum = null, // TYPE: int
    layerThickness = null, // TYPE: float
    absoluteHeight = null, // TYPE: float
    dosingFactor = null, // TYPE: float
    buildDescription = null, // TYPE: string (arbitrary)
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
    id = null, // TYPE: string
    velocity = null, // TYPE: float
    mode = null, // TYPE: string from set { "Delay", "Auto" }
    laserOnDelay = null, // TYPE: float (microseconds)
    laserOffDelay = null, // TYPE: float (microseconds)
    jumpDelay = null, // TYPE: float (microseconds)
    markDelay = null, // TYPE: float (microseconds)
    polygonDelay = null, // TYPE: float (microseconds)
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
  constructor({
    id = null,
    velocityProfileID = null,
    laserMode = null,
    travelers = null,
  }) {
    this.id = id; // TYPE: string
    this.velocityProfileID = velocityProfileID; // TYPE: string
    this.laserMode = laserMode; // TYPE: string from set { "Independent", "FollowMe" }
    this.travelers = travelers; // TYPE: List of `Traveler` Instances
  }
}
class Traveler {
  constructor({
    id = null,
    syncDelay = null,
    power = null,
    spotSize = null,
    wobble = null,
  }) {
    this.id = id; // TYPE: int
    this.syncDelay = syncDelay; // TYPE: float (microseconds)
    this.power = power; // TYPE: float (watts)
    this.spotSize = spotSize; // TYPE: float (microns)
    this.wobble = wobble; // TYPE: `Wobble` Instance
  }
}
class Wobble {
  constructor({
    on = null,
    freq = null,
    shape = null,
    transAmp = null,
    longAmp = null,
  }) {
    this.on = on; // TYPE: bool
    this.freq = freq; // TYPE: float (Hz)
    this.shape = shape; // TYPE: int from set { -1, 0, 1 }
    this.transAmp = transAmp; // TYPE: float (mm)
    this.longAmp = longAmp; // TYPE: float (mm)
  }
}

// Trajectories
class Trajectory {
  constructor({ trajectoryID = null, pathProcessingMode = null, path = null }) {
    this.trajectoryID = trajectoryID; // TYPE: string
    this.pathProcessingMode = pathProcessingMode; // TYPE: string from set { Sequential, Concurrent }
    this.path = path; // TYPE: `Path` Instance
  }
}
class Segment {
  constructor({
    x1 = null,
    y1 = null,
    x2 = null,
    y2 = null,
    segmentID = null,
    segStyle = null,
  }) {
    this.x1 = x1; // TYPE: int
    this.y1 = y1; // TYPE: int
    this.x2 = x2; // TYPE: int
    this.y2 = y2; // TYPE: int
    this.segmentID = segmentID; // TYPE: string
    this.segStyle = segStyle; // TYPE: string
  }
}
class Path {
  constructor({
    type = null,
    tag = null,
    numSegments = null,
    skyWritingMode = null,
    segments = null,
  }) {
    this.type = type; // TYPE: string from set { Hatch, Contour }
    this.tag = tag; // TYPE: string
    this.numSegments = numSegments; // TYPE: int
    this.skyWritingMode = skyWritingMode; // TYPE: int from set { 0, 1, 2, 3 }
    this.segments = segments; // TYPE: list of [`Segment`] instances
  }
}

// Master object returned by LoadXML
class Build {
  constructor({
    header = null,
    segmentStyles = null,
    velocityProfiles = null,
    trajectories = null,
  }) {
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
  if (node) {
    return node.textContent;
  }
  throw new Error(
    `INVALID SCHEMA: Mandatory tag ${tagName} not found in XML as child of tag ${xmlNode.tagName}`
  );
}

// TODO: Use Constructor defaults to convert a lot of this "figure out all values, then construct" to "construct, then fill in all values"

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
      markDelay: getMandatoryValue(style, "MarkDelay"),
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
    let travelers = [];
    let travelersXML = style.getElementsByTagName("Traveler");
    if (travelersXML.length > 0) {
      for (let travelerXML of travelersXML) {
        let wobble = travelerXML.getElementsByTagName("Wobble");
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

        let traveler = new Traveler({
          id: getMandatoryValue(travelerXML, "ID"),
          syncDelay: getOptionalValue(travelerXML, "SyncDelay"),
          power: getOptionalValue(travelerXML, "Power"),
          spotSize: getOptionalValue(travelerXML, "SpotSize"),
          wobble: wobble,
        });

        // Verify ID is an integer
        if (!isIntegerRegex.test(traveler.id)) {
          throw new Error(
            `INVALID SCHEMA: Provided Traveler ID ${traveler.id} must be an integer!`
          );
        }

        // Verify SyncDelay is an integer
        if (
          traveler.syncDelay !== null &&
          !isIntegerRegex.test(traveler.syncDelay)
        ) {
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

        travelers.push(traveler);
      }
    }

    let newSegmentStyle = new SegmentStyle({
      id: getMandatoryValue(style, "ID"),
      velocityProfileID: getMandatoryValue(style, "VelocityProfileID"),
      laserMode:
        travelers.length !== 0 ? getMandatoryValue(style, "LaserMode") : null, // Required if a Traveler exists (i.e. not a jump style)
      travelers: travelers,
    });

    // Verify LaserMode is either Independent or FollowMe
    if (
      newSegmentStyle.laserMode !== null &&
      newSegmentStyle.laserMode !== "Independent" &&
      newSegmentStyle.laserMode !== "FollowMe"
    ) {
      throw new Error(
        `INVALID SCHEMA: Provided LaserMode ${newSegmentStyle.laserMode} must be either 'Independent' or 'FollowMe'!`
      );
    }

    output.push(newSegmentStyle);
  }

  return output;
}

// Returns an array of 'Trajectory' objects
function getTrajectories(doc) {
  let trajectories = doc.getElementsByTagName("Trajectory");
  let output = [];
  for (let trajectoryXML of trajectories) {
    let paths = trajectoryXML.getElementsByTagName("Path");
    let path = null;
    if (paths.length !== 0) {
      let pathXML = trajectoryXML.getElementsByTagName("Path")[0];
      path = new Path({
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
      let start = pathXML.getElementsByTagName("Start")[0];

      // First segment will go from <Start> node to first actual Segment
      // Subsequent ones will go from current node to cached x/y from last node
      let lastX = start.getElementsByTagName("X")[0].textContent,
        lastY = start.getElementsByTagName("Y")[0].textContent;

      let segmentsXML = pathXML.getElementsByTagName("Segment");
      for (let segmentXML of segmentsXML) {
        let segment = new Segment({
          x1: lastX,
          y1: lastY,
          x2: getMandatoryValue(segmentXML, "X"),
          y2: getMandatoryValue(segmentXML, "Y"),
          segmentID: getOptionalValue(segmentXML, "SegmentID"),
          segStyle: getMandatoryValue(segmentXML, "SegStyle"),
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
      }
    }

    let trajectory = new Trajectory({
      trajectoryID: getMandatoryValue(trajectoryXML, "TrajectoryID"),
      pathProcessingMode: getMandatoryValue(
        trajectoryXML,
        "PathProcessingMode"
      ),
      path: path,
    });

    if (
      trajectory.pathProcessingMode !== "sequential" &&
      trajectory.pathProcessingMode !== "concurrent"
    ) {
      throw new Error(
        `INVALID SCHEMA: Provided PathProcessingMode ${trajectory.pathProcessingMode} must be either 'sequential' or 'concurrent'`
      );
    }

    output.push(trajectory);
  }
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

function GetHeaderString(build) {
  let output = "";
  output += "<Header>\n";
  output += `  <AmericaMakesSchemaVersion>${build.header.americaMakesSchemaVersion}</AmericaMakesSchemaVersion>\n`;
  // Not every field is mandatory; during load, we set optional parameters that weren't specified to null, so we just check that
  if (build.header.layerNum != null)
    output += `  <LayerNum>${build.header.layerNum}</LayerNum>\n`;
  output += `  <LayerThickness>${build.header.layerThickness}</LayerThickness>\n`;
  if (build.header.absoluteHeight != null)
    output += `  <AbsoluteHeight>${build.header.absoluteHeight}</AbsoluteHeight>\n`;
  if (build.header.dosingFactor != null)
    output += `  <DosingFactor>${build.header.dosingFactor}</DosingFactor>\n`;
  if (build.header.buildDescription != null)
    output += `  <BuildDescription>${build.header.buildDescription}</BuildDescription>\n`;
  output += "</Header>\n";
  return output;
}

function GetSegmentStylesString(build) {
  let output = "";
  output += "<SegmentStyleList>\n";
  for (let i = 0; i < build.segmentStyles.length; i++) {
    let segmentStyle = build.segmentStyles[i];
    output += "  <SegmentStyle>\n";
    output += `    <ID>${segmentStyle.id}</ID>\n`;
    output += `    <VelocityProfileID>${segmentStyle.velocityProfileID}</VelocityProfileID>\n`;
    if (segmentStyle.laserMode != null)
      output += `    <LaserMode>${segmentStyle.laserMode}</LaserMode>\n`;
    if (segmentStyle.travelers != null) {
      for (let j = 0; j < segmentStyle.travelers.length; j++) {
        let traveler = segmentStyle.travelers[j];
        output += "    <Traveler>\n";
        output += `      <ID>${traveler.id}</ID>\n`;
        if (traveler.syncDelay != null)
          output += `      <SyncDelay>${traveler.syncDelay}</SyncDelay>\n`;
        if (traveler.power != null)
          output += `      <Power>${traveler.power}</Power>\n`;
        if (traveler.spotSize != null)
          output += `      <SpotSize>${traveler.spotSize}</SpotSize>\n`;
        if (traveler.wobble != null) {
          output += "      <Wobble>\n";
          output += `        <On>${traveler.wobble.on}</On>\n`;
          output += `        <Freq>${traveler.wobble.freq}</Freq>\n`;
          output += `        <Shape>${traveler.wobble.shape}</Shape>\n`;
          output += `        <TransAmp>${traveler.wobble.transAmp}</TransAmp>\n`;
          output += `        <LongAmp>${traveler.wobble.longAmp}</LongAmp>\n`;
          output += "      </Wobble>\n";
        }
        output += "    </Traveler>\n";
      }
    }
    output += "  </SegmentStyle>\n";
  }
  output += "</SegmentStyleList>\n";
  return output;
}

function GetVelocityProfilesString(build) {
  let output = "";
  output += "<VelocityProfileList>\n";
  for (let i = 0; i < build.velocityProfiles.length; i++) {
    let velocityProfile = build.velocityProfiles[i];
    output += "  <VelocityProfile>\n";
    output += `    <ID>${velocityProfile.id}</ID>\n`;
    output += `    <Velocity>${velocityProfile.velocity}</Velocity>\n`;
    output += `    <Mode>${velocityProfile.mode}</Mode>\n`;
    output += `    <LaserOnDelay>${velocityProfile.laserOnDelay}</LaserOnDelay>\n`;
    output += `    <LaserOffDelay>${velocityProfile.laserOffDelay}</LaserOffDelay>\n`;
    output += `    <JumpDelay>${velocityProfile.jumpDelay}</JumpDelay>\n`;
    output += `    <MarkDelay>${velocityProfile.markDelay}</MarkDelay>\n`;
    output += `    <PolygonDelay>${velocityProfile.polygonDelay}</PolygonDelay>\n`;
    output += "  </VelocityProfile>\n";
  }
  output += "</VelocityProfileList>\n";
  return output;
}

function GetTrajectoriesString(build) {
  let output = "";
  return output;
}

// Returns an XML string corresponding to the passed-in Build object
// NOTE: Assumes the passed-in `Build` object is valid, meaning it does no validation like `LoadXML()` does
function ExportXML(build) {
  console.log("build: ", build);
  let output = "";

  // Append XML opening tag
  output +=
    '<?xml version="1.0"?><!--Scan file created using OSU CDME\'s cdme-scangen-ui.-->\n';
  output += "<Layer>\n";

  // Append header
  output += GetHeaderString(build);

  // Append segment styles
  output += GetSegmentStylesString(build);

  // Append velocity profiles
  output += GetVelocityProfilesString(build);

  // Append trajectories
  // output += GetTrajectoriesString(build);

  // Append XML closing tag
  output += "\n</Layer>";

  return output;
}

exports.LoadXML = LoadXML;
exports.ExportXML = ExportXML;
