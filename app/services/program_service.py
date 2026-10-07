"""
Therapeutic Programs Catalog & Progress Tracking Service.
"""

from typing import Any, Dict, List, Optional

PROGRAMS_CATALOG = [
    {
        "id": "cbt-thought-restructuring",
        "title": "CBT Thought Restructuring Mastery",
        "category": "CBT",
        "description": "Learn evidence-based Cognitive Behavioral Techniques to identify, challenge, and reframe negative automatic thoughts.",
        "duration": "4 Sessions (20 mins total)",
        "badge_name": "Cognitive Reframer Badge 🧠",
        "steps": [
            {
                "id": "step-1",
                "title": "Identifying Cognitive Distortions",
                "type": "article",
                "content": "Learn the 10 common cognitive distortions: catastrophizing, black-and-white thinking, and emotional reasoning.",
            },
            {
                "id": "step-2",
                "title": "The Thought Record Exercise",
                "type": "interactive_journal",
                "prompt": "Write down a situation today that triggered negative emotions. What was the exact thought?",
            },
            {
                "id": "step-3",
                "title": "Challenging Your Assumptions",
                "type": "interactive_journal",
                "prompt": "What objective evidence supports this thought? What evidence contradicts it?",
            },
            {
                "id": "step-4",
                "title": "Formulating a Balanced Reframing",
                "type": "interactive_journal",
                "prompt": "Craft a rational, compassionate alternative perspective that acknowledges reality without distortion.",
            },
        ],
    },
    {
        "id": "mindful-breathing-7day",
        "title": "Guided Mindful Breathing & Calm Course",
        "category": "Mindfulness",
        "description": "Master diaphragmatic breathing, 4-7-8 relaxation, and box breathing to reduce physiological anxiety.",
        "duration": "3 Modules (15 mins total)",
        "badge_name": "Calm Breathmaster Badge 🫁",
        "steps": [
            {
                "id": "breath-1",
                "title": "Understanding Parasympathetic Activation",
                "type": "article",
                "content": "Discover how extending your exhalation triggers the vagus nerve to reduce heart rate and lower cortisol.",
            },
            {
                "id": "breath-2",
                "title": "4-7-8 Relaxation Practice",
                "type": "breathing_timer",
                "technique": "4-7-8",
                "duration_seconds": 240,
            },
            {
                "id": "breath-3",
                "title": "Box Breathing for High-Stress Focus",
                "type": "breathing_timer",
                "technique": "box",
                "duration_seconds": 300,
            },
        ],
    },
    {
        "id": "emotional-resilience",
        "title": "Building Emotional Resilience & Self-Compassion",
        "category": "Resilience",
        "description": "Develop emotional agility and self-compassion tools curated by clinical psychologists.",
        "duration": "3 Modules (15 mins total)",
        "badge_name": "Resilience Warrior Badge 🛡️",
        "steps": [
            {
                "id": "res-1",
                "title": "The Self-Compassion Break",
                "type": "article",
                "content": "Practicing mindfulness, common humanity, and self-kindness during difficult moments.",
            },
            {
                "id": "res-2",
                "title": "Values & Intentions Reflection",
                "type": "interactive_journal",
                "prompt": "Identify 3 core personal values that guide how you want to respond to adversity.",
            },
            {
                "id": "res-3",
                "title": "Daily Gratitude Anchor",
                "type": "interactive_journal",
                "prompt": "List 3 meaningful things or people you are grateful for today.",
            },
        ],
    },
]


class ProgramService:
    """Service handling therapeutic course catalog and user progress."""

    def get_catalog(self) -> List[Dict[str, Any]]:
        return PROGRAMS_CATALOG

    def get_program_by_id(self, program_id: str) -> Optional[Dict[str, Any]]:
        for p in PROGRAMS_CATALOG:
            if p["id"] == program_id:
                return p
        return None


program_service = ProgramService()
