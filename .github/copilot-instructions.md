# Copilot Instructions

## Project Guidelines
- When user reports work is on the wrong feature, immediately revert recent unrelated edits and focus on the explicitly named screen/functionality (e.g., fields list edit action).
- When user says the fix targeted the wrong issue/file, prioritize undoing unrelated changes and directly fixing the specific behavior they reported.

## Logging Guidelines
- When adding debug/diagnostic logging in this project, always use `System.Diagnostics.Debug.WriteLine` (which appears in the Visual Studio Debug Output window), never `Console.WriteLine` or other console output methods.