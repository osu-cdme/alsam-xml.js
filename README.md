# alsam-xml.js

Provides an interface for saving and loading files corresponding to the ALSAM XML Schema, a description of which can be found [here](https://github.com/osu-cdme/alsam-xml.js/blob/main/ALSAM%20XML%20Schema.pdf).

Performs two distinct functionalities:

- Loads an ALSAM XML file into the below JSON data structure, doing various validation checks:
  - Ensure mandatory tags exist
  - Ensure tag content is within the constraints of the schema (data types, positive integer, etc.)
- Exports a saved JSON data structure into the ALSAM XML file format via `ExportXML(jsonObject, filePath)`
  - Not yet implemented, but will be soon

## Functions

- `LoadXML(xmlString)`: Returns a `Build` object corresponding to the provided XML string.
  - Throws an error if the provided XML string does not properly conform to the ALSAM XML schema.
- `ExportXML(jsonObj, filePath)`: Given a `Build` object and a file path, saves the `Build` object's content as an ALSAM XML file.

## JSON Object Format

`LoadXML()` returns a `Build` object, and `ExportXML()` expects a `Build` object as its first argument.

The `Build` object's structure should be sufficiently demonstrated by the following class definitions:

```js
// Master object returned by LoadXML and expected
class Build {
  constructor({ header, segmentStyles, velocityProfiles, trajectories }) {
    this.header = header; // TYPE: `Header` Instance
    this.segmentStyles = segmentStyles; // TYPE: list of `SegmentStyle` Instances
    this.velocityProfiles = velocityProfiles; // TYPE: list of `VelocityProfile` Instances
    this.trajectories = trajectories; // TYPE: list of `Trajectory` Instances
  }
}

// Header Info
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
  constructor({ id, velocityProfileID, laserMode, travelers }) {
    this.id = id; // TYPE: string
    this.velocityProfileID = velocityProfileID; // TYPE: string
    this.laserMode = laserMode; // TYPE: string from set { "Independent", "FollowMe" }
    this.travelers = travelers; // TYPE: List of `Traveler` Instances
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
```
