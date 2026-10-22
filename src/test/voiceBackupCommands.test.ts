import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";

const recognition = vi.hoisted(() => ({ onResult: (_text: string, _interim: boolean) => {} }));
vi.mock("@/hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: (options: typeof recognition) => {
    recognition.onResult = options.onResult;
    return { isListening: false, isSupported: false, start: vi.fn(), stop: vi.fn() };
  },
}));

afterEach(() => { cleanup(); document.body.innerHTML = ""; });

function speak(text: string) {
  const onCommand = vi.fn();
  const onUnhandledSpeech = vi.fn();
  renderHook(() => useVoiceCommands({ onCommand, onUnhandledSpeech }));
  act(() => recognition.onResult(text, false));
  return { onCommand, onUnhandledSpeech };
}

describe("backup voice command boundaries", () => {
  it.each(["sichern", "speichern", "speicherung"])("does not download globally for %s", (word) => {
    const { onCommand, onUnhandledSpeech } = speak(word);
    expect(onCommand).not.toHaveBeenCalled();
    expect(onUnhandledSpeech).toHaveBeenCalledWith(word, false);
  });

  it.each(["manual-recipe", "profile", "entry"])("preserves saving inside %s", (scope) => {
    document.body.innerHTML = `<div ${scope === "entry" ? 'id="section-neuer-eintrag"' : `data-voice-scope="${scope}"`}><input /></div>`;
    document.querySelector("input")?.focus();
    const { onCommand, onUnhandledSpeech } = speak("sichern");
    expect(onCommand).not.toHaveBeenCalled();
    expect(onUnhandledSpeech).toHaveBeenCalledWith("sichern", false);
  });

  it.each(["sichern", "speichern"])("allows %s in the active Sicherung tile", (word) => {
    document.body.innerHTML = '<div id="section-backup" data-section-active="true"><button>Speichern</button></div>';
    const { onCommand } = speak(word);
    expect(onCommand).toHaveBeenCalledWith("backup-create");
  });

  it.each(["Backup", "Sicherungskopie"])("allows %s even inside a form", (word) => {
    document.body.innerHTML = '<div data-voice-scope="manual-recipe"><input /></div>';
    document.querySelector("input")?.focus();
    const { onCommand } = speak(word);
    expect(onCommand).toHaveBeenCalledWith("backup-create");
  });

  it("uses Sicherung for navigation rather than downloading", () => {
    expect(speak("Sicherung").onCommand).toHaveBeenCalledWith("section:backup");
  });
});