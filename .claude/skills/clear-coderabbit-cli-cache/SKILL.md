---
name: clear-coderabbit-cli-cache
description: Clear the CodeRabbit CLI cache (reviews, logs, and app data)
disable-model-invocation: true
allowed-tools: Bash
---

Clear the CodeRabbit CLI cache by running this command:

```bash
for dir in "$HOME/.coderabbit/reviews" "$HOME/.coderabbit/logs"; do
  if [ -d "$dir" ]; then
    rm -rf "$dir"
    echo "Removed: $dir"
  else
    echo "Skipped (not found): $dir"
  fi
done
```

After running, confirm to the user which directories were removed and which were skipped.
