import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  ClientCapabilitiesSchema,
  type Envelope,
  type HelloAckMessage,
  type ServerEvent,
  SupaplaneError,
} from "@echohello/protocol";

import { WsDriver } from "./ws-driver.js";
import { SupaplaneClient } from "./supaplane-client.js";
import type { SupaplaneClientListener } from "./types.js";

class TestWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: TestWebSocket[] = [];
  readyState = TestWebSocket.CONNECTING;
  readonly sent: string[] = [];

  constructor(_url: string | URL) {
    super();
    TestWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  open(): void {
    this.readyState = TestWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  close(code = 1000, reason = ""): void {
    if (this.readyState === TestWebSocket.CLOSED) return;
    this.readyState = TestWebSocket.CLOSED;
    this.dispatchEvent(Object.assign(new Event("close"), { code, reason }));
  }

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

describe("Client connections with reconnect disabled", () => {
  const originalWebSocket = globalThis.WebSocket;
  let client: SupaplaneClient;
  let socket: TestWebSocket;
  let connection: Promise<HelloAckMessage>;

  beforeEach(() => {
    globalThis.WebSocket = TestWebSocket as unknown as typeof WebSocket;
    TestWebSocket.instances = [];
    client = new SupaplaneClient({
      endpoint: "ws://127.0.0.1:17687/ws",
      clientId: "test-client",
      clientType: "cli",
      reconnect: false,
    });
    connection = client.connect();
    socket = TestWebSocket.instances[0]!;
  });

  afterEach(() => {
    client.close();
    globalThis.WebSocket = originalWebSocket;
  });

  it.each([
    { stage: "before opening", open: false, error: false },
    { stage: "during the handshake", open: true, error: false },
    { stage: "after a transport error", open: true, error: true },
  ])("rejects connect() when the socket closes $stage", async ({ open, error }) => {
    const onClose = vi.fn<SupaplaneClientListener<"close">>();
    const onReconnect = vi.fn<SupaplaneClientListener<"reconnecting">>();
    client.on("close", onClose);
    client.on("reconnecting", onReconnect);
    if (open) socket.open();
    if (error) socket.dispatchEvent(new Event("error"));

    socket.close(1008, "Handshake rejected");

    const settled = Promise.race([connection, Promise.resolve("pending")]);
    await expect(settled).rejects.toBeInstanceOf(SupaplaneError);
    await expect(settled).rejects.toMatchObject({
      code: "unknown",
      message: "WebSocket closed before hello_ack",
    });
    expect(onClose.mock.calls).toEqual([[{ code: 1008, reason: "Handshake rejected" }]]);
    expect(onReconnect).not.toHaveBeenCalled();
    expect(client.isConnected).toBe(false);
    expect(client.helloAck).toBeNull();
    expect(TestWebSocket.instances).toHaveLength(1);
  });

  it("keeps a successful connection resolved after the socket closes", async () => {
    socket.open();
    socket.receive(JSON.stringify(helloAck));
    await expect(connection).resolves.toEqual(helloAck);

    socket.close();

    await expect(connection).resolves.toEqual(helloAck);
    expect(client.isConnected).toBe(false);
    expect(TestWebSocket.instances).toHaveLength(1);
  });

  it("preserves explicit cancellation before hello_ack", async () => {
    client.close();

    await expect(connection).rejects.toMatchObject({
      message: "Client closed before hello_ack",
    });
    expect(socket.readyState).toBe(TestWebSocket.CLOSED);
    expect(TestWebSocket.instances).toHaveLength(1);
  });
});

describe("WebSocket handshake retries", () => {
  const originalWebSocket = globalThis.WebSocket;
  let driver: WsDriver;
  let scheduled: { callback: () => void; delayMs: number }[];
  let onReconnect: Mock<SupaplaneClientListener<"reconnecting">>;
  let onExhausted: Mock<SupaplaneClientListener<"exhausted">>;

  function socket(): TestWebSocket {
    return TestWebSocket.instances.at(-1)!;
  }

  function retry(): void {
    const next = scheduled.shift();
    expect(next).toBeDefined();
    next!.callback();
  }

  beforeEach(() => {
    globalThis.WebSocket = TestWebSocket as unknown as typeof WebSocket;
    TestWebSocket.instances = [];
    scheduled = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation((callback, delay) => {
      scheduled.push({ callback: () => callback(), delayMs: delay ?? 0 });
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    onReconnect = vi.fn<SupaplaneClientListener<"reconnecting">>();
    onExhausted = vi.fn<SupaplaneClientListener<"exhausted">>();
    driver = new WsDriver({
      endpoint: "ws://127.0.0.1:17687/ws",
      clientId: "test-client",
      clientType: "web",
      capabilities: ClientCapabilitiesSchema.parse({}),
      maxReconnectAttempts: 2,
      reconnectBackoffMs: 100,
    });
    driver.on("reconnecting", onReconnect);
    driver.on("exhausted", onExhausted);
  });

  afterEach(() => {
    driver.close();
    vi.restoreAllMocks();
    globalThis.WebSocket = originalWebSocket;
  });

  it("backs off and exhausts the budget when open sockets never complete the handshake", () => {
    driver.connect();
    for (const delayMs of [100, 200]) {
      socket().open();
      expect(JSON.parse(socket().sent[0]!)).toMatchObject({ type: "hello" });
      socket().close(1008, "Handshake rejected");
      expect(scheduled.map((task) => task.delayMs)).toEqual([delayMs]);
      retry();
    }
    socket().open();
    socket().close(1008, "Handshake rejected");

    expect(onReconnect.mock.calls).toEqual([
      [{ attempt: 1, delayMs: 100 }],
      [{ attempt: 2, delayMs: 200 }],
    ]);
    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(scheduled).toEqual([]);
    expect(TestWebSocket.instances).toHaveLength(3);
  });

  it("resets the retry budget after a valid hello_ack", () => {
    driver.connect();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      socket().open();
      socket().close();
      retry();
    }
    socket().open();
    socket().receive(JSON.stringify(helloAck));
    expect(driver.helloAck).toEqual(helloAck);
    socket().close();

    expect(onReconnect).toHaveBeenLastCalledWith({ attempt: 1, delayMs: 100 });
    expect(scheduled.map((task) => task.delayMs)).toEqual([100]);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it("does not reset the retry budget for an invalid hello_ack", () => {
    driver.on("error", vi.fn<SupaplaneClientListener<"error">>());
    driver.connect();
    socket().open();
    socket().close();
    retry();
    socket().open();
    socket().receive(JSON.stringify({ ...helloAck, protocolVersion: 2 }));
    socket().close();

    expect(onReconnect).toHaveBeenLastCalledWith({ attempt: 2, delayMs: 200 });
    expect(driver.helloAck).toBeNull();
  });

  it("exhausts the retry budget when sockets fail before opening", () => {
    driver.connect();
    socket().close();
    retry();
    socket().close();
    retry();
    socket().close();

    expect(onReconnect.mock.calls).toEqual([
      [{ attempt: 1, delayMs: 100 }],
      [{ attempt: 2, delayMs: 200 }],
    ]);
    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(scheduled).toEqual([]);
  });

  it("does not open another socket if closed during backoff", () => {
    driver.connect();
    socket().open();
    socket().close();
    driver.close();
    retry();

    expect(TestWebSocket.instances).toHaveLength(1);
    expect(scheduled).toEqual([]);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it.each([0, 2])("rejects a pending client connection after %i retries", async (attempts) => {
    const client = new SupaplaneClient({
      endpoint: "ws://127.0.0.1:17687/ws",
      clientId: "test-client",
      clientType: "web",
      maxReconnectAttempts: attempts,
    });
    try {
      const connection = client.connect();
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        socket().open();
        socket().close(1008, "Handshake rejected");
        retry();
      }
      socket().open();
      socket().close(1008, "Handshake rejected");

      await expect(Promise.race([connection, Promise.resolve("pending")])).rejects.toMatchObject({
        message: "WebSocket reconnect attempts exhausted",
      });
    } finally {
      client.close();
    }
  });

  it("resolves a pending client connection when a retry completes the handshake", async () => {
    const client = new SupaplaneClient({
      endpoint: "ws://127.0.0.1:17687/ws",
      clientId: "test-client",
      clientType: "web",
      maxReconnectAttempts: 1,
    });
    try {
      const connection = client.connect();
      socket().open();
      socket().close();
      retry();
      socket().open();
      socket().receive(JSON.stringify(helloAck));

      await expect(connection).resolves.toEqual(helloAck);
    } finally {
      client.close();
    }
  });
});
