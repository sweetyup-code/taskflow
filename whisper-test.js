
import { WhisperWasmService, ModelManager } from "@timur00kh/whisper.wasm";

async function initWhisper() {
  try {
    const whisper = new WhisperWasmService({ logLevel: 1 });
    const manager = new ModelManager({ logLevel: 1 });

    const supported = await whisper.checkWasmSupport();

    if (!supported) {
      throw new Error("WebAssembly SIMD не поддерживается");
    }

    const model = await manager.loadModel("tiny", true, (progress) => {
      console.log(`Загрузка Whisper: ${Math.round(progress)}%`);
    });

    await whisper.initModel(model);

    window.TaskflowWhisper = whisper;
    window.dispatchEvent(new Event("taskflow-whisper-ready"));

    console.log("Whisper готов к работе");
  } catch (error) {
    console.error("Ошибка Whisper:", error);
    window.dispatchEvent(
      new CustomEvent("taskflow-whisper-error", {
        detail: error.message
      })
    );
  }
}

initWhisper();
