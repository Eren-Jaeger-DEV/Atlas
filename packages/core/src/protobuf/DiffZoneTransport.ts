/**
 * @atlas/core — DiffZoneTransport
 *
 * High-speed binary diff zone frame transport matching Antigravity (`sidecar.sendDiffZone`)
 * and Cursor (`aiserver.v1`) (Chapter 11 & 12).
 * Encodes inline red/green edit blocks into compact Protobuf transport frames over IPC.
 */

import { ProtobufTransport } from "./ProtobufTransport.js";
import { DiffZoneFrame } from "./schemas.js";

export class DiffZoneTransport {
  /**
   * Encode a DiffZoneFrame into a Base64 stream packet.
   */
  public static encodeDiffZonePacket(frame: DiffZoneFrame): string {
    const bytes = ProtobufTransport.encodeDiffZone(frame);
    return ProtobufTransport.toBase64Frame(bytes);
  }

  /**
   * Decode a Base64 stream packet back into a DiffZoneFrame.
   */
  public static decodeDiffZonePacket(packet: string): DiffZoneFrame | null {
    try {
      const bytes = ProtobufTransport.fromBase64Frame(packet);
      return ProtobufTransport.decodeDiffZone(bytes);
    } catch {
      return null;
    }
  }
}
