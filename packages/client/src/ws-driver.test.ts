import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  ClientCapabilitiesSchema,
  type Envelope,
  type HelloAckMessage,
  type ServerEvent,
} from "@echohello/protocol";

import { WsDriver } from "./ws-driver.js";

class TestWebSocket extends EventTarget {
  static readonly OPEN = 1;
  static instances: TestWebSocket[] = [];
  readonly readyState = TestWebSocket.OPEN;
  readonly sent: string[] = [];

  constructor(_url: string | URL) {
    super();
    TestWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {}

  receive(data: unknown): void {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

const helloAck: HelloAckMessage = {
  type: "hello_ack",
  serverId: "srv_test",
  serverVersion: "0.0.0",
  protocolVersion: 1,
  capabilities: {
    providers: ["claude"],
    relay: false,
    worktrees: false,
    scheduling: false,
    voice: false,
    settingsSync: false,
  },
  daemon: { startedAt: 0, platform: "darwin", arch: "arm64" },
};

describe("WsDriver incoming envelopes", () => {
  const originalWebSocket = globalThis.WebSocket;
  let driver: WsDriver;
  let socket: TestWebSocket;
  let onEnvelope: Mock<(envelope: Envelope) => void>;
  let onError: Mock<(error: Error) => void>;
  let onOpen: Mock<(ack: HelloAckMessage) => void>;
  let onServerEvent: Mock<(event: ServerEvent) => void>;

  beforeEach(() => {
    globalThis.WebSocket = TestWebSocket as unknown as typeof WebSocket;
    TestWebSocket.instances = [];
    onEnvelope = vi.fn<(envelope: Envelope) => void>();
    onError = vi.fn<(error: Error) => void>();
    onOpen = vi.fn<(ack: HelloAckMessage) => void>();
    onServerEvent = vi.fn<(event: ServerEvent) => void>();
    driver = new WsDriver({
      endpoint: "ws://127.0.0.1:17687/ws",
      clientId: "test-client",
      clientType: "web",
      capabilities: ClientCapabilitiesSchema.parse({}),
      reconnect: false,
      onEnvelope,
    });
    driver.on("error", onError);
    driver.on("open", onOpen);
    driver.onServerEvent(onServerEvent);
    driver.connect();
    socket = TestWebSocket.instances[0]!;
  });

  afterEach(() => {
    driver.close();
    globalThis.WebSocket = originalWebSocket;
  });

  it.each([
    ["malformed JSON", "{"],
    ["null", "null"],
    ["a number", "42"],
    ["a string", '"hello"'],
    ["an array", "[]"],
    ["an empty object", "{}"],
    ["an incomplete hello_ack", '{"type":"hello_ack"}'],
    ["an unsupported protocol version", JSON.stringify({ ...helloAck, protocolVersion: 2 })],
    ["an invalid server event", '{"event":{"kind":"ping","ts":"invalid"}}'],
    ["an incomplete RPC response", '{"kind":"rpc_response","rpc":"test","requestId":"1"}'],
    ["a client command", '{"cmd":{"type":"ping","ts":1}}'],
  ])("rejects %s and accepts a subsequent valid frame", (_name, data) => {
    socket.receive(data);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      code: "bad_request",
      message: "Invalid server envelope",
    });
    expect(onEnvelope).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(onServerEvent).not.toHaveBeenCalled();
    expect(driver.helloAck).toBeNull();

    socket.receive(JSON.stringify(helloAck));

    expect(onEnvelope.mock.calls).toEqual([[helloAck]]);
    expect(onOpen.mock.calls).toEqual([[helloAck]]);
    expect(driver.helloAck).toEqual(helloAck);
  });

  it("routes valid server events", () => {
    const event = { kind: "ping", ts: 123 };

    socket.receive(JSON.stringify({ event }));

    expect(onServerEvent.mock.calls).toEqual([[event]]);
    expect(onEnvelope.mock.calls).toEqual([[{ event }]]);
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([
    { kind: "rpc_response", rpc: "test", requestId: "1", ok: true, result: { value: 42 } },
    {
      kind: "rpc_response",
      rpc: "test",
      requestId: "1",
      ok: false,
      error: { code: "not_found", message: "Missing" },
    },
  ])("preserves the RPC response discriminator and payload ($ok)", (response) => {
    socket.receive(JSON.stringify(response));

    expect(onEnvelope.mock.calls).toEqual([[response]]);
    expect(onError).not.toHaveBeenCalled();
  });
});
