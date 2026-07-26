# LACW — Cognitive Notification System Specification

## Rules
- Low-urgency events stream silently to the event bus log.
- Only critical interrupts ($\text{attentionScore} \ge 0.8$) present interruptive modal notifications.
