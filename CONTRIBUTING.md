# Contributing to MyXen Token

Thank you for your interest in contributing to the MyXen Foundation! $MYXN is the core utility token of our 22-service ecosystem. We welcome contributions from the community to make our blockchain infrastructure more secure and efficient.

## How to Contribute

### 1. Reporting Bugs
This repository is for the **$MYXN Token** specifically. 
- If you find a bug in the smart contract or scripts, please open an Issue.
- If you find a **security vulnerability**, please refer to `SECURITY.md` immediately. Do NOT open a public issue.

### 2. Suggesting Enhancements
We manage our roadmap internally, but we welcome community suggestions via GitHub Issues using the "Enhancement" label.

### 3. Pull Requests
1.  **Fork** the repository.
2.  **Clone** your fork locally.
3.  Create a **new branch** for your feature or fix (`git checkout -b feature/amazing-feature`).
4.  **Commit** your changes with clear, descriptive messages.
5.  **Push** to your branch.
6.  Open a **Pull Request** to the `main` branch.

## Development Standards

- **Code Style:** We follow standard Rust formatting for Anchor programs. Please run `cargo fmt` before committing.
- **Testing:** All pull requests must include relevant unit tests. Run `anchor test` to ensure no regressions.
- **Documentation:** If you change code logic, you must update the comments and `README.md` accordingly.

## Governance
Major changes to the token logic (if upgradable) or supply management are subject to the **MyXen Governance DAO**. Code contributions may be merged but not deployed until a DAO vote is passed.
