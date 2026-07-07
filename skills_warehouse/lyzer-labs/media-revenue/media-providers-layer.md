# Media Providers Layer

> **Domain:** Media · AI/ML
> **Agent:** All
> **Version:** 1.0.0

## Architecture (16 providers)
```
ProviderManager
├── TextProvider (3): LiteLLM, FreeLLM, StdlibFallback
├── ImageProvider (8): Pollinations, Replicate, DeepAI, Prodia, OpenRouter, HF, Diffusers, Pillow
├── AudioProvider (4): Kokoro, EdgeTTS, OpenAI TTS, gTTS
├── MusicProvider (2): AudioCraft, Algorithmic
├── VideoProvider (2): MoviePy
└── MediaRouter: Auto Failover, Cost Tracking, Quality Ranking
```

## Working Providers (Zero Config)
- OpenRouter (LLM): 4 models
- Pollinations (Image): free, no key
- EdgeTTS (Audio): neural voices, pt-BR
- gTTS (Audio): Google TTS
- MoviePy (Video): slideshow
- Pillow (Image): local fallback
