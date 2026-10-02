"""Centralized configuration for the self-healing subsystem"""

HEALING_CONFIG = {
    # Master switch
    "enabled": True,

    # Phase 0: Scroll
    "max_scroll_attempts": 3,

    # Phase 1: Popup / obstacle removal
    "predefined_close_xpaths": [
        "//*[@content-desc='close']",
        "//*[@content-desc='Close']",
        "//*[@content-desc='tutup']",
        "//*[@content-desc='Tutup']",
    ],

    # Phase 1b + Phase 2: AI healing
    "max_ai_retries": 3,
    "ai_confidence_threshold": 0.85,

    # Circuit breaker (prevents hammering a dead API)
    "circuit_breaker_threshold": 5,
    "circuit_breaker_recovery_sec": 60,

    # Baseline management
    "baseline_dir": "baselines",
    "baseline_refresh_interval": 5,  # refresh fingerprint every N successful hits

    # Logging
    "healing_log_path": "logs/healing_log.jsonl",

    # AI / LLM
    "ai_api_url": "https://ai.sumopod.com/v1",
    "ai_api_key": "sk-WxcE6DJ3bxYi2NPIt8JlLg",
    "ai_model": "deepseek-v4-flash",
}
