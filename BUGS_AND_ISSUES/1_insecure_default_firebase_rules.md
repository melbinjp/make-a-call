# Bug: Insecure Default Firebase Rules

- **Severity**: CRITICAL
- **Reproduction**:
  1.  Examine the `firebase-rules.json` file in the root of the repository.
  2.  Observe the following rules:
      ```json
      {
        "rules": {
          ".read": true,
          ".write": true
        }
      }
      ```
- **Expected vs. Actual**:
  - **Expected**: The Firebase Realtime Database rules should be restrictive, following the principle of least privilege. Anonymous users should only be able to read and write to specific, validated paths.
  - **Actual**: The rules are wide open, allowing any user on the internet to read, write, and delete any data in the entire database. This could lead to data theft, data corruption, and denial of service.
- **Root-Cause**: The default Firebase rules are configured for development and have not been secured for a production environment. The file `firebase-rules.json` contains these insecure rules.
- **Suggested Patch**:
  The `recommended-firebase-rules.json` file in the repository is a much better starting point. The maintainer should deploy these rules, or a modified version of them, to their Firebase project. The rules should be further refined to validate data being written (e.g., message length, user name format, etc.).

  A more robust version might look like this (this is a sketch and needs to be tested):

  ```json
  {
    "rules": {
      "channels": {
        "$channel": {
          // Anyone can read participant lists and non-sensitive data
          ".read": true,
          // Deeper validation for writes
          "participants": {
            "$userHash": {
              // A user can only write to their own participant object
              ".write": "!data.exists() || data.child('deviceHash').val() === $userHash",
              "name": {
                ".validate": "newData.isString() && newData.val().length < 50"
              },
              "inCall": { ".validate": "newData.isBoolean()" }
            }
          },
          "signals": {
            // Users can write signals, but not read them all back.
            // Signals should be small and are cleaned up by the client.
            "$signalId": {
              ".write": "newData.hasChildren(['type', 'payload', 'sender', 'timestamp'])",
              "payload": {
                ".validate": "newData.val().toString().length < 2000" // Prevent abuse
              }
            }
          }
        }
      }
    }
  }
  ```

- **Tests to Add**: It's not possible to write a client-side test for this. This must be verified in the Firebase console.
- **Confidence**: [HIGH]
