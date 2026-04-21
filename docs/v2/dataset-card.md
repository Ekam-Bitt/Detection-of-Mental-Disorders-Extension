# Dataset Card: Mental Health Signal Analysis v2

## Purpose
This dataset is designed for research on mental-health-related language signals in public social-media text. It is not intended to diagnose individuals.

## Sources
- Reddit posts and comments
- YouTube comments
- X posts and replies

## Schema
- `text`
- `source_platform`
- `thread_id`
- `post_id`
- `label_signals`
- `severity`
- `annotator_confidence`
- `split`

## Labels
- `attention_dysregulation`
- `anxious_affect`
- `autistic_trait_discussion`
- `emotional_instability`
- `depressive_affect`
- `trauma_stress`
- `crisis_self_harm`
- `no_clear_signal`

## Split Policy
- Group by thread or post identifier where possible
- Hold out one full platform as `cross_platform_test`
- Reject normalized duplicate text leakage across splits

## Risks
- Weak-label bootstrapping can encode platform and community bias
- Short comments often lack enough context for reliable interpretation
- Crisis language needs careful review because false negatives matter more than aggregate accuracy
