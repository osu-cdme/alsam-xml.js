/* This file provides functionality to load an ALSAM XML file 
    and convert it into JavaScript data structures that are easier to work with. */
/* Based on ALSAM XML as of 2020-03-23 */

// Cleaner, inline assertion checking
import assert from "assert"; 

// Types 
import { Layer, Header, VelocityProfile, SegmentStyle, Traveler, Wobble, Trajectory, Path, Segment } from './types';

// Validation
import { getOptionalValueString, getOptionalValueFloat, getOptionalValueInteger } from './validation';
import { getMandatoryValueString, getMandatoryValueFloat, getMandatoryValueInteger } from './validation';

function getHeader(xmlDoc: XMLDocument): Header {

  let output: Header = {
    americaMakesSchemaVersion: getMandatoryValueString(xmlDoc, "AmericaMakesSchemaVersion"), 
    layerNum: getOptionalValueInteger(xmlDoc, "LayerNum"),
    layerThickness: getMandatoryValueFloat(xmlDoc, "LayerThickness"),
    absoluteHeight: getOptionalValueFloat(xmlDoc, "AbsoluteHeight"),
    dosingFactor: getOptionalValueFloat(xmlDoc, "DosingFactor"),
    buildDescription: getOptionalValueString(xmlDoc, "BuildDescription"),
  };
  
  assert(/^\d{4}-\d{2}-\d{2}$/.test(output.americaMakesSchemaVersion), "INVALID SCHEMA: AmericaMakesSchemaVersion must be in the format YYYY-MM-DD!");
  assert(output.layerThickness > 0, "INVALID SCHEMA: LayerThickness must be a real number more than zero!");
  assert(!output.absoluteHeight || output.absoluteHeight > 0, "INVALID SCHEMA: AbsoluteHeight must be a real number more than zero!");
  assert(!output.dosingFactor || output.dosingFactor > 0, "INVALID SCHEMA: DosingFactor must be a real number more than zero!");

  return output; 
}

function getVelocityProfiles(xmlDoc: XMLDocument): Set<VelocityProfile> {

  let output = new Set<VelocityProfile>();
  let velocityProfiles = xmlDoc.getElementsByTagName("VelocityProfile");
  for (let style of velocityProfiles) {
    let profile: VelocityProfile = {
      ID: getMandatoryValueString(style, "ID"),
      velocity: getMandatoryValueFloat(style, "Velocity"),
      mode: getMandatoryValueString(style, "Mode"),
      laserOnDelay: getMandatoryValueFloat(style, "LaserOnDelay"),
      laserOffDelay: getMandatoryValueFloat(style, "LaserOffDelay"),
      jumpDelay: getMandatoryValueFloat(style, "JumpDelay"),
      markDelay: getMandatoryValueFloat(style, "MarkDelay"),
      polygonDelay: getMandatoryValueFloat(style, "PolygonDelay"),
    };

    assert(profile.velocity > 0, "INVALID SCHEMA: Velocity must be a real number more than zero!");
    assert(profile.mode === "Delay" || profile.mode === "Auto", "INVALID SCHEMA: Mode must be 'Delay' or 'Auto'!");

    output.add(profile);
  }
  return output;
}

function getSegmentStyles(xmlDoc: XMLDocument): Set<SegmentStyle> {
  let output = new Set<SegmentStyle>();
  let segmentStyles = xmlDoc.getElementsByTagName("SegmentStyle");
  for (let style of segmentStyles) {
    let travelers = [];
    let travelersXML = style.getElementsByTagName("Traveler");
    if (travelersXML.length > 0) {
      for (let travelerXML of travelersXML) {
        let wobbleCollection = travelerXML.getElementsByTagName("Wobble");
        let wobble: Wobble | null = null; 
        if (wobbleCollection.length > 0) {
          const wobbleElem = wobbleCollection[0];
          const wobble: Wobble = {
            on: getMandatoryValueInteger(wobbleElem, "On"),
            freq: getMandatoryValueInteger(wobbleElem, "Freq"),
            shape: getMandatoryValueInteger(wobbleElem, "Shape"),
            transAmp: getMandatoryValueFloat(wobbleElem, "TransAmp"),
            longAmp: getMandatoryValueFloat(wobbleElem, "LongAmp"),
          };

          assert(wobble.on === 0 || wobble.on === 1, "INVALID SCHEMA: Wobble On must be 0 or 1!");
          assert(wobble.shape >= -1 && wobble.shape <= -1, "INVALID SCHEMA: Wobble Shape must be -1, 0, or 1!");
        }

        let traveler: Traveler = {
          ID: getMandatoryValueInteger(travelerXML, "ID"),
          syncDelay: getOptionalValueInteger(travelerXML, "SyncDelay"),
          power: getOptionalValueFloat(travelerXML, "Power"),
          spotSize: getOptionalValueFloat(travelerXML, "SpotSize"),
          wobble: wobble,
        };

        assert(!traveler.power || traveler.power >= 0, "INVALID SCHEMA: Power must be a real number more than zero!");

        travelers.push(traveler);
      }
    }

    let newSegmentStyle: SegmentStyle = {
      ID: getMandatoryValueString(style, "ID"),
      velocityProfileID: getMandatoryValueString(style, "VelocityProfileID"),
      laserMode:
        travelers.length !== 0 ? getOptionalValueString(style, "LaserMode") : undefined, // Required if a Traveler exists (i.e. not a jump style)
      travelers: travelers,
    };

    assert(!newSegmentStyle.laserMode || newSegmentStyle.laserMode === "Independent" || newSegmentStyle.laserMode === "FollowMe", "INVALID SCHEMA: LaserMode must be 'Independent' or 'FollowMe'!");

    output.add(newSegmentStyle);
  }

  return output;
}

// Returns an array of 'Trajectory' objects
function getTrajectories(doc: XMLDocument) {
  let trajectories = doc.getElementsByTagName("Trajectory");
  let output = [];
  for (let trajectoryXML of trajectories) {
    let pathsXML = trajectoryXML.getElementsByTagName("Path");
    let paths = [];
    for (let pathXML of pathsXML) {
      let path: Path = {
        type: getMandatoryValueString(pathXML, "Type"),
        tag: getMandatoryValueString(pathXML, "Tag"),
        numSegments: getMandatoryValueInteger(pathXML, "NumSegments"),
        skyWritingMode: getMandatoryValueInteger(pathXML, "SkyWritingMode"),
        segments: [],
      };

      assert(path.type === "hatch" || path.type === "contour", "INVALID SCHEMA: Path Type must be 'hatch' or 'contour'!");
      assert(path.skyWritingMode >= 0 && path.skyWritingMode <= 3, "INVALID SCHEMA: SkyWritingMode must be 0, 1, 2, or 3!");

      // We save this as a line segment rather than the points themselves to make drawing easier later
      // Just generally saves us a ton of work later and feels more readable and less confusing
      let start = pathXML.getElementsByTagName("Start")[0];

      // First segment will go from <Start> node to first actual Segment
      // Subsequent ones will go from current node to cached x/y from last node
      let lastX = getMandatoryValueFloat(start, "X"); 
      let lastY = getMandatoryValueFloat(start, "Y");

      let segmentsXML = pathXML.getElementsByTagName("Segment");
      for (let segmentXML of segmentsXML) {
        let segment: Segment = {
          x1: lastX,
          y1: lastY,
          x2: getMandatoryValueFloat(segmentXML, "X"),
          y2: getMandatoryValueFloat(segmentXML, "Y"),
          segmentID: getOptionalValueString(segmentXML, "SegmentID"),
          segStyle: getMandatoryValueString(segmentXML, "SegStyle"),
        };

        path.segments.push(segment);
        lastX = segment.x2;
        lastY = segment.y2;
      }

      paths.push(path);
    }

    let trajectory: Trajectory = {
      trajectoryID: getMandatoryValueString(trajectoryXML, "TrajectoryID"),
      pathProcessingMode: getMandatoryValueString(
        trajectoryXML,
        "PathProcessingMode"
      ),
      paths: paths,
    };

    assert(trajectory.pathProcessingMode === "sequential" || trajectory.pathProcessingMode === "concurrent", "INVALID SCHEMA: PathProcessingMode must be 'sequential' or 'concurrent'!");

    output.push(trajectory);
  }
  return output;
}

export function LoadXML(xmlStr: string) {
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

  // 3. Form and return 'Layer' object
  const output: Layer = {
    header: header,
    segmentStyles: segmentStyles,
    velocityProfiles: velocityProfiles,
    trajectories: trajectories,
  };
  return output; 
}

function GetHeaderString(layer: Layer) {
  let output = "";
  output += "<Header>\n";
  output += `  <AmericaMakesSchemaVersion>${layer.header.americaMakesSchemaVersion}</AmericaMakesSchemaVersion>\n`;
  // Not every field is mandatory; during load, we set optional parameters that weren't specified to null, so we just check that
  if (layer.header.layerNum != null)
    output += `  <LayerNum>${layer.header.layerNum}</LayerNum>\n`;
  output += `  <LayerThickness>${layer.header.layerThickness}</LayerThickness>\n`;
  if (layer.header.absoluteHeight != null)
    output += `  <AbsoluteHeight>${layer.header.absoluteHeight}</AbsoluteHeight>\n`;
  if (layer.header.dosingFactor != null)
    output += `  <DosingFactor>${layer.header.dosingFactor}</DosingFactor>\n`;
  if (layer.header.buildDescription != null)
    output += `  <BuildDescription>${layer.header.buildDescription}</BuildDescription>\n`;
  output += "</Header>\n";
  return output;
}

function GetSegmentStylesString(layer: Layer) {
  let output = "";
  output += "<SegmentStyleList>\n";
  for (const segmentStyle of layer.segmentStyles) {
    output += "  <SegmentStyle>\n";
    output += `    <ID>${segmentStyle.ID}</ID>\n`;
    output += `    <VelocityProfileID>${segmentStyle.velocityProfileID}</VelocityProfileID>\n`;
    if (segmentStyle.laserMode != null)
      output += `    <LaserMode>${segmentStyle.laserMode}</LaserMode>\n`;
    if (segmentStyle.travelers != null) {
      for (let j = 0; j < segmentStyle.travelers.length; j++) {
        let traveler = segmentStyle.travelers[j];
        output += "    <Traveler>\n";
        output += `      <ID>${traveler.ID}</ID>\n`;
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

function GetVelocityProfilesString(layer: Layer) {
  let output = "";
  output += "<VelocityProfileList>\n";
  for (const velocityProfile of layer.velocityProfiles) {
    output += "  <VelocityProfile>\n";
    output += `    <ID>${velocityProfile.ID}</ID>\n`;
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

function GetTrajectoriesString(layer: Layer) {
  let output = "";
  output += "<TrajectoryList>\n";
  for (let i = 0; i < layer.trajectories.length; i++) {
    let trajectory = layer.trajectories[i];
    output += "  <Trajectory>\n";
    output += `    <TrajectoryID>${trajectory.trajectoryID}</TrajectoryID>\n`;
    output += `    <PathProcessingMode>${trajectory.pathProcessingMode}</PathProcessingMode>\n`;
    if (trajectory.paths.length !== 0) {
      trajectory.paths.forEach((path: Path) => {
        output += "    <Path>\n";
        output += `      <Type>${path.type}</Type>\n`;
        output += `      <Tag>${path.tag}</Tag>\n`;
        output += `      <NumSegments>${path.numSegments}</NumSegments>\n`;
        output += `      <SkyWritingMode>${path.skyWritingMode}</SkyWritingMode>\n`;
        if (path.numSegments > 0) {
          output += "      <Start>\n";
          output += `        <X>${path.segments[0].x1}</X>\n`;
          output += `        <Y>${path.segments[0].y1}</Y>\n`;
          output += "      </Start>\n";
          for (let j = 0; j < path.segments.length; j++) {
            let segment = path.segments[j];
            output += "      <Segment>\n";
            if (segment.segmentID != null) {
              output += `        <SegmentID>${segment.segmentID}</SegmentID>\n`;
            }
            output += `        <SegStyle>${segment.segStyle}</SegStyle>\n`;
            output += "        <End>\n";
            output += `          <X>${segment.x2}</X>\n`;
            output += `          <Y>${segment.y2}</Y>\n`;
            output += "        </End>\n";
            output += "      </Segment>\n";
          }
        }
        output += "    </Path>\n";
      });
    }
    output += "  </Trajectory>\n";
  }
  output += "</TrajectoryList>\n";
  return output;
}

// Returns an XML string corresponding to the passed-in Build object
// NOTE: Assumes the passed-in `Build` object is valid, meaning it does no validation like `LoadXML()` does
export function ExportXML(layer: Layer) {
  let output = "";

  // Append XML opening tag
  output +=
    '<?xml version="1.0"?><!--Scan file created using OSU CDME\'s cdme-scangen-ui.-->\n';
  output += "<Layer>\n";

  // Append header
  output += GetHeaderString(layer);

  // Append segment styles
  output += GetSegmentStylesString(layer);

  // Append velocity profiles
  output += GetVelocityProfilesString(layer);

  // Append trajectories
  output += GetTrajectoriesString(layer);

  // Append XML closing tag
  output += "\n</Layer>";

  return output;
}
