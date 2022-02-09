import assert from "assert"; 

// Utility function for retrieving an optional attribute; we get it if it exists, otherwise *return `null`* which we control for in the rest of the program
function getOptionalValue(xmlNode: XMLDocument | Element, tagName: string, type: "float" | "integer" | undefined): string | number | undefined {
  const node = xmlNode.getElementsByTagName(tagName)[0];
  if (node && node.textContent) {
    validate(tagName, node.textContent, type);
    cast(node.textContent, type);
    return node.textContent;
  }
  return undefined;
}

export function getOptionalValueString(xmlNode: XMLDocument | Element, tagName: string): string | undefined {
  return getOptionalValue(xmlNode, tagName, undefined) as string;
}
export function getOptionalValueFloat(xmlNode: XMLDocument | Element, tagName: string): number | undefined {
  return getOptionalValue(xmlNode, tagName, "float") as number;
}
export function getOptionalValueInteger(xmlNode: XMLDocument | Element, tagName: string): number | undefined {
  return getOptionalValue(xmlNode, tagName, "integer") as number;
}

// Untility function for retrieving a mandatory attribute; we get it if it exists, otherwise *throw a fatal error*
function getMandatoryValue(xmlNode: XMLDocument | Element, tagName: string, type: "float" | "integer" | undefined): string | number | undefined {
  const node = xmlNode.getElementsByTagName(tagName)[0];
  assert(node, `Tag ${tagName} is mandatory.`); 
  if (node) {
    assert(node.textContent, `INVALID SCHEMA: Empty <${tagName}> tag!`);
    validate(tagName, node.textContent, type);
    cast(node.textContent, type);
    return node.textContent;
  }
}

export function getMandatoryValueString(xmlNode: XMLDocument | Element, tagName: string): string {
 return getMandatoryValue(xmlNode, tagName, undefined) as string;
}
export function getMandatoryValueFloat(xmlNode: XMLDocument | Element, tagName: string): number {
  return getMandatoryValue(xmlNode, tagName, "float") as number;
}
export function getMandatoryValueInteger(xmlNode: XMLDocument | Element, tagName: string): number {
  return getMandatoryValue(xmlNode, tagName, "integer") as number;
}

// If type was passed into original function, uses Regex to do some typechecking
const isIntegerRegex = /^[0-9]*$/;
const isFloatRegex = /^[+-]?([0-9]*[.])?[0-9]+$/;
function validate(nodeName: string, value: string, type: string | undefined) {
  if (type === "float") assert(isFloatRegex.test(value), `${nodeName} must be a float`) 
  if (type === "integer") assert(isIntegerRegex.test(value), `${nodeName} must be an integer`)
}

// Converts passed-in value to provided type 
function cast(value: string, type: "float" | "integer" | undefined) {
  if (type === "float") return parseFloat(value);
  if (type === "integer") return parseInt(value);
}