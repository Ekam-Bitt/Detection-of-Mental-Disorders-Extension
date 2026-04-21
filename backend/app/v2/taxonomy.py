from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SignalDefinition:
    key: str
    display_name: str
    color: str
    description: str


SIGNAL_DEFINITIONS: tuple[SignalDefinition, ...] = (
    SignalDefinition(
        key="attention_dysregulation",
        display_name="Attention",
        color="#2563eb",
        description="Signals related to attention regulation and impulsivity.",
    ),
    SignalDefinition(
        key="anxious_affect",
        display_name="Anxiety",
        color="#14b8a6",
        description="Worry, fear, hypervigilance, or anxious emotional tone.",
    ),
    SignalDefinition(
        key="autistic_trait_discussion",
        display_name="Autistic Traits",
        color="#f59e0b",
        description="Discussion of autistic traits, sensory load, or masking.",
    ),
    SignalDefinition(
        key="emotional_instability",
        display_name="Instability",
        color="#ef4444",
        description="Strong volatility, dysregulation, or relational instability.",
    ),
    SignalDefinition(
        key="depressive_affect",
        display_name="Depression",
        color="#7c3aed",
        description="Low mood, hopelessness, or depressive emotional expression.",
    ),
    SignalDefinition(
        key="trauma_stress",
        display_name="Trauma/Stress",
        color="#a855f7",
        description="Stress, traumatic recall, or post-traumatic language.",
    ),
    SignalDefinition(
        key="crisis_self_harm",
        display_name="Crisis",
        color="#dc2626",
        description="Self-harm or crisis language requiring extra caution.",
    ),
    SignalDefinition(
        key="no_clear_signal",
        display_name="No Clear Signal",
        color="#6b7280",
        description="No strong mental-health-related signal detected.",
    ),
)

SIGNAL_KEYS: tuple[str, ...] = tuple(item.key for item in SIGNAL_DEFINITIONS)
SIGNAL_DISPLAY_NAMES: dict[str, str] = {
    item.key: item.display_name for item in SIGNAL_DEFINITIONS
}
SIGNAL_COLORS: dict[str, str] = {item.key: item.color for item in SIGNAL_DEFINITIONS}

SEVERITY_LABELS: dict[int, str] = {
    0: "none",
    1: "mild",
    2: "moderate",
    3: "high",
}

SOURCE_PLATFORMS: frozenset[str] = frozenset({"reddit", "youtube", "x", "twitter"})

LEGACY_LABEL_TO_SIGNAL: dict[str, str] = {
    "LABEL_0": "attention_dysregulation",
    "LABEL_1": "anxious_affect",
    "LABEL_2": "autistic_trait_discussion",
    "LABEL_3": "emotional_instability",
    "LABEL_4": "depressive_affect",
    "LABEL_5": "trauma_stress",
    "LABEL_6": "no_clear_signal",
}
