# alsam-xml.js

Provides an interface for saving and loading files corresponding to the ALSAM XML Schema, a description of which can be found [here](https://github.com/osu-cdme/alsam-xml.js/blob/main/ALSAM%20XML%20Schema.pdf).

Performs two distinct functionalities:

- Loads an ALSAM XML file into the below JSON data structure, doing various validation checks:
  - Ensure mandatory tags exist
  - Ensure tag content is within the constraints of the schema (data types, positive integer, etc.)
- Exports a saved JSON data structure into the ALSAM XML file format via `ExportXML(jsonObject)`, which returns a string representation of the object

Notably, does **not** handle any File I/O to keep the functionality of the package precise. For loading, do File I/O yourself then feed the string you get into the package, and with saving, get the string you get from the package and save it to a file yourself.

## Functions

- `LoadXML(xmlString)`: Returns a `Build` object corresponding to the provided XML string.
  - Validates that the provided string adheres to the ALSAM XML schema, and throws an error if it doesn't.
- `ExportXML(jsonObj)`: Given a `Build` object, returns, in a string, the ALSAM XML representation of the provided `Build` object.

## JSON Object Format

`LoadXML()` returns a `Build` object, and `ExportXML()` expects a `Build` object as its argument.

The `Build` object's structure should be sufficiently demonstrated by the following class definitions:

```js
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
  constructor({ trajectoryID = null, pathProcessingMode = null, paths = [] }) {
    this.trajectoryID = trajectoryID; // TYPE: string
    this.pathProcessingMode = pathProcessingMode; // TYPE: string from set { Sequential, Concurrent }
    this.paths = paths; // TYPE: Array of `Path` instances
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
```
