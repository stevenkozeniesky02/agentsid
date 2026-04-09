import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import TextInput from "ink-text-input";
import { getStoredConfig, storeConfig, validateKey } from "../auth-store.js";

interface Props {
  readonly onComplete: (apiKey: string, apiUrl: string) => void;
}

type State =
  | { readonly kind: "checking" }
  | { readonly kind: "input"; readonly error: string | null }
  | { readonly kind: "validating" };

export function AuthStep({ onComplete }: Props): React.ReactElement {
  const { exit } = useApp();
  const [inputValue, setInputValue] = useState("");
  const [uiState, setUiState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function checkStored(): Promise<void> {
      const stored = getStoredConfig();
      if (!stored) {
        if (!cancelled) setUiState({ kind: "input", error: null });
        return;
      }

      const valid = await validateKey(stored.api_key, stored.api_url);
      if (cancelled) return;

      if (valid) {
        onComplete(stored.api_key, stored.api_url);
      } else {
        setUiState({ kind: "input", error: "Stored API key is no longer valid. Please enter a new one." });
      }
    }

    void checkStored();
    return () => {
      cancelled = true;
    };
  }, [onComplete, exit]);

  async function handleSubmit(value: string): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) {
      setUiState({ kind: "input", error: "API key cannot be empty." });
      return;
    }

    setUiState({ kind: "validating" });

    const apiUrl = process.env["AGENTSID_API_URL"] ?? "https://api.agentsid.dev";
    const valid = await validateKey(trimmed, apiUrl);

    if (valid) {
      storeConfig(trimmed, apiUrl);
      onComplete(trimmed, apiUrl);
    } else {
      setUiState({ kind: "input", error: "Invalid API key. Check your AgentsID dashboard and try again." });
    }
  }

  if (uiState.kind === "checking") {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Checking stored credentials…</Text>
      </Box>
    );
  }

  if (uiState.kind === "validating") {
    return (
      <Box flexDirection="column">
        <Text color="cyan">Validating API key…</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="white">
        AgentsID API Key
      </Text>
      <Text color="gray">
        Find your key at{" "}
        <Text color="cyan">https://app.agentsid.dev/settings/api-keys</Text>
      </Text>
      {uiState.error && <Text color="red">{uiState.error}</Text>}
      <Box>
        <Text color="gray">Key: </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          placeholder="aid_proj_..."
          mask="*"
        />
      </Box>
      <Text color="gray" dimColor>
        Press Enter to continue
      </Text>
    </Box>
  );
}
