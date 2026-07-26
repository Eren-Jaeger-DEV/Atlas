/**
 * @atlas/core — BinaryFrameTransport (named ProtobufTransport for API stability)
 *
 * Custom binary frame serialization for Atlas IPC channels.
 * Uses a fixed 9-byte header (4-byte magic word + 1-byte version + 4-byte BE uint32 payload length)
 * followed by a UTF-8 encoded JSON payload \u2014 NOT protobuf wire format.
 * Magic words: 0x41544C53 ("ATLS") for agent events, 0x44494646 ("DIFF") for diff frames.
 * Provides Base64 frame wrapping for Electron IPC string transport.
 *
 * NOTE: Despite the name, this does not use the protobuf binary encoding or schema IDL.
 * The name is preserved for API stability; rename when implementing real protobuf if needed.
 */

import type { AgentEventFrame, DiffZoneFrame } from "./schemas.js";

export class ProtobufTransport {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  /**
   * Encode an AgentEventFrame into a binary byte buffer (Varint length-delimited payload).
   */
  static encodeAgentEvent(event: AgentEventFrame): Uint8Array {
    const jsonStr = JSON.stringify(event);
    const jsonBytes = this.encoder.encode(jsonStr);
    
    // Magic header (4 bytes: 0x41 0x54 0x4C 0x53 = "ATLS") + Version (1 byte) + Payload length (4 bytes uint32 BE) + payload
    const buffer = new Uint8Array(9 + jsonBytes.length);
    buffer[0] = 0x41; // 'A'
    buffer[1] = 0x54; // 'T'
    buffer[2] = 0x4C; // 'L'
    buffer[3] = 0x53; // 'S'
    buffer[4] = event.version || 1;

    const view = new DataView(buffer.buffer);
    view.setUint32(5, jsonBytes.length, false); // BigEndian length
    buffer.set(jsonBytes, 9);

    return buffer;
  }

  /**
   * Decode a binary byte buffer into an AgentEventFrame.
   */
  static decodeAgentEvent(buffer: Uint8Array): AgentEventFrame {
    if (buffer.length < 9) throw new Error("[ProtobufTransport] Buffer underflow: header too short");
    
    const isMagicValid = buffer[0] === 0x41 && buffer[1] === 0x54 && buffer[2] === 0x4C && buffer[3] === 0x53;
    if (!isMagicValid) throw new Error("[ProtobufTransport] Invalid magic header");

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const payloadLength = view.getUint32(5, false);

    const jsonBytes = buffer.subarray(9, 9 + payloadLength);
    const jsonStr = this.decoder.decode(jsonBytes);
    return JSON.parse(jsonStr) as AgentEventFrame;
  }

  /**
   * Encode a DiffZoneFrame into a binary byte buffer.
   */
  static encodeDiffZone(diff: DiffZoneFrame): Uint8Array {
    const jsonStr = JSON.stringify(diff);
    const jsonBytes = this.encoder.encode(jsonStr);

    const buffer = new Uint8Array(9 + jsonBytes.length);
    buffer[0] = 0x44; // 'D'
    buffer[1] = 0x49; // 'I'
    buffer[2] = 0x46; // 'F'
    buffer[3] = 0x46; // 'F'
    buffer[4] = diff.version || 1;

    const view = new DataView(buffer.buffer);
    view.setUint32(5, jsonBytes.length, false);
    buffer.set(jsonBytes, 9);

    return buffer;
  }

  /**
   * Decode a binary byte buffer into a DiffZoneFrame.
   */
  static decodeDiffZone(buffer: Uint8Array): DiffZoneFrame {
    if (buffer.length < 9) throw new Error("[ProtobufTransport] Buffer underflow: diff header too short");

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const payloadLength = view.getUint32(5, false);

    const jsonBytes = buffer.subarray(9, 9 + payloadLength);
    const jsonStr = this.decoder.decode(jsonBytes);
    return JSON.parse(jsonStr) as DiffZoneFrame;
  }

  /**
   * Converts a Uint8Array to a Base64 framed transport string for Electron IPC.
   */
  static toBase64Frame(buffer: Uint8Array): string {
    let binary = "";
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]!);
    }
    return `b64proto:${btoa(binary)}`;
  }

  /**
   * Parses a Base64 framed transport string into a Uint8Array.
   */
  static fromBase64Frame(frame: string): Uint8Array {
    if (!frame.startsWith("b64proto:")) {
      throw new Error("[ProtobufTransport] Invalid Base64 frame prefix");
    }
    const base64 = frame.slice(9);
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
