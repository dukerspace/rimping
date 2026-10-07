# Stop Conditions

The task is DONE when:

- [ ] Requested behavior works
- [ ] Relevant verification passes
- [ ] No known regression
- [ ] Diff is minimal
- [ ] No unnecessary abstraction was introduced

Then:

STOP.

Do not continue with:

- unrelated refactoring
- speculative improvements
- generic cleanup
- additional abstractions
- unnecessary documentation
- unrelated tests
- "while I'm here" changes

## If verification fails

Do not declare success.

Determine whether the failure is:

1. caused by the change
2. caused by the environment
3. pre-existing

Fix the change when appropriate.

Otherwise report the verification limitation clearly.
