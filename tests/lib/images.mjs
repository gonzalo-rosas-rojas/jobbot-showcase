// Reads the size of an image from its own header, so the checks need no image library.

/** { width, height } of a JPEG, from its first start-of-frame segment. */
export function jpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error("not a JPEG");
  for (let at = 2; at + 9 < buffer.length; ) {
    if (buffer[at] !== 0xff) throw new Error("broken JPEG segment");
    const marker = buffer[at + 1];
    const length = buffer.readUInt16BE(at + 2);
    // SOF0..SOF15, except DHT (c4), JPG (c8) and DAC (cc)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: buffer.readUInt16BE(at + 7), height: buffer.readUInt16BE(at + 5) };
    }
    at += 2 + length;
  }
  throw new Error("no frame header in the JPEG");
}

/** { width, height } of a PNG, from its IHDR chunk. */
export function pngSize(buffer) {
  if (buffer.toString("latin1", 1, 4) !== "PNG" || buffer.toString("latin1", 12, 16) !== "IHDR") throw new Error("not a PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
