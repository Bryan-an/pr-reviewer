---
name: clear-coderabbit-cli-cache
description: Clear the CodeRabbit CLI cache (reviews, logs, and app data)
disable-model-invocation: true
allowed-tools: Bash
---

Clear the CodeRabbit CLI cache by running these commands:

```bash
rm -rf "$HOME/.coderabbit/reviews"
rm -rf "$HOME/.coderabbit/logs"
rm -rf "$HOME/Library/Application Support/CodeRabbit"
```

After running, confirm to the user which directories were removed.
