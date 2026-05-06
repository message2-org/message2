# Threat model

## Assets

- Identity and device key material.
- Encrypted message payloads and media keys.
- Metadata: chat membership, timestamps, delivery state.
- Privileged-access audit records.

## Threats

- Account takeover (credential stuffing, session theft).
- MITM during transport.
- Server compromise and data exfiltration.
- Malicious insider privileged access misuse.
- Media malware upload and unsafe preview processing.

## Controls

- TLS 1.3 + HSTS + strict token rotation.
- End-to-end message encryption (Double Ratchet family).
- At-rest encryption for databases and object storage.
- Isolated privileged API with mandatory audit.
- Transparency notification for privileged reads.
- Rate limiting, anti-spam rules, anomaly detection.
