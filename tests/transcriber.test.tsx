import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTranscriber } from "../src/hooks/useTranscriber";
import { defaultSettings } from "../src/lib/types";
class MockWorker {
  static last: MockWorker;
  onmessage: ((e: any) => void) | null = null;
  onerror: any;
  sent: any[] = [];
  terminate = vi.fn();
  constructor() {
    MockWorker.last = this;
  }
  postMessage(m: any) {
    this.sent.push(m);
  }
  emit(data: any) {
    this.onmessage?.({ data });
  }
}
const track = { stop: vi.fn(), addEventListener: vi.fn() };
class MockNode {
  static last: MockNode;
  connect = vi.fn();
  disconnect = vi.fn();
  port = {
    onmessage: null as ((e: any) => void) | null,
    postMessage: (m: any) => {
      if (m === "flush") this.port.onmessage?.({ data: "flushed" });
    },
  };
  constructor() {
    MockNode.last = this;
  }
  feed(samples: Float32Array) {
    this.port.onmessage?.({ data: samples });
  }
}
class MockContext {
  state = "running";
  destination = {};
  onstatechange: any;
  sampleRate = 16000;
  audioWorklet = { addModule: vi.fn(async () => {}) };
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  createGain() {
    return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
  }
}
beforeEach(() => {
  vi.stubGlobal("Worker", MockWorker);
  vi.stubGlobal("AudioContext", MockContext);
  vi.stubGlobal("AudioWorkletNode", MockNode);
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [track],
        getAudioTracks: () => [track],
      })),
    },
    configurable: true,
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("microphone lifecycle with mocked device and worker", () => {
  const callbacks = () => ({
    onSegment: vi.fn(),
    onMetric: vi.fn(),
    onEnd: vi.fn(),
  });
  it("publishes partial while listening and final after stop without duplication", async () => {
    const cb = callbacks();
    const { result } = renderHook(() => useTranscriber(cb));
    act(() => result.current.load(defaultSettings));
    act(() => MockWorker.last.emit({ type: "ready", device: "wasm" }));
    await act(async () => {
      expect(await result.current.start(defaultSettings)).toBe(true);
    });
    act(() => {
      for (let i = 0; i < 20; i++)
        MockNode.last.feed(new Float32Array(1600).fill(0.1));
    });
    const partial = MockWorker.last.sent.find((m) => m.type === "transcribe");
    expect(partial.job.final).toBe(false);
    act(() =>
      MockWorker.last.emit({
        type: "result",
        requestId: partial.requestId,
        text: "neural",
        inferenceMs: 100,
      }),
    );
    expect(result.current.phase).toBe("listening");
    expect(cb.onSegment.mock.calls[0][0].text).toBe("neural");
    await act(async () => result.current.stop());
    const final = MockWorker.last.sent.at(-1);
    expect(final.job.final).toBe(true);
    expect(final.job.id).toBe(partial.job.id);
    act(() =>
      MockWorker.last.emit({
        type: "result",
        requestId: final.requestId,
        text: "neural network",
        inferenceMs: 150,
      }),
    );
    expect(result.current.phase).toBe("ready");
    expect(cb.onEnd).toHaveBeenCalledWith(2);
    expect(track.stop).toHaveBeenCalled();
    expect(cb.onMetric).toHaveBeenCalledTimes(2);
  });
  it("handles denied microphone without leaving a listening state", async () => {
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(
      new DOMException("Denied", "NotAllowedError"),
    );
    const { result } = renderHook(() => useTranscriber(callbacks()));
    act(() => result.current.load(defaultSettings));
    act(() => MockWorker.last.emit({ type: "ready", device: "wasm" }));
    await act(async () => {
      expect(await result.current.start(defaultSettings)).toBe(false);
    });
    expect(result.current.phase).toBe("ready");
    expect(result.current.message).toContain("ditolak");
  });
  it("terminates failed workers and releases audio tracks", async () => {
    const { result } = renderHook(() => useTranscriber(callbacks()));
    act(() => result.current.load(defaultSettings));
    act(() => MockWorker.last.emit({ type: "ready", device: "wasm" }));
    await act(async () => {
      await result.current.start(defaultSettings);
    });
    act(() =>
      MockWorker.last.emit({ type: "error", message: "out of memory" }),
    );
    expect(result.current.phase).toBe("error");
    expect(MockWorker.last.terminate).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.modelReady(defaultSettings)).toBe(false);
  });
  it("cleans up an active stream on unmount", async () => {
    const { result, unmount } = renderHook(() => useTranscriber(callbacks()));
    act(() => result.current.load(defaultSettings));
    act(() => MockWorker.last.emit({ type: "ready", device: "wasm" }));
    await act(async () => {
      await result.current.start(defaultSettings);
    });
    unmount();
    expect(track.stop).toHaveBeenCalled();
    expect(MockWorker.last.terminate).toHaveBeenCalled();
  });
});

describe("stop and inference concurrency", () => {
  it("does not announce ready while AudioWorklet flush is still pending", async () => {
    const cb = { onSegment: vi.fn(), onMetric: vi.fn(), onEnd: vi.fn() };
    const { result } = renderHook(() => useTranscriber(cb));
    act(() => result.current.load(defaultSettings));
    act(() => MockWorker.last.emit({ type: "ready", device: "wasm" }));
    await act(async () => {
      await result.current.start(defaultSettings);
    });
    act(() => {
      for (let i = 0; i < 20; i++)
        MockNode.last.feed(new Float32Array(1600).fill(0.1));
    });
    const partial = MockWorker.last.sent.at(-1);
    MockNode.last.port.postMessage = vi.fn();
    let stopping: Promise<void>;
    act(() => {
      stopping = result.current.stop();
    });
    act(() =>
      MockWorker.last.emit({
        type: "result",
        requestId: partial.requestId,
        text: "partial",
        inferenceMs: 50,
      }),
    );
    expect(result.current.phase).toBe("finishing");
    expect(cb.onEnd).not.toHaveBeenCalled();
    await act(async () => {
      MockNode.last.port.onmessage?.({ data: "flushed" });
      await stopping!;
    });
    const final = MockWorker.last.sent.at(-1);
    expect(final.job.final).toBe(true);
    act(() =>
      MockWorker.last.emit({
        type: "result",
        requestId: final.requestId,
        text: "final",
        inferenceMs: 50,
      }),
    );
    expect(result.current.phase).toBe("ready");
    expect(cb.onEnd).toHaveBeenCalledTimes(1);
  });
});
